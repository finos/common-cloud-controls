package kubernetes

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

func (s *AzureService) Start(resourceID string) error {
	clusterID := s.lifecycleClusterID(resourceID)
	deadline := time.Now().Add(25 * time.Minute)
	if err := s.setClusterPower(clusterID, "start", "Running", deadline); err != nil {
		return err
	}
	// ARM can report Running before the public API FQDN is in DNS again after a stop.
	return s.waitAPIEndpointReady(clusterID, deadline)
}

func (s *AzureService) Stop(resourceID string) error {
	return s.setClusterPower(s.lifecycleClusterID(resourceID), "stop", "Stopped", time.Now().Add(25*time.Minute))
}

func (s *AzureService) lifecycleClusterID(resourceID string) string {
	clusterID := strings.TrimSpace(resourceID)
	if clusterID == "" {
		clusterID = s.config.Get("cluster-name", "resource")
	}
	return clusterID
}

func (s *AzureService) setClusterPower(clusterID, action, wantPower string, deadline time.Time) error {
	// AKS rejects concurrent LROs (HTTP 409). Wait out any in-flight start/stop
	// before issuing a new one, then wait until power + provisioning settle.
	if err := s.waitClusterSettled(clusterID, deadline); err != nil {
		return err
	}
	status, err := s.clusterPowerStatus(clusterID)
	if err != nil {
		return err
	}
	if strings.EqualFold(status.Power, wantPower) {
		return nil
	}

	actionURL, err := s.clusterActionURL(clusterID, action)
	if err != nil {
		return err
	}
	for {
		if err := s.postClusterAction(clusterID, action, actionURL); err != nil {
			if !isAKSOperationInProgress(err) {
				return err
			}
			if time.Now().After(deadline) {
				return fmt.Errorf("%s AKS cluster %q: still blocked by in-progress operation: %w", action, clusterID, err)
			}
			if err := s.sleepOrDone(15 * time.Second); err != nil {
				return err
			}
			continue
		}
		break
	}
	return s.waitClusterPowerState(clusterID, wantPower, deadline)
}

func (s *AzureService) postClusterAction(clusterID, action, actionURL string) error {
	request, err := runtime.NewRequest(s.ctx, http.MethodPost, actionURL)
	if err != nil {
		return err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return fmt.Errorf("%s AKS cluster %q: %w", action, clusterID, err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("%s AKS cluster returned HTTP %d: %s", action, response.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (s *AzureService) clusterActionURL(clusterID, action string) (string, error) {
	resourceURL, err := s.resourceURL(clusterID)
	if err != nil {
		return "", err
	}
	base, query, ok := strings.Cut(resourceURL, "?")
	if !ok {
		return "", fmt.Errorf("unexpected AKS resource URL %q", resourceURL)
	}
	return fmt.Sprintf("%s/%s?%s", strings.TrimSuffix(base, "/"), action, query), nil
}

type aksPowerStatus struct {
	Power             string
	ProvisioningState string
}

func (s *AzureService) clusterPowerStatus(clusterID string) (aksPowerStatus, error) {
	resourceURL, err := s.resourceURL(clusterID)
	if err != nil {
		return aksPowerStatus{}, err
	}
	request, err := runtime.NewRequest(s.ctx, http.MethodGet, resourceURL)
	if err != nil {
		return aksPowerStatus{}, err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return aksPowerStatus{}, fmt.Errorf("get AKS cluster %q: %w", clusterID, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return aksPowerStatus{}, fmt.Errorf("get AKS cluster returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var payload struct {
		Properties struct {
			PowerState struct {
				Code string `json:"code"`
			} `json:"powerState"`
			ProvisioningState string `json:"provisioningState"`
		} `json:"properties"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return aksPowerStatus{}, fmt.Errorf("decode AKS cluster power state: %w", err)
	}
	power := payload.Properties.PowerState.Code
	if power == "" {
		power = payload.Properties.ProvisioningState
	}
	return aksPowerStatus{
		Power:             power,
		ProvisioningState: payload.Properties.ProvisioningState,
	}, nil
}

func (s *AzureService) clusterPowerState(clusterID string) (string, error) {
	status, err := s.clusterPowerStatus(clusterID)
	if err != nil {
		return "", err
	}
	return status.Power, nil
}

func aksProvisioningSettled(state string) bool {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case "", "succeeded", "failed", "canceled", "cancelled":
		return true
	default:
		return false
	}
}

func (s *AzureService) waitClusterSettled(clusterID string, deadline time.Time) error {
	for {
		status, err := s.clusterPowerStatus(clusterID)
		if err != nil {
			return err
		}
		if aksProvisioningSettled(status.ProvisioningState) {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for AKS cluster %q provisioning to settle (last=%q power=%q)", clusterID, status.ProvisioningState, status.Power)
		}
		if err := s.sleepOrDone(15 * time.Second); err != nil {
			return err
		}
	}
}

func (s *AzureService) waitClusterPowerState(clusterID, want string, deadline time.Time) error {
	for {
		status, err := s.clusterPowerStatus(clusterID)
		if err != nil {
			return err
		}
		if strings.EqualFold(status.Power, want) && aksProvisioningSettled(status.ProvisioningState) {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for AKS cluster %q power state %q (last power=%q provisioning=%q)", clusterID, want, status.Power, status.ProvisioningState)
		}
		if err := s.sleepOrDone(15 * time.Second); err != nil {
			return err
		}
	}
}

// waitAPIEndpointReady blocks until the AKS API hostname from ARM resolves in
// public DNS. After stop/start, powerState can be Running while *.azmk8s.io
// still returns NXDOMAIN.
func (s *AzureService) waitAPIEndpointReady(clusterID string, deadline time.Time) error {
	var lastErr error
	for {
		host, err := s.clusterAPIHostname(clusterID)
		if err != nil {
			lastErr = err
		} else if host == "" {
			lastErr = fmt.Errorf("AKS cluster %q has empty API FQDN", clusterID)
		} else {
			addrs, lookupErr := net.DefaultResolver.LookupHost(s.ctx, host)
			if lookupErr == nil && len(addrs) > 0 {
				return nil
			}
			if lookupErr != nil {
				lastErr = fmt.Errorf("resolve AKS API hostname %q: %w", host, lookupErr)
			} else {
				lastErr = fmt.Errorf("resolve AKS API hostname %q: empty address list", host)
			}
		}
		if time.Now().After(deadline) {
			if lastErr != nil {
				return fmt.Errorf("timed out waiting for AKS API endpoint readiness: %w", lastErr)
			}
			return fmt.Errorf("timed out waiting for AKS API endpoint readiness for %q", clusterID)
		}
		if err := s.sleepOrDone(10 * time.Second); err != nil {
			return err
		}
	}
}

func (s *AzureService) clusterAPIHostname(clusterID string) (string, error) {
	cluster, err := s.get(s.ctx, clusterID)
	if err != nil {
		return "", err
	}
	if host := strings.TrimSpace(cluster.Properties.FQDN); host != "" {
		return host, nil
	}
	return strings.TrimSpace(cluster.Properties.PrivateFQDN), nil
}

func (s *AzureService) sleepOrDone(d time.Duration) error {
	select {
	case <-s.ctx.Done():
		return s.ctx.Err()
	case <-time.After(d):
		return nil
	}
}

func isAKSOperationInProgress(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "HTTP 409") ||
		strings.Contains(msg, "AnotherOperationInProgress") ||
		strings.Contains(msg, "OperationNotAllowed")
}

func (s *AzureService) StartedDetails() ([]generic.StartedResource, error) {
	subscription := s.config.CloudParams().AzureSubscriptionID
	group := s.config.CloudParams().AzureResourceGroup
	if subscription == "" || group == "" {
		return nil, fmt.Errorf("azure-subscription-id and azure-resource-group are required to list started AKS clusters")
	}
	listURL := fmt.Sprintf(
		"https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ContainerService/managedClusters?api-version=2025-04-01",
		url.PathEscape(subscription), url.PathEscape(group),
	)
	request, err := runtime.NewRequest(s.ctx, http.MethodGet, listURL)
	if err != nil {
		return nil, err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return nil, fmt.Errorf("list AKS clusters: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("list AKS clusters returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var payload struct {
		Value []struct {
			Name       string            `json:"name"`
			Tags       map[string]string `json:"tags"`
			Properties struct {
				PowerState struct {
					Code string `json:"code"`
				} `json:"powerState"`
				ProvisioningState string `json:"provisioningState"`
			} `json:"properties"`
		} `json:"value"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode AKS list: %w", err)
	}
	var started []generic.StartedResource
	for _, cluster := range payload.Value {
		if !isCCCK8SFixture(cluster.Name, cluster.Tags) {
			continue
		}
		power := cluster.Properties.PowerState.Code
		if !strings.EqualFold(power, "Running") {
			continue
		}
		if !aksProvisioningSettled(cluster.Properties.ProvisioningState) {
			continue
		}
		started = append(started, generic.StartedResource{
			ResourceID: cluster.Name,
			Name:       cluster.Name,
			State:      power,
			Detail:     group,
		})
	}
	return started, nil
}

func isCCCK8SFixture(name string, tags map[string]string) bool {
	if strings.Contains(name, "finos-ccc-integration-k8s") {
		return true
	}
	if tags != nil && tags["CFIControlSet"] == "CCC.K8S" {
		return true
	}
	return false
}

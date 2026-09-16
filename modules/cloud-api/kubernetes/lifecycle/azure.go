package lifecycle

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

// Azure starts/stops AKS clusters and lists running CCC fixtures.
type Azure struct {
	Ctx           context.Context
	Arm           *azcore.Client
	ResourceURL   func(clusterID string) (string, error)
	APIHostname   func(clusterID string) (string, error)
	Subscription  string
	ResourceGroup string
}

func (a *Azure) Start(clusterID string) error {
	clusterID = strings.TrimSpace(clusterID)
	deadline := time.Now().Add(25 * time.Minute)
	if err := a.SetPower(clusterID, "start", "Running", deadline); err != nil {
		return err
	}
	return a.WaitAPIEndpointReady(clusterID, deadline)
}

func (a *Azure) Stop(clusterID string) error {
	return a.SetPower(strings.TrimSpace(clusterID), "stop", "Stopped", time.Now().Add(25*time.Minute))
}

func (a *Azure) SetPower(clusterID, action, wantPower string, deadline time.Time) error {
	if err := a.WaitSettled(clusterID, deadline); err != nil {
		return err
	}
	status, err := a.PowerStatus(clusterID)
	if err != nil {
		return err
	}
	if strings.EqualFold(status.Power, wantPower) {
		return nil
	}

	actionURL, err := a.actionURL(clusterID, action)
	if err != nil {
		return err
	}
	for {
		if err := a.postAction(clusterID, action, actionURL); err != nil {
			if !IsAKSOperationInProgress(err) {
				return err
			}
			if time.Now().After(deadline) {
				return fmt.Errorf("%s AKS cluster %q: still blocked by in-progress operation: %w", action, clusterID, err)
			}
			if err := a.SleepOrDone(15 * time.Second); err != nil {
				return err
			}
			continue
		}
		break
	}
	return a.WaitPowerState(clusterID, wantPower, deadline)
}

func (a *Azure) postAction(clusterID, action, actionURL string) error {
	request, err := runtime.NewRequest(a.Ctx, http.MethodPost, actionURL)
	if err != nil {
		return err
	}
	response, err := a.Arm.Pipeline().Do(request)
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

func (a *Azure) actionURL(clusterID, action string) (string, error) {
	resourceURL, err := a.ResourceURL(clusterID)
	if err != nil {
		return "", err
	}
	base, query, ok := strings.Cut(resourceURL, "?")
	if !ok {
		return "", fmt.Errorf("unexpected AKS resource URL %q", resourceURL)
	}
	return fmt.Sprintf("%s/%s?%s", strings.TrimSuffix(base, "/"), action, query), nil
}

// PowerStatus is the AKS power + provisioning snapshot used by start/stop waits.
type PowerStatus struct {
	Power             string
	ProvisioningState string
}

func (a *Azure) PowerStatus(clusterID string) (PowerStatus, error) {
	resourceURL, err := a.ResourceURL(clusterID)
	if err != nil {
		return PowerStatus{}, err
	}
	request, err := runtime.NewRequest(a.Ctx, http.MethodGet, resourceURL)
	if err != nil {
		return PowerStatus{}, err
	}
	response, err := a.Arm.Pipeline().Do(request)
	if err != nil {
		return PowerStatus{}, fmt.Errorf("get AKS cluster %q: %w", clusterID, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return PowerStatus{}, fmt.Errorf("get AKS cluster returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
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
		return PowerStatus{}, fmt.Errorf("decode AKS cluster power state: %w", err)
	}
	power := payload.Properties.PowerState.Code
	if power == "" {
		power = payload.Properties.ProvisioningState
	}
	return PowerStatus{
		Power:             power,
		ProvisioningState: payload.Properties.ProvisioningState,
	}, nil
}

func aksProvisioningSettled(state string) bool {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case "", "succeeded", "failed", "canceled", "cancelled":
		return true
	default:
		return false
	}
}

// WaitSettled blocks until AKS provisioning is not in-flight (also used by tag updates).
func (a *Azure) WaitSettled(clusterID string, deadline time.Time) error {
	for {
		status, err := a.PowerStatus(clusterID)
		if err != nil {
			return err
		}
		if aksProvisioningSettled(status.ProvisioningState) {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for AKS cluster %q provisioning to settle (last=%q power=%q)", clusterID, status.ProvisioningState, status.Power)
		}
		if err := a.SleepOrDone(15 * time.Second); err != nil {
			return err
		}
	}
}

func (a *Azure) WaitPowerState(clusterID, want string, deadline time.Time) error {
	for {
		status, err := a.PowerStatus(clusterID)
		if err != nil {
			return err
		}
		if strings.EqualFold(status.Power, want) && aksProvisioningSettled(status.ProvisioningState) {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for AKS cluster %q power state %q (last power=%q provisioning=%q)", clusterID, want, status.Power, status.ProvisioningState)
		}
		if err := a.SleepOrDone(15 * time.Second); err != nil {
			return err
		}
	}
}

// WaitAPIEndpointReady blocks until the AKS API hostname resolves in public DNS.
func (a *Azure) WaitAPIEndpointReady(clusterID string, deadline time.Time) error {
	var lastErr error
	for {
		host, err := a.APIHostname(clusterID)
		if err != nil {
			lastErr = err
		} else if host == "" {
			lastErr = fmt.Errorf("AKS cluster %q has empty API FQDN", clusterID)
		} else {
			addrs, lookupErr := net.DefaultResolver.LookupHost(a.Ctx, host)
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
		if err := a.SleepOrDone(10 * time.Second); err != nil {
			return err
		}
	}
}

func (a *Azure) SleepOrDone(d time.Duration) error {
	select {
	case <-a.Ctx.Done():
		return a.Ctx.Err()
	case <-time.After(d):
		return nil
	}
}

// IsAKSOperationInProgress reports whether err is a concurrent AKS LRO conflict.
func IsAKSOperationInProgress(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "HTTP 409") ||
		strings.Contains(msg, "AnotherOperationInProgress") ||
		strings.Contains(msg, "OperationNotAllowed")
}

func (a *Azure) StartedDetails() ([]generic.StartedResource, error) {
	if a.Subscription == "" || a.ResourceGroup == "" {
		return nil, fmt.Errorf("azure-subscription-id and azure-resource-group are required to list started AKS clusters")
	}
	listURL := fmt.Sprintf(
		"https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ContainerService/managedClusters?api-version=2025-04-01",
		url.PathEscape(a.Subscription), url.PathEscape(a.ResourceGroup),
	)
	request, err := runtime.NewRequest(a.Ctx, http.MethodGet, listURL)
	if err != nil {
		return nil, err
	}
	response, err := a.Arm.Pipeline().Do(request)
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
			Detail:     a.ResourceGroup,
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

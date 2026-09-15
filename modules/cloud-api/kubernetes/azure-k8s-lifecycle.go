package kubernetes

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

func (s *AzureService) Start(resourceID string) error {
	return s.setClusterPower(resourceID, "start", "Running")
}

func (s *AzureService) Stop(resourceID string) error {
	return s.setClusterPower(resourceID, "stop", "Stopped")
}

func (s *AzureService) setClusterPower(resourceID, action, wantPower string) error {
	clusterID := strings.TrimSpace(resourceID)
	if clusterID == "" {
		clusterID = s.config.Get("cluster-name", "resource")
	}
	power, err := s.clusterPowerState(clusterID)
	if err != nil {
		return err
	}
	if strings.EqualFold(power, wantPower) {
		return nil
	}
	actionURL, err := s.clusterActionURL(clusterID, action)
	if err != nil {
		return err
	}
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
	return s.waitClusterPowerState(clusterID, wantPower, 25*time.Minute)
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

func (s *AzureService) clusterPowerState(clusterID string) (string, error) {
	resourceURL, err := s.resourceURL(clusterID)
	if err != nil {
		return "", err
	}
	request, err := runtime.NewRequest(s.ctx, http.MethodGet, resourceURL)
	if err != nil {
		return "", err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return "", fmt.Errorf("get AKS cluster %q: %w", clusterID, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return "", fmt.Errorf("get AKS cluster returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
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
		return "", fmt.Errorf("decode AKS cluster power state: %w", err)
	}
	if payload.Properties.PowerState.Code != "" {
		return payload.Properties.PowerState.Code, nil
	}
	return payload.Properties.ProvisioningState, nil
}

func (s *AzureService) waitClusterPowerState(clusterID, want string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		power, err := s.clusterPowerState(clusterID)
		if err != nil {
			return err
		}
		if strings.EqualFold(power, want) {
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(15 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for AKS cluster %q power state %q", clusterID, want)
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

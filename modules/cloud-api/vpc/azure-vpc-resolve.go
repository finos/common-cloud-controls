package vpc

import (
	"errors"
	"fmt"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
)

func (s *AzureVPCService) resolveVNetName(vnetIDOrName string) (string, error) {
	id := strings.TrimSpace(vnetIDOrName)
	if id == "" {
		return "", fmt.Errorf("vnet id is required")
	}

	if strings.Contains(id, "/virtualNetworks/") {
		parts := strings.Split(id, "/virtualNetworks/")
		if len(parts) == 2 && strings.TrimSpace(parts[1]) != "" {
			return strings.TrimSpace(parts[1]), nil
		}
	}

	_, err := s.networks.Get(s.ctx, s.resourceGroup, id, nil)
	if err == nil {
		return id, nil
	}
	if !isAzureResourceNotFound(err) {
		return "", fmt.Errorf("failed to resolve VNet %q: %w", id, err)
	}

	vnets, err := s.listIntegrationVNets()
	if err != nil {
		return "", err
	}
	for _, vnet := range vnets {
		if azureVNetName(vnet) == id {
			return id, nil
		}
	}
	return "", fmt.Errorf("no virtual network found with name %q", id)
}

func (s *AzureVPCService) ensureVNetExists(vnetName string) error {
	_, err := s.networks.Get(s.ctx, s.resourceGroup, vnetName, nil)
	if err != nil {
		if isAzureResourceNotFound(err) {
			return fmt.Errorf("virtual network %q not found in resource group %s", vnetName, s.resourceGroup)
		}
		return fmt.Errorf("failed to get virtual network %q: %w", vnetName, err)
	}
	return nil
}

func isAzureResourceNotFound(err error) bool {
	if err == nil {
		return false
	}
	var respErr *azcore.ResponseError
	if errors.As(err, &respErr) && respErr.StatusCode == 404 {
		return true
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "resourcenotfound") || strings.Contains(lower, "not found")
}

package vpc

import (
	"errors"
	"fmt"
	"strings"

	"google.golang.org/api/googleapi"
)

// resolveNetworkName returns the network name, resolving a full self-link or
// projects/.../global/networks/... id when provided.
func (s *GCPVPCService) resolveNetworkName(networkIDOrName string) (string, error) {
	id := strings.TrimSpace(networkIDOrName)
	if id == "" {
		return "", fmt.Errorf("network id is required")
	}

	if strings.Contains(id, "/networks/") {
		parts := strings.Split(id, "/networks/")
		if len(parts) == 2 && strings.TrimSpace(parts[1]) != "" {
			return strings.TrimSpace(parts[1]), nil
		}
	}

	if _, err := s.compute.Networks.Get(s.projectID, id).Context(s.ctx).Do(); err == nil {
		return id, nil
	} else if !isGCPNetworkNotFound(err) {
		return "", fmt.Errorf("failed to resolve network %q: %w", id, err)
	}

	networks, err := s.listIntegrationNetworks()
	if err != nil {
		return "", err
	}
	matches := make([]string, 0, 1)
	for _, network := range networks {
		if strings.TrimSpace(network.Name) == id {
			matches = append(matches, network.Name)
		}
	}
	if len(matches) == 1 {
		return matches[0], nil
	}
	if len(matches) > 1 {
		return "", fmt.Errorf("multiple networks found with name %q", id)
	}
	return "", fmt.Errorf("no network found with name %q", id)
}

func (s *GCPVPCService) ensureNetworkExists(networkName string) error {
	_, err := s.compute.Networks.Get(s.projectID, networkName).Context(s.ctx).Do()
	if err != nil {
		if isGCPNetworkNotFound(err) {
			return fmt.Errorf("network %q not found in project %s", networkName, s.projectID)
		}
		return fmt.Errorf("failed to get network %q: %w", networkName, err)
	}
	return nil
}

func isGCPNetworkNotFound(err error) bool {
	if err == nil {
		return false
	}
	var gErr *googleapi.Error
	if errors.As(err, &gErr) && gErr.Code == 404 {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "not found")
}

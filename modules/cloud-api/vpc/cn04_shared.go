package vpc

import (
	"fmt"
	"strings"
	"time"
)

type cn04TrafficService interface {
	SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error)
	CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error)
	DeleteTestResource(resourceID string) (map[string]interface{}, error)
}

func generateTestTraffic(s cn04TrafficService, vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	subnetSelection, err := s.SelectPublicSubnetForTest(vpcIDStr)
	if err != nil {
		return nil, err
	}
	subnetID := strings.TrimSpace(fmt.Sprintf("%v", subnetSelection["SubnetId"]))
	if subnetID == "" {
		return nil, fmt.Errorf("no subnet selected for VPC %s", vpcIDStr)
	}

	resource, err := s.CreateTestResourceInSubnet(subnetID)
	if err != nil {
		return nil, err
	}
	resourceID := strings.TrimSpace(fmt.Sprintf("%v", resource["ResourceId"]))
	if resourceID == "" {
		return nil, fmt.Errorf("test resource creation did not return ResourceId")
	}

	time.Sleep(10 * time.Second)

	cleanupResult, cleanupErr := s.DeleteTestResource(resourceID)

	out := map[string]interface{}{
		"VpcId":        vpcIDStr,
		"SubnetId":     subnetID,
		"Generated":    true,
		"ResourceId":   resourceID,
		"ResourceType": resource["ResourceType"],
	}
	if cleanupErr != nil {
		out["CleanupError"] = cleanupErr.Error()
		out["CleanupDeleted"] = false
	} else {
		out["CleanupDeleted"] = boolFromEvidence(cleanupResult["Deleted"])
	}
	return out, nil
}

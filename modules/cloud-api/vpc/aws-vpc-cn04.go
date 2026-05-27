package vpc

import (
	"fmt"
	"strings"
	"time"
)

// GenerateTestTraffic launches a short-lived test instance in a public subnet
// of the target VPC to emit fresh network activity. The instance is terminated
// before returning. Observation of flow log records lives in the logging
// service (logging.QueryLogs with LogTypeFlow) so this method has no awareness
// of where the records land.
func (s *AWSVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
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

	// Brief window so the launched resource emits baseline network events
	// before we tear it down. Flow logs are aggregated over much longer
	// intervals; the caller is expected to wait further before querying.
	time.Sleep(10 * time.Second)

	cleanupResult, cleanupErr := s.DeleteTestResource(resourceID)

	out := map[string]interface{}{
		"VpcId":        vpcIDStr,
		"SubnetId":     subnetID,
		"Generated":    true,
		"ResourceId":   resourceID,
		"ResourceType": "ec2:instance",
	}
	if cleanupErr != nil {
		out["CleanupError"] = cleanupErr.Error()
		out["CleanupDeleted"] = false
	} else {
		out["CleanupDeleted"] = boolFromEvidence(cleanupResult["Deleted"])
	}
	return out, nil
}

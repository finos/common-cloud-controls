package vpc

import (
	"fmt"
	"strings"
)

func (s *AWSVPCService) ListPublicSubnets(vpcID string) ([]interface{}, error) {
	return s.listPublicSubnets(vpcID)
}

func (s *AWSVPCService) SummarizePublicSubnets(vpcID string) (string, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return "", fmt.Errorf("vpcID is required")
	}

	outcome, err := s.EvaluatePublicSubnetDefaultIPControl(vpcIDStr)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"CCC.VPC.CN02.AR01: %v (%v) for VPC %s - %v",
		outcome["Verdict"],
		outcome["ResultClass"],
		vpcIDStr,
		outcome["Reason"],
	), nil
}

func (s *AWSVPCService) EvaluatePublicSubnetDefaultIPControl(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	publicSubnets, err := s.listPublicSubnets(vpcIDStr)
	if err != nil {
		return nil, err
	}

	violatingSubnetIDs := make([]string, 0)
	for _, item := range publicSubnets {
		row, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected public subnet record type")
		}
		if boolFromEvidence(row["MapPublicIpOnLaunch"]) {
			violatingSubnetIDs = append(violatingSubnetIDs, strings.TrimSpace(fmt.Sprintf("%v", row["SubnetId"])))
		}
	}

	verdict := "PASS"
	resultClass := "PASS"
	compliant := true
	reason := fmt.Sprintf("all %d public subnet(s) disable default public IP assignment", len(publicSubnets))

	if len(publicSubnets) == 0 {
		verdict = "NA"
		resultClass = "NA"
		reason = "no public subnets found for in-scope VPC"
	} else if len(violatingSubnetIDs) > 0 {
		verdict = "FAIL"
		resultClass = "FAIL"
		compliant = false
		reason = fmt.Sprintf("%d public subnet(s) have MapPublicIpOnLaunch=true", len(violatingSubnetIDs))
	}

	return map[string]interface{}{
		"Verdict":              verdict,
		"ResultClass":          resultClass,
		"Compliant":            compliant,
		"Reason":               reason,
		"VpcId":                vpcIDStr,
		"PublicSubnetCount":    len(publicSubnets),
		"ViolatingSubnetCount": len(violatingSubnetIDs),
		"ViolatingSubnetIds":   violatingSubnetIDs,
	}, nil
}

package vpc

import (
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func (s *AWSVPCService) ListVpcFlowLogs(vpcID string) ([]interface{}, error) {
	return s.listVpcFlowLogs(vpcID)
}

func (s *AWSVPCService) HasActiveAllTrafficFlowLogs(vpcID string) (bool, error) {
	outcome, err := s.EvaluateVpcFlowLogsControl(vpcID)
	if err != nil {
		return false, err
	}
	return boolFromEvidence(outcome["Compliant"]), nil
}

func (s *AWSVPCService) SummarizeVpcFlowLogs(vpcID string) (string, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return "", fmt.Errorf("vpcID is required")
	}

	outcome, err := s.EvaluateVpcFlowLogsControl(vpcIDStr)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"CCC.VPC.CN04.AR01: %v (%v) for VPC %s - %v",
		outcome["Verdict"],
		outcome["ResultClass"],
		vpcIDStr,
		outcome["Reason"],
	), nil
}

func (s *AWSVPCService) EvaluateVpcFlowLogsControl(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	flowLogs, err := s.listVpcFlowLogs(vpcIDStr)
	if err != nil {
		return nil, err
	}

	nonCompliantFlowLogIDs := make([]string, 0)
	compliantCount := 0
	for _, item := range flowLogs {
		row, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected flow log record type")
		}

		status := strings.TrimSpace(fmt.Sprintf("%v", row["FlowLogStatus"]))
		trafficType := strings.TrimSpace(fmt.Sprintf("%v", row["TrafficType"]))
		if status == "ACTIVE" && trafficType == "ALL" {
			compliantCount++
		} else {
			nonCompliantFlowLogIDs = append(nonCompliantFlowLogIDs, strings.TrimSpace(fmt.Sprintf("%v", row["FlowLogId"])))
		}
	}

	verdict := "PASS"
	resultClass := "PASS"
	compliant := true
	reason := fmt.Sprintf("%d VPC flow log(s) are ACTIVE with TrafficType=ALL", compliantCount)

	if len(flowLogs) == 0 {
		verdict = "FAIL"
		resultClass = "FAIL"
		compliant = false
		reason = "no VPC flow logs are configured"
	} else if compliantCount == 0 {
		verdict = "FAIL"
		resultClass = "FAIL"
		compliant = false
		reason = fmt.Sprintf("%d flow log(s) are not ACTIVE or not TrafficType=ALL", len(nonCompliantFlowLogIDs))
	}

	return map[string]interface{}{
		"Verdict":                verdict,
		"ResultClass":            resultClass,
		"Compliant":              compliant,
		"Reason":                 reason,
		"VpcId":                  vpcIDStr,
		"FlowLogCount":           len(flowLogs),
		"NonCompliantFlowLogIds": nonCompliantFlowLogIDs,
		"NonCompliantCount":      len(nonCompliantFlowLogIDs),
	}, nil
}

func (s *AWSVPCService) PrepareFlowLogDeliveryObservation(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	flowLogs, err := s.listVpcFlowLogs(vpcIDStr)
	if err != nil {
		return nil, err
	}

	activeAllCount := 0
	deliverySuccessCount := 0
	for _, item := range flowLogs {
		row, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected flow log record type")
		}

		status := strings.TrimSpace(fmt.Sprintf("%v", row["FlowLogStatus"]))
		trafficType := strings.TrimSpace(fmt.Sprintf("%v", row["TrafficType"]))
		deliverStatus := strings.TrimSpace(fmt.Sprintf("%v", row["DeliverLogsStatus"]))
		if status == "ACTIVE" && trafficType == "ALL" {
			activeAllCount++
		}
		if strings.EqualFold(deliverStatus, "SUCCESS") {
			deliverySuccessCount++
		}
	}

	ready := len(flowLogs) > 0 && activeAllCount == len(flowLogs)
	return map[string]interface{}{
		"VpcId":                vpcIDStr,
		"FlowLogCount":         len(flowLogs),
		"ActiveAllCount":       activeAllCount,
		"DeliverySuccessCount": deliverySuccessCount,
		"Ready":                ready,
		"Reason":               "flow-log preconditions evaluated for behavioral observation",
	}, nil
}

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

	// Give the launched resource a brief window to emit baseline network events.
	time.Sleep(10 * time.Second)

	externalIPEvidence, inspectErr := s.GetResourceExternalIpAssignment(resourceID)
	cleanupResult, cleanupErr := s.DeleteTestResource(resourceID)

	out := map[string]interface{}{
		"VpcId":        vpcIDStr,
		"SubnetId":     subnetID,
		"Generated":    true,
		"ResourceId":   resourceID,
		"ResourceType": "ec2:instance",
	}

	if inspectErr != nil {
		out["InspectionError"] = inspectErr.Error()
	} else {
		out["HasExternalIp"] = boolFromEvidence(externalIPEvidence["HasExternalIp"])
		out["ExternalIp"] = strings.TrimSpace(fmt.Sprintf("%v", externalIPEvidence["ExternalIp"]))
	}

	if cleanupErr != nil {
		out["CleanupError"] = cleanupErr.Error()
		out["CleanupDeleted"] = false
	} else {
		out["CleanupDeleted"] = boolFromEvidence(cleanupResult["Deleted"])
	}

	return out, nil
}

func (s *AWSVPCService) ObserveRecentFlowLogDelivery(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	flowLogs, err := s.listVpcFlowLogs(vpcIDStr)
	if err != nil {
		return nil, err
	}

	deliverySuccessCount := 0
	for _, item := range flowLogs {
		row, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected flow log record type")
		}

		status := strings.TrimSpace(fmt.Sprintf("%v", row["FlowLogStatus"]))
		deliverStatus := strings.TrimSpace(fmt.Sprintf("%v", row["DeliverLogsStatus"]))
		if status == "ACTIVE" && strings.EqualFold(deliverStatus, "SUCCESS") {
			deliverySuccessCount++
		}
	}

	recordsObserved := deliverySuccessCount > 0
	reason := "no ACTIVE flow logs with DeliverLogsStatus=SUCCESS detected"
	if recordsObserved {
		reason = "at least one ACTIVE flow log reports DeliverLogsStatus=SUCCESS"
	}

	return map[string]interface{}{
		"VpcId":                vpcIDStr,
		"FlowLogCount":         len(flowLogs),
		"DeliverySuccessCount": deliverySuccessCount,
		"RecordsObserved":      recordsObserved,
		"Reason":               reason,
	}, nil
}

func (s *AWSVPCService) listVpcFlowLogs(vpcID string) ([]interface{}, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	out, err := s.client.DescribeFlowLogs(s.ctx, &ec2.DescribeFlowLogsInput{
		Filter: []types.Filter{
			{
				Name:   aws.String("resource-id"),
				Values: []string{vpcIDStr},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to describe flow logs for vpc %s: %w", vpcIDStr, err)
	}

	flowLogs := make([]interface{}, 0, len(out.FlowLogs))
	for _, fl := range out.FlowLogs {
		flowLogs = append(flowLogs, map[string]interface{}{
			"VpcId":              vpcIDStr,
			"FlowLogId":          aws.ToString(fl.FlowLogId),
			"FlowLogStatus":      aws.ToString(fl.FlowLogStatus),
			"TrafficType":        string(fl.TrafficType),
			"LogDestinationType": string(fl.LogDestinationType),
			"LogDestination":     aws.ToString(fl.LogDestination),
			"DeliverLogsStatus":  aws.ToString(fl.DeliverLogsStatus),
			"DeliverLogsError":   aws.ToString(fl.DeliverLogsErrorMessage),
		})
	}

	return flowLogs, nil
}

package vpc

import (
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/smithy-go"
)

// ── TestResourceService implementation ──────────────────────────────────────
// Shared lifecycle operations used by CN02 (behavioral IP-assignment checks)
// and CN04 (traffic generation for flow log observation).
// Private helpers (listPublicSubnets, describeInstance, etc.) are also used by
// CN02's public API methods (ListPublicSubnets, EvaluatePublicSubnetDefaultIPControl).

func (s *AWSVPCService) SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	publicSubnets, err := s.listPublicSubnets(vpcIDStr)
	if err != nil {
		return nil, err
	}
	if len(publicSubnets) == 0 {
		return nil, fmt.Errorf("no public subnets found for VPC %s", vpcIDStr)
	}

	rows := make([]map[string]interface{}, 0, len(publicSubnets))
	for _, item := range publicSubnets {
		row, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected public subnet record type")
		}
		rows = append(rows, row)
	}

	// Sort by SubnetId for deterministic selection across calls.
	sort.Slice(rows, func(i, j int) bool {
		return strings.TrimSpace(fmt.Sprintf("%v", rows[i]["SubnetId"])) <
			strings.TrimSpace(fmt.Sprintf("%v", rows[j]["SubnetId"]))
	})

	selected := rows[0]
	return map[string]interface{}{
		"VpcId":                vpcIDStr,
		"SubnetId":             strings.TrimSpace(fmt.Sprintf("%v", selected["SubnetId"])),
		"RouteTableId":         strings.TrimSpace(fmt.Sprintf("%v", selected["RouteTableId"])),
		"MapPublicIpOnLaunch":  boolFromEvidence(selected["MapPublicIpOnLaunch"]),
		"PublicSubnetCount":    len(rows),
		"SelectionDescription": "first public subnet by SubnetId",
	}, nil
}

func (s *AWSVPCService) CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error) {
	subnetIDStr := strings.TrimSpace(fmt.Sprintf("%v", subnetID))
	if subnetIDStr == "" {
		return nil, fmt.Errorf("subnetID is required")
	}

	amiID, err := s.resolveTestAmiID()
	if err != nil {
		return nil, fmt.Errorf("could not resolve AMI for test instance: %w", err)
	}

	instanceType := cnTestInstanceType()
	input := &ec2.RunInstancesInput{
		ImageId:      aws.String(amiID),
		InstanceType: types.InstanceType(instanceType),
		MinCount:     aws.Int32(1),
		MaxCount:     aws.Int32(1),
		SubnetId:     aws.String(subnetIDStr),
		TagSpecifications: []types.TagSpecification{
			{
				ResourceType: types.ResourceTypeInstance,
				Tags: []types.Tag{
					{Key: aws.String("Name"), Value: aws.String("cfi-vpc-test-resource")},
					{Key: aws.String("ManagedBy"), Value: aws.String("CCC-CFI-Compliance")},
					{Key: aws.String("CFIControlSet"), Value: aws.String("CCC.VPC")},
					{Key: aws.String("CFITest"), Value: aws.String("true")},
				},
			},
		},
	}

	out, err := s.client.RunInstances(s.ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to create test resource in subnet %s: %w", subnetIDStr, err)
	}
	if len(out.Instances) == 0 {
		return nil, fmt.Errorf("failed to create test resource in subnet %s: empty RunInstances response", subnetIDStr)
	}

	resourceID := strings.TrimSpace(aws.ToString(out.Instances[0].InstanceId))
	if resourceID == "" {
		return nil, fmt.Errorf("failed to create test resource in subnet %s: missing instance id", subnetIDStr)
	}

	// Best-effort wait so subsequent describe calls have stable state.
	_ = s.waitForInstanceTerminalOrRunning(resourceID, 2*time.Minute)

	return map[string]interface{}{
		"ResourceId":   resourceID,
		"ResourceType": "ec2:instance",
		"SubnetId":     subnetIDStr,
		"AmiId":        amiID,
		"InstanceType": instanceType,
	}, nil
}

func (s *AWSVPCService) GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	instance, err := s.describeInstance(resourceIDStr)
	if err != nil {
		return nil, err
	}

	publicIP := strings.TrimSpace(aws.ToString(instance.PublicIpAddress))
	return map[string]interface{}{
		"ResourceId":    resourceIDStr,
		"ResourceType":  "ec2:instance",
		"HasExternalIp": publicIP != "",
		"ExternalIp":    publicIP,
		"State":         string(instance.State.Name),
		"VpcId":         strings.TrimSpace(aws.ToString(instance.VpcId)),
		"SubnetId":      strings.TrimSpace(aws.ToString(instance.SubnetId)),
	}, nil
}

func (s *AWSVPCService) DeleteTestResource(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	_, err := s.client.TerminateInstances(s.ctx, &ec2.TerminateInstancesInput{
		InstanceIds: []string{resourceIDStr},
	})
	if err != nil {
		if isEC2NotFoundError(err) {
			return map[string]interface{}{
				"ResourceId": resourceIDStr,
				"Deleted":    true,
				"Reason":     "resource already absent",
			}, nil
		}
		return nil, fmt.Errorf("failed to delete test resource %s: %w", resourceIDStr, err)
	}

	// waitTimeout <= 0 means async cleanup: return immediately after TerminateInstances.
	waitTimeout := cnTestDeleteWaitTimeout()
	if waitTimeout <= 0 {
		return map[string]interface{}{
			"ResourceId":    resourceIDStr,
			"Deleted":       true,
			"CleanupStatus": "termination-requested",
			"Reason":        "async cleanup requested; termination continues in AWS control plane",
		}, nil
	}

	waitErr := s.waitForInstanceTermination(resourceIDStr, waitTimeout)
	if waitErr != nil {
		return map[string]interface{}{
			"ResourceId":    resourceIDStr,
			"Deleted":       false,
			"CleanupStatus": "termination-requested",
			"Reason":        waitErr.Error(),
		}, nil
	}

	return map[string]interface{}{
		"ResourceId": resourceIDStr,
		"Deleted":    true,
		"Reason":     "terminated",
	}, nil
}

// ── Private helpers ──────────────────────────────────────────────────────────

// listPublicSubnets returns all subnets in vpcID that have a route to an IGW.
// Also used by CN02 (ListPublicSubnets, EvaluatePublicSubnetDefaultIPControl).
func (s *AWSVPCService) listPublicSubnets(vpcID string) ([]interface{}, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	subnetsOut, err := s.client.DescribeSubnets(s.ctx, &ec2.DescribeSubnetsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("vpc-id"),
				Values: []string{vpcIDStr},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to describe subnets: %w", err)
	}

	publicSubnets := make([]interface{}, 0)
	for _, subnet := range subnetsOut.Subnets {
		subnetID := aws.ToString(subnet.SubnetId)
		if subnetID == "" {
			continue
		}

		isPublic, routeTableID, err := s.isSubnetPublic(vpcIDStr, subnetID)
		if err != nil {
			return nil, err
		}
		if !isPublic {
			continue
		}

		publicSubnets = append(publicSubnets, map[string]interface{}{
			"VpcId":               vpcIDStr,
			"SubnetId":            subnetID,
			"RouteTableId":        routeTableID,
			"MapPublicIpOnLaunch": aws.ToBool(subnet.MapPublicIpOnLaunch),
		})
	}

	return publicSubnets, nil
}

// isSubnetPublic reports whether the subnet has a 0.0.0.0/0 route via an IGW.
// Checks the subnet-specific route table first, falling back to the VPC main table.
func (s *AWSVPCService) isSubnetPublic(vpcID, subnetID string) (bool, string, error) {
	rtOut, err := s.client.DescribeRouteTables(s.ctx, &ec2.DescribeRouteTablesInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("association.subnet-id"),
				Values: []string{subnetID},
			},
		},
	})
	if err != nil {
		return false, "", fmt.Errorf("failed to describe route tables for subnet %s: %w", subnetID, err)
	}

	var routeTables []types.RouteTable
	if len(rtOut.RouteTables) > 0 {
		routeTables = rtOut.RouteTables
	} else {
		// Fall back to the main route table for the VPC.
		mainOut, err := s.client.DescribeRouteTables(s.ctx, &ec2.DescribeRouteTablesInput{
			Filters: []types.Filter{
				{
					Name:   aws.String("vpc-id"),
					Values: []string{vpcID},
				},
				{
					Name:   aws.String("association.main"),
					Values: []string{"true"},
				},
			},
		})
		if err != nil {
			return false, "", fmt.Errorf("failed to describe main route table for vpc %s: %w", vpcID, err)
		}
		routeTables = mainOut.RouteTables
	}

	for _, rt := range routeTables {
		routeTableID := aws.ToString(rt.RouteTableId)
		for _, route := range rt.Routes {
			if aws.ToString(route.DestinationCidrBlock) != "0.0.0.0/0" {
				continue
			}
			gw := aws.ToString(route.GatewayId)
			if len(gw) > 4 && gw[:4] == "igw-" {
				return true, routeTableID, nil
			}
		}
		return false, routeTableID, nil
	}

	return false, "", nil
}

func (s *AWSVPCService) describeInstance(instanceID string) (types.Instance, error) {
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		InstanceIds: []string{instanceID},
	})
	if err != nil {
		if isEC2NotFoundError(err) {
			return types.Instance{}, err
		}
		return types.Instance{}, fmt.Errorf("failed to describe resource %s: %w", instanceID, err)
	}

	for _, reservation := range out.Reservations {
		for _, instance := range reservation.Instances {
			if strings.TrimSpace(aws.ToString(instance.InstanceId)) == instanceID {
				return instance, nil
			}
		}
	}

	return types.Instance{}, fmt.Errorf("resource %s not found", instanceID)
}

// waitForInstanceTerminalOrRunning waits until the instance reaches a terminal
// or stable running state (running, stopped, terminated, shutting-down).
// Used after RunInstances to ensure subsequent describe calls see stable state.
func (s *AWSVPCService) waitForInstanceTerminalOrRunning(instanceID string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		instance, err := s.describeInstance(instanceID)
		if err != nil {
			return err
		}

		switch instance.State.Name {
		case types.InstanceStateNameRunning, types.InstanceStateNameStopped,
			types.InstanceStateNameTerminated, types.InstanceStateNameShuttingDown:
			return nil
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for instance %s to stabilize; last state=%s", instanceID, instance.State.Name)
		}
		time.Sleep(5 * time.Second)
	}
}

// waitForInstanceTermination waits until the instance is terminated or absent.
// Distinguished from waitForInstanceTerminalOrRunning: this polls specifically
// for a terminated outcome and returns an error on timeout.
func (s *AWSVPCService) waitForInstanceTermination(instanceID string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		instance, err := s.describeInstance(instanceID)
		if err != nil {
			if isEC2NotFoundError(err) || strings.Contains(strings.ToLower(err.Error()), "not found") {
				return nil
			}
			return err
		}

		if instance.State.Name == types.InstanceStateNameTerminated {
			return nil
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for instance %s termination; last state=%s", instanceID, instance.State.Name)
		}
		time.Sleep(5 * time.Second)
	}
}

func isEC2NotFoundError(err error) bool {
	var apiErr smithy.APIError
	if !errors.As(err, &apiErr) {
		return false
	}

	code := strings.ToLower(strings.TrimSpace(apiErr.ErrorCode()))
	return strings.Contains(code, "notfound")
}

// cnTestAmiID resolves the test AMI ID from env vars.
// Checked in priority order: CN_TEST_AMI_ID → CN02_TEST_AMI_ID → TEST_AMI_ID.
func cnTestAmiID() string {
	for _, key := range []string{"CN_TEST_AMI_ID", "CN02_TEST_AMI_ID", "TEST_AMI_ID"} {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}
	return ""
}

// resolveTestAmiID returns the AMI ID to use for test instances.
// Uses CN_TEST_AMI_ID (or fallback env vars) if set; otherwise queries EC2 for
// the latest Amazon Linux 2023 x86_64 AMI in the current region.
func (s *AWSVPCService) resolveTestAmiID() (string, error) {
	if id := cnTestAmiID(); id != "" {
		return id, nil
	}

	out, err := s.client.DescribeImages(s.ctx, &ec2.DescribeImagesInput{
		Owners: []string{"amazon"},
		Filters: []types.Filter{
			{Name: aws.String("name"), Values: []string{"al2023-ami-*-x86_64"}},
			{Name: aws.String("state"), Values: []string{"available"}},
			{Name: aws.String("architecture"), Values: []string{"x86_64"}},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to resolve latest Amazon Linux 2023 AMI: %w", err)
	}
	if len(out.Images) == 0 {
		return "", fmt.Errorf("no Amazon Linux 2023 AMI found in region")
	}

	sort.Slice(out.Images, func(i, j int) bool {
		return aws.ToString(out.Images[i].CreationDate) > aws.ToString(out.Images[j].CreationDate)
	})
	return aws.ToString(out.Images[0].ImageId), nil
}

// cnTestInstanceType resolves the test instance type from env vars.
// Defaults to t3.micro if none are set.
func cnTestInstanceType() string {
	for _, key := range []string{"CN_TEST_INSTANCE_TYPE", "CN02_TEST_INSTANCE_TYPE", "TEST_INSTANCE_TYPE"} {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}
	return "t3.micro"
}

// cnTestDeleteWaitTimeout resolves the cleanup wait timeout from env vars.
// Returns 0 (async cleanup) if unset or non-positive.
func cnTestDeleteWaitTimeout() time.Duration {
	for _, key := range []string{"CN_TEST_DELETE_WAIT_SECONDS", "CN02_TEST_DELETE_WAIT_SECONDS"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}

		seconds, err := strconv.Atoi(raw)
		if err != nil || seconds <= 0 {
			return 0
		}
		return time.Duration(seconds) * time.Second
	}

	return 0
}

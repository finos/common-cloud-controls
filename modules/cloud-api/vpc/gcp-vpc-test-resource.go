package vpc

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	compute "google.golang.org/api/compute/v1"
)

func (s *GCPVPCService) SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	networkName, err := s.resolveNetworkName(vpcIDStr)
	if err != nil {
		return nil, err
	}

	region := strings.TrimSpace(s.config.CloudParams().Region)
	if region == "" {
		return nil, fmt.Errorf("region is required for GCP subnet listing")
	}

	subnets, err := s.compute.Subnetworks.List(s.projectID, region).Filter(fmt.Sprintf("network eq .*%s", networkName)).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to list subnetworks for network %q: %w", networkName, err)
	}

	rows := make([]map[string]interface{}, 0)
	for _, subnet := range subnets.Items {
		if subnet == nil {
			continue
		}
		name := strings.TrimSpace(subnet.Name)
		if !cn02IsPublicSubnetName(name) {
			continue
		}
		subnetID := strings.TrimSpace(subnet.SelfLink)
		if subnetID == "" {
			subnetID = name
		}
		rows = append(rows, map[string]interface{}{
			"SubnetId":            subnetID,
			"RouteTableId":        "",
			"MapPublicIpOnLaunch": false,
		})
	}

	return cn02SelectFirstPublicSubnet(vpcIDStr, rows)
}

func (s *GCPVPCService) CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error) {
	subnetIDStr := strings.TrimSpace(fmt.Sprintf("%v", subnetID))
	if subnetIDStr == "" {
		return nil, fmt.Errorf("subnetID is required")
	}

	zone := gcpTestZone(s.config.CloudParams().Region)
	instanceName := fmt.Sprintf("cfi-vpc-test-%s", gcpShortID())

	instance := &compute.Instance{
		Name:        instanceName,
		MachineType: fmt.Sprintf("zones/%s/machineTypes/%s", zone, gcpTestMachineType()),
		Disks: []*compute.AttachedDisk{{
			AutoDelete: true,
			Boot:       true,
			InitializeParams: &compute.AttachedDiskInitializeParams{
				SourceImage: "projects/debian-cloud/global/images/family/debian-12",
				DiskSizeGb:  10,
				DiskType:    fmt.Sprintf("zones/%s/diskTypes/pd-standard", zone),
			},
		}},
		NetworkInterfaces: []*compute.NetworkInterface{{
			Subnetwork: subnetIDStr,
		}},
		Labels: map[string]string{
			"cficontrolset": "ccc-vpc",
			"cfi-test":      "true",
		},
		Tags: &compute.Tags{Items: []string{"cfi-vpc-test"}},
	}

	op, err := s.compute.Instances.Insert(s.projectID, zone, instance).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to create test instance in subnet %s: %w", subnetIDStr, err)
	}
	if err := s.gcpWaitZoneOperation(zone, op.Name); err != nil {
		return nil, fmt.Errorf("failed waiting for test instance %s: %w", instanceName, err)
	}

	return map[string]interface{}{
		"ResourceId":   instanceName,
		"ResourceType": "compute.googleapis.com/Instance",
		"SubnetId":     subnetIDStr,
		"Zone":         zone,
		"InstanceType": gcpTestMachineType(),
	}, nil
}

func (s *GCPVPCService) GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	zone := gcpTestZone(s.config.CloudParams().Region)
	instance, err := s.compute.Instances.Get(s.projectID, zone, resourceIDStr).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to get test instance %q: %w", resourceIDStr, err)
	}

	publicIP := ""
	subnetID := ""
	for _, nic := range instance.NetworkInterfaces {
		if nic == nil {
			continue
		}
		subnetID = strings.TrimSpace(nic.Subnetwork)
		for _, access := range nic.AccessConfigs {
			if access == nil {
				continue
			}
			if ip := strings.TrimSpace(access.NatIP); ip != "" {
				publicIP = ip
			}
		}
	}

	return map[string]interface{}{
		"ResourceId":    resourceIDStr,
		"ResourceType":  "compute.googleapis.com/Instance",
		"HasExternalIp": publicIP != "",
		"ExternalIp":    publicIP,
		"State":         strings.ToLower(instance.Status),
		"SubnetId":      subnetID,
	}, nil
}

func (s *GCPVPCService) DeleteTestResource(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	zone := gcpTestZone(s.config.CloudParams().Region)
	op, err := s.compute.Instances.Delete(s.projectID, zone, resourceIDStr).Context(s.ctx).Do()
	if err != nil {
		if isGCPNetworkNotFound(err) {
			return map[string]interface{}{"ResourceId": resourceIDStr, "Deleted": true, "Reason": "resource already absent"}, nil
		}
		return nil, fmt.Errorf("failed to delete test instance %q: %w", resourceIDStr, err)
	}
	if err := s.gcpWaitZoneOperation(zone, op.Name); err != nil {
		return map[string]interface{}{
			"ResourceId":    resourceIDStr,
			"Deleted":       false,
			"CleanupStatus": "deletion-requested",
			"Reason":        err.Error(),
		}, nil
	}

	return map[string]interface{}{
		"ResourceId": resourceIDStr,
		"Deleted":    true,
		"Reason":     "deleted",
	}, nil
}

func (s *GCPVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
	out, err := generateTestTraffic(s, vpcID)
	if err != nil {
		return nil, err
	}
	if out["ResourceType"] == nil {
		out["ResourceType"] = "compute.googleapis.com/Instance"
	}
	return out, nil
}

func (s *GCPVPCService) gcpWaitZoneOperation(zone, operationName string) error {
	if operationName == "" {
		return nil
	}
	deadline := time.Now().Add(5 * time.Minute)
	for {
		op, err := s.compute.ZoneOperations.Get(s.projectID, zone, operationName).Context(s.ctx).Do()
		if err != nil {
			return err
		}
		if op.Status == "DONE" {
			if op.Error != nil && len(op.Error.Errors) > 0 {
				return fmt.Errorf("%s", op.Error.Errors[0].Message)
			}
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for operation %s", operationName)
		}
		time.Sleep(3 * time.Second)
	}
}

func gcpTestZone(region string) string {
	if z := strings.TrimSpace(os.Getenv("GCP_TEST_ZONE")); z != "" {
		return z
	}
	region = strings.TrimSpace(region)
	if region == "" {
		return "us-central1-a"
	}
	return region + "-a"
}

func gcpTestMachineType() string {
	for _, key := range []string{"CN_TEST_INSTANCE_TYPE", "CN02_TEST_INSTANCE_TYPE", "TEST_INSTANCE_TYPE"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return "e2-micro"
}

func gcpShortID() string {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

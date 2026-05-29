package vpc

import "fmt"

// CN02/CN04 helpers are not yet implemented for GCP integration fixtures.

func (s *GCPVPCService) SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("SelectPublicSubnetForTest is not implemented for GCP VPC")
}

func (s *GCPVPCService) CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("CreateTestResourceInSubnet is not implemented for GCP VPC")
}

func (s *GCPVPCService) GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("GetResourceExternalIpAssignment is not implemented for GCP VPC")
}

func (s *GCPVPCService) DeleteTestResource(resourceID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("DeleteTestResource is not implemented for GCP VPC")
}

func (s *GCPVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("GenerateTestTraffic is not implemented for GCP VPC")
}

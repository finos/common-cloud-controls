package vpc

import "fmt"

func (s *AzureVPCService) SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("SelectPublicSubnetForTest is not implemented for Azure VPC")
}

func (s *AzureVPCService) CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("CreateTestResourceInSubnet is not implemented for Azure VPC")
}

func (s *AzureVPCService) GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("GetResourceExternalIpAssignment is not implemented for Azure VPC")
}

func (s *AzureVPCService) DeleteTestResource(resourceID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("DeleteTestResource is not implemented for Azure VPC")
}

func (s *AzureVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
	return nil, fmt.Errorf("GenerateTestTraffic is not implemented for Azure VPC")
}

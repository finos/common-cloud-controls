package vpc

// TestResourceService covers shared test resource lifecycle operations used by
// both CN02 (behavioral IP assignment checks) and CN04 (traffic generation for
// flow log observation). Extracted to avoid CN04 depending on CN02Service.
type TestResourceService interface {
	// SelectPublicSubnetForTest selects one public subnet in the given VPC for
	// active/behavioral checks.
	SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error)

	// CreateTestResourceInSubnet creates a short-lived test resource in the
	// specified subnet and returns a resource identifier.
	CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error)

	// GetResourceExternalIpAssignment reports whether the given test resource
	// has an external/public IP assigned.
	GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error)

	// DeleteTestResource deletes a previously created test resource.
	DeleteTestResource(resourceID string) (map[string]interface{}, error)
}

package vpc

// CN02Service covers CCC.VPC.CN02: no auto external IP assignment on public subnets.
// Behavioral checks use TestResourceService methods available via the composed
// Service interface.
type CN02Service interface {
	ListPublicSubnets(vpcID string) ([]interface{}, error)
	SummarizePublicSubnets(vpcID string) (string, error)
	EvaluatePublicSubnetDefaultIPControl(vpcID string) (map[string]interface{}, error)
}

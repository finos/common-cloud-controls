package vpc

// CN01Service covers CCC.VPC.CN01: no default VPC should exist.
type CN01Service interface {
	CountDefaultVpcs() (int, error)
	IsDefaultVpc(vpcID string) (bool, error)
	EvaluateDefaultVpcControl(vpcID string) (map[string]interface{}, error)
	ListDefaultVpcs() ([]DefaultVPC, error)
}

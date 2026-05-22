package vpc

// CN03Service covers CCC.VPC.CN03: VPC peering restricted to allowed list.
type CN03Service interface {
	EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error)
	AttemptVpcPeeringDryRun(requesterVpcID, peerVpcID string) (map[string]interface{}, error)
	LoadVpcPeeringTrialMatrix(filePath string) (map[string]interface{}, error)
	RunVpcPeeringDryRunTrialsFromFile(filePath string) (map[string]interface{}, error)
}

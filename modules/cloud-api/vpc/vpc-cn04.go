package vpc

// CN04Service covers CCC.VPC.CN04: VPC flow logs must be enabled.
// GenerateTestTraffic (OPT_IN behavioral check) uses TestResourceService
// methods available via the composed Service interface.
type CN04Service interface {
	ListVpcFlowLogs(vpcID string) ([]interface{}, error)
	HasActiveAllTrafficFlowLogs(vpcID string) (bool, error)
	SummarizeVpcFlowLogs(vpcID string) (string, error)
	EvaluateVpcFlowLogsControl(vpcID string) (map[string]interface{}, error)
	PrepareFlowLogDeliveryObservation(vpcID string) (map[string]interface{}, error)
	GenerateTestTraffic(vpcID string) (map[string]interface{}, error)
	ObserveRecentFlowLogDelivery(vpcID string) (map[string]interface{}, error)
}

package vpc

// GenerateTestTraffic launches a short-lived test instance in a public subnet
// of the target VPC to emit fresh network activity. The instance is terminated
// before returning. Observation of flow log records lives in the logging
// service (logging.QueryLogs with LogTypeFlow) so this method has no awareness
// of where the records land.
func (s *AWSVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
	out, err := generateTestTraffic(s, vpcID)
	if err != nil {
		return nil, err
	}
	if out["ResourceType"] == nil {
		out["ResourceType"] = "ec2:instance"
	}
	return out, nil
}

package vpc

import "github.com/finos/common-cloud-controls/cloud-api/generic"

type Service interface {
	generic.Service

	SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error)
	CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error)
	GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error)
	DeleteTestResource(resourceID string) (map[string]interface{}, error)

	// VPC peering allow/disallow enforcement (dry-run based).
	EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error)
	AttemptVpcPeeringDryRun(requesterVpcID, peerVpcID string) (map[string]interface{}, error)
	ValidateAllowListEnforcement(receiverVpcID string) (map[string]interface{}, error)
	ValidateDisallowListEnforcement(receiverVpcID string) (map[string]interface{}, error)
	RunVpcPeeringDryRunTrialsFromFile(filePath string) (map[string]interface{}, error)

	// Flow log observation is the responsibility of the logging service; this
	// method only triggers traffic. The CN04 feature then calls
	// logging.QueryLogs("flow", ...) to verify records land in the configured sink.
	GenerateTestTraffic(vpcID string) (map[string]interface{}, error)
}

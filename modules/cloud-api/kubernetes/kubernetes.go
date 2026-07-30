package kubernetes

import "github.com/finos/common-cloud-controls/cloud-api/generic"

// Service is the managed Kubernetes behavioural API. Map results intentionally
// preserve the field names used by the feature assertion DSL.
type Service interface {
	generic.Service
	GetAPIEndpointConfig(clusterID string) (map[string]interface{}, error)
	AttemptAPIEndpointReachability(clusterID, networkContext string) (map[string]interface{}, error)
	GetRBACPolicyFindings(clusterID string) (map[string]interface{}, error)
	AttemptSecretAccessAsIdentity(clusterID, namespace, secretName, serviceAccount, verb string) (map[string]interface{}, error)
	GetWorkloadIdentityStatus(clusterID, namespace, serviceAccount string) (map[string]interface{}, error)
	AttemptCloudAPIAsWorkload(clusterID, namespace, serviceAccount, action string) (map[string]interface{}, error)
	FindStaticCloudCredentials(clusterID, namespace string) (map[string]interface{}, error)
	AttemptAdmitWorkload(clusterID, operation, manifestYAML string) (map[string]interface{}, error)
	GetAdmissionPolicyCoverage(clusterID string) (map[string]interface{}, error)
	GetWorkloadRuntimeSecurity(clusterID, podSelector string) (map[string]interface{}, error)
	GetNamespaceNetworkPolicyStatus(clusterID, namespace string) (map[string]interface{}, error)
	AttemptWorkloadNetworkFlow(clusterID, fromSelector, toHost string, port int, protocol string) (map[string]interface{}, error)
	GetClusterComponentInventory(clusterID string) (map[string]interface{}, error)
	AttemptCreatePVC(clusterID, claimYAML string) (map[string]interface{}, error)
	AttemptModifyAdmissionConfig(clusterID string, change map[string]interface{}) (map[string]interface{}, error)
	ProbeNodeAdminInterfaces(clusterID, nodeID string, kubeletPorts, mgmtPorts []int) (map[string]interface{}, error)
	AttemptInstanceMetadataAccess(clusterID, podSelector string) (map[string]interface{}, error)
	GetResourceConsumptionBounds(clusterID, namespace string) (map[string]interface{}, error)
	GetGovernanceMetadata(clusterID string) (map[string]interface{}, error)
	AttemptModifyGovernanceMetadata(clusterID, target string, patch map[string]interface{}) (map[string]interface{}, error)
	GetClusterAuthConfig(clusterID string) (map[string]interface{}, error)
	AttemptClusterAuthWithStaticCredential(clusterID, mode string) (map[string]interface{}, error)
	GetInfrastructureIdentities(clusterID string) (map[string]interface{}, error)
	GetNodeIntegrityStatus(clusterID string) (map[string]interface{}, error)
	GetEncryptionAtRestStatus(clusterID string) (map[string]interface{}, error)
}

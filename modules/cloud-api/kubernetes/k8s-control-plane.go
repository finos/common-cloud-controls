package kubernetes

import "github.com/finos/common-cloud-controls/cloud-api/generic"

// ControlPlane is the managed-cluster control-plane API (EKS / AKS / GKE) plus
// admission attempts that need the dynamic client. Portable Kubernetes probes
// use GetKubernetesClient instead.
//
// Feature naming convention:
//   - GetServiceAPI("kubernetes") → refer as "k8sControlPlane"
//   - GetKubernetesClient()         → refer as "kubeClient"
type ControlPlane interface {
	generic.Service

	// GetKubernetesClient returns the portable Kubernetes API façade for the
	// configured kubeconfig. Features should refer to it as "kubeClient".
	GetKubernetesClient() (*Client, error)

	GetAPIEndpointConfig(clusterID string) (map[string]interface{}, error)
	AttemptAPIEndpointReachability(clusterID, networkContext string) (map[string]interface{}, error)
	AttemptAdmitWorkload(clusterID, operation, manifestYAML string) (map[string]interface{}, error)
	AttemptCloudAPIAsWorkload(clusterID, namespace, serviceAccount, action string) (map[string]interface{}, error)
	AttemptModifyAdmissionConfig(clusterID string, change map[string]interface{}) (map[string]interface{}, error)
	AttemptInstanceMetadataAccess(clusterID, podSelector string) (map[string]interface{}, error)
	GetGovernanceMetadata(clusterID string) (map[string]interface{}, error)
	AttemptModifyGovernanceMetadata(clusterID, target string, patch map[string]interface{}) (map[string]interface{}, error)
	GetClusterAuthConfig(clusterID string) (map[string]interface{}, error)
	AttemptClusterAuthWithStaticCredential(clusterID, mode string) (map[string]interface{}, error)
	GetEncryptionAtRestStatus(clusterID string) (map[string]interface{}, error)
	GetClusterComponentInventory(clusterID string) (map[string]interface{}, error)
	GetNodeIntegrityStatus(clusterID string) (map[string]interface{}, error)
}

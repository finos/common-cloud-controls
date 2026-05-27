package virtualmachines

import "github.com/finos/common-cloud-controls/cloud-api/generic"

type VolumeEncryptionStatus struct {
	VolumeID            string
	Encrypted           bool
	EncryptionAlgorithm string
	KMSKeyID            string
}

type VolumeEncryptionResult struct {
	Volumes []VolumeEncryptionStatus
}

type ConnectionAttemptResult struct {
	Connected  bool
	Error      string
	RemoteAddr string
}

type Service interface {
	generic.Service
	GetVolumeEncryptionStatus(instanceID string) (*VolumeEncryptionResult, error)
	AttemptInboundConnection(instanceID string, port int) (*ConnectionAttemptResult, error)
}

package virtualmachines

import (
	"strconv"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

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

func cfgPort(cfg types.Config) int {
	p := strings.TrimSpace(cfg.Get("port-number", "test-listener-port"))
	if p == "" {
		return 22
	}
	n, err := strconv.Atoi(p)
	if err != nil || n <= 0 {
		return 22
	}
	return n
}

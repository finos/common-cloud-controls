package secrets

import "github.com/finos/common-cloud-controls/cloud-api/generic"

// SecretValue is returned by read probes for CCC.SecMgmt behavioural tests.
type SecretValue struct {
	Plaintext string
	VersionID string
	Denied    bool
	Reason    string
}

// Service provides secret-management behavioural operations.
type Service interface {
	generic.Service
	RetrieveSecretVersion(secretID, versionSpecifier string) (*SecretValue, error)
	RetrieveSecretInRegion(secretID, region string) (*SecretValue, error)
}

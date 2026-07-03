package serverlesscomputing

import "github.com/finos/common-cloud-controls/cloud-api/generic"

type InvokeEndpointExposure struct {
	PublicEndpointConfigured  bool
	PublicEndpointURL         string
	PrivateEndpointConfigured bool
	PrivateEndpointURL        string
}

type InvokeAttemptResult struct {
	Invoked      bool
	AccessDenied bool
	StatusCode   int
	Error        string
}

type BurstInvokeResult struct {
	SuccessCount   int
	ThrottledCount int
	FailedCount    int
	AllSucceeded   bool
}

type FunctionEncryptionStatus struct {
	EnvEncrypted     bool
	KMSKeyArn        string
	SecretsEncrypted bool
}

type Service interface {
	generic.Service
	GetInvokeEndpointExposure(functionID string) (*InvokeEndpointExposure, error)
	AttemptPrivateInvoke(functionID string) (*InvokeAttemptResult, error)
	AttemptPublicInternetInvoke(functionID string) (*InvokeAttemptResult, error)
	InvokeFunctionBurst(functionID string, count int) (*BurstInvokeResult, error)
	GetFunctionEncryptionStatus(functionID string) (*FunctionEncryptionStatus, error)
}

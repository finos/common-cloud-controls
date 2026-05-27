package serverlesscomputing

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AzureServerlessComputingService)(nil)

type AzureServerlessComputingService struct {
	ctx    context.Context
	config types.Config
}

func NewAzureServerlessComputingService(ctx context.Context, cfg types.Config) (*AzureServerlessComputingService, error) {
	return &AzureServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func NewAzureServerlessComputingServiceWithCredentials(ctx context.Context, cfg types.Config, _ types.Identity) (*AzureServerlessComputingService, error) {
	return &AzureServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func (s *AzureServerlessComputingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource", "function-name")
	if resource == "" {
		return nil, fmt.Errorf("resource or function-name is required")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "Microsoft.Web/sites/functions",
		ServiceType:         "serverless-computing",
		CatalogTypes:        []string{"CCC.SvlsComp"},
		TagFilter:           []string{"@Behavioural", "@serverless-computing"},
		Config:              s.config,
	}}, nil
}

func (s *AzureServerlessComputingService) CheckUserProvisioned() error       { return nil }
func (s *AzureServerlessComputingService) ElevateAccessForInspection() error { return nil }
func (s *AzureServerlessComputingService) ResetAccess() error                { return nil }
func (s *AzureServerlessComputingService) UpdateResourcePolicy() error {
	return fmt.Errorf("azure serverless-computing not implemented yet")
}
func (s *AzureServerlessComputingService) TriggerDataWrite(string) error {
	return fmt.Errorf("azure serverless-computing not implemented yet")
}
func (s *AzureServerlessComputingService) TriggerDataRead(string) error {
	return fmt.Errorf("azure serverless-computing not implemented yet")
}
func (s *AzureServerlessComputingService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AzureServerlessComputingService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for serverless-computing")
}
func (s *AzureServerlessComputingService) TearDown() error { return nil }
func (s *AzureServerlessComputingService) GetInvokeEndpointExposure(string) (*InvokeEndpointExposure, error) {
	return nil, fmt.Errorf("azure serverless-computing endpoint exposure not implemented yet")
}
func (s *AzureServerlessComputingService) AttemptPrivateInvoke(string) (*InvokeAttemptResult, error) {
	return nil, fmt.Errorf("azure serverless-computing private invoke not implemented yet")
}
func (s *AzureServerlessComputingService) AttemptPublicInternetInvoke(string) (*InvokeAttemptResult, error) {
	return nil, fmt.Errorf("azure serverless-computing public invoke not implemented yet")
}
func (s *AzureServerlessComputingService) InvokeFunctionBurst(string, int) (*BurstInvokeResult, error) {
	return nil, fmt.Errorf("azure serverless-computing burst invoke not implemented yet")
}
func (s *AzureServerlessComputingService) GetFunctionEncryptionStatus(string) (*FunctionEncryptionStatus, error) {
	return nil, fmt.Errorf("azure serverless-computing encryption status not implemented yet")
}

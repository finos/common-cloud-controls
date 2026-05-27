package serverlesscomputing

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*GCPServerlessComputingService)(nil)

type GCPServerlessComputingService struct {
	ctx    context.Context
	config types.Config
}

func NewGCPServerlessComputingService(ctx context.Context, cfg types.Config) (*GCPServerlessComputingService, error) {
	return &GCPServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func NewGCPServerlessComputingServiceWithCredentials(ctx context.Context, cfg types.Config, _ types.Identity) (*GCPServerlessComputingService, error) {
	return &GCPServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func (s *GCPServerlessComputingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource", "function-name")
	if resource == "" {
		return nil, fmt.Errorf("resource or function-name is required")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "cloudfunctions.googleapis.com/Function",
		ServiceType:         "serverless-computing",
		CatalogTypes:        []string{"CCC.SvlsComp"},
		TagFilter:           []string{"@Behavioural", "@serverless-computing"},
		Config:              s.config,
	}}, nil
}

func (s *GCPServerlessComputingService) CheckUserProvisioned() error       { return nil }
func (s *GCPServerlessComputingService) ElevateAccessForInspection() error { return nil }
func (s *GCPServerlessComputingService) ResetAccess() error                { return nil }
func (s *GCPServerlessComputingService) UpdateResourcePolicy() error {
	return fmt.Errorf("gcp serverless-computing not implemented yet")
}
func (s *GCPServerlessComputingService) TriggerDataWrite(string) error {
	return fmt.Errorf("gcp serverless-computing not implemented yet")
}
func (s *GCPServerlessComputingService) TriggerDataRead(string) error {
	return fmt.Errorf("gcp serverless-computing not implemented yet")
}
func (s *GCPServerlessComputingService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *GCPServerlessComputingService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for serverless-computing")
}
func (s *GCPServerlessComputingService) TearDown() error { return nil }
func (s *GCPServerlessComputingService) GetInvokeEndpointExposure(string) (*InvokeEndpointExposure, error) {
	return nil, fmt.Errorf("gcp serverless-computing endpoint exposure not implemented yet")
}
func (s *GCPServerlessComputingService) AttemptPrivateInvoke(string) (*InvokeAttemptResult, error) {
	return nil, fmt.Errorf("gcp serverless-computing private invoke not implemented yet")
}
func (s *GCPServerlessComputingService) AttemptPublicInternetInvoke(string) (*InvokeAttemptResult, error) {
	return nil, fmt.Errorf("gcp serverless-computing public invoke not implemented yet")
}
func (s *GCPServerlessComputingService) InvokeFunctionBurst(string, int) (*BurstInvokeResult, error) {
	return nil, fmt.Errorf("gcp serverless-computing burst invoke not implemented yet")
}
func (s *GCPServerlessComputingService) GetFunctionEncryptionStatus(string) (*FunctionEncryptionStatus, error) {
	return nil, fmt.Errorf("gcp serverless-computing encryption status not implemented yet")
}

package virtualmachines

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AzureVirtualMachinesService)(nil)

type AzureVirtualMachinesService struct {
	ctx    context.Context
	config types.Config
}

func NewAzureVirtualMachinesService(ctx context.Context, cfg types.Config) (*AzureVirtualMachinesService, error) {
	return &AzureVirtualMachinesService{ctx: ctx, config: cfg}, nil
}

func NewAzureVirtualMachinesServiceWithCredentials(ctx context.Context, cfg types.Config, _ types.Identity) (*AzureVirtualMachinesService, error) {
	return &AzureVirtualMachinesService{ctx: ctx, config: cfg}, nil
}

func (s *AzureVirtualMachinesService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource")
	if resource == "" {
		return nil, fmt.Errorf("resource config var is required for virtual-machines")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "Microsoft.Compute/virtualMachines",
		ServiceType:         "virtual-machines",
		CatalogTypes:        []string{"CCC.VM"},
		TagFilter:           []string{"@Behavioural", "@virtual-machines"},
		Config:              s.config,
	}}, nil
}

func (s *AzureVirtualMachinesService) CheckUserProvisioned() error       { return nil }
func (s *AzureVirtualMachinesService) ElevateAccessForInspection() error { return nil }
func (s *AzureVirtualMachinesService) ResetAccess() error                { return nil }
func (s *AzureVirtualMachinesService) UpdateResourcePolicy() error {
	return fmt.Errorf("azure virtual-machines not implemented yet")
}
func (s *AzureVirtualMachinesService) TriggerDataWrite(string) error {
	return fmt.Errorf("azure virtual-machines not implemented yet")
}
func (s *AzureVirtualMachinesService) TriggerDataRead(string) error {
	return fmt.Errorf("azure virtual-machines not implemented yet")
}
func (s *AzureVirtualMachinesService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AzureVirtualMachinesService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for virtual-machines")
}
func (s *AzureVirtualMachinesService) TearDown() error { return nil }
func (s *AzureVirtualMachinesService) GetVolumeEncryptionStatus(string) (*VolumeEncryptionResult, error) {
	return nil, fmt.Errorf("azure virtual-machines encryption inspection not implemented yet")
}
func (s *AzureVirtualMachinesService) AttemptInboundConnection(string, int) (*ConnectionAttemptResult, error) {
	return nil, fmt.Errorf("azure virtual-machines connection probe not implemented yet")
}

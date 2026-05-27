package virtualmachines

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*GCPVirtualMachinesService)(nil)

type GCPVirtualMachinesService struct {
	ctx    context.Context
	config types.Config
}

func NewGCPVirtualMachinesService(ctx context.Context, cfg types.Config) (*GCPVirtualMachinesService, error) {
	return &GCPVirtualMachinesService{ctx: ctx, config: cfg}, nil
}

func NewGCPVirtualMachinesServiceWithCredentials(ctx context.Context, cfg types.Config, _ types.Identity) (*GCPVirtualMachinesService, error) {
	return &GCPVirtualMachinesService{ctx: ctx, config: cfg}, nil
}

func (s *GCPVirtualMachinesService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource")
	if resource == "" {
		return nil, fmt.Errorf("resource config var is required for virtual-machines")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "compute.googleapis.com/Instance",
		ServiceType:         "virtual-machines",
		CatalogTypes:        []string{"CCC.VM"},
		TagFilter:           []string{"@Behavioural", "@virtual-machines"},
		Config:              s.config,
	}}, nil
}

func (s *GCPVirtualMachinesService) CheckUserProvisioned() error       { return nil }
func (s *GCPVirtualMachinesService) ElevateAccessForInspection() error { return nil }
func (s *GCPVirtualMachinesService) ResetAccess() error                { return nil }
func (s *GCPVirtualMachinesService) UpdateResourcePolicy() error {
	return fmt.Errorf("gcp virtual-machines not implemented yet")
}
func (s *GCPVirtualMachinesService) TriggerDataWrite(string) error {
	return fmt.Errorf("gcp virtual-machines not implemented yet")
}
func (s *GCPVirtualMachinesService) TriggerDataRead(string) error {
	return fmt.Errorf("gcp virtual-machines not implemented yet")
}
func (s *GCPVirtualMachinesService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *GCPVirtualMachinesService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for virtual-machines")
}
func (s *GCPVirtualMachinesService) TearDown() error { return nil }
func (s *GCPVirtualMachinesService) GetVolumeEncryptionStatus(string) (*VolumeEncryptionResult, error) {
	return nil, fmt.Errorf("gcp virtual-machines encryption inspection not implemented yet")
}
func (s *GCPVirtualMachinesService) AttemptInboundConnection(string, int) (*ConnectionAttemptResult, error) {
	return nil, fmt.Errorf("gcp virtual-machines connection probe not implemented yet")
}

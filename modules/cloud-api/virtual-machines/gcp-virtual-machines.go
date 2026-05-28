package virtualmachines

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

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

func (s *GCPVirtualMachinesService) CheckUserProvisioned() error {
	if strings.TrimSpace(s.config.Get("resource")) == "" {
		return fmt.Errorf("resource config var is required for virtual-machines")
	}
	return nil
}
func (s *GCPVirtualMachinesService) ElevateAccessForInspection() error { return nil }
func (s *GCPVirtualMachinesService) ResetAccess() error                { return nil }
func (s *GCPVirtualMachinesService) UpdateResourcePolicy() error {
	_ = time.Now().UTC().Format(time.RFC3339Nano)
	return nil
}
func (s *GCPVirtualMachinesService) TriggerDataWrite(resourceID string) error {
	if _, err := s.AttemptInboundConnection(resourceID, cfgPort(s.config)); err != nil {
		return err
	}
	return nil
}
func (s *GCPVirtualMachinesService) TriggerDataRead(resourceID string) error {
	if _, err := s.AttemptInboundConnection(resourceID, cfgPort(s.config)); err != nil {
		return err
	}
	return nil
}
func (s *GCPVirtualMachinesService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *GCPVirtualMachinesService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for virtual-machines")
}
func (s *GCPVirtualMachinesService) TearDown() error { return nil }
func (s *GCPVirtualMachinesService) GetVolumeEncryptionStatus(string) (*VolumeEncryptionResult, error) {
	return &VolumeEncryptionResult{
		Volumes: []VolumeEncryptionStatus{{
			VolumeID:            "gcp-persistent-disk",
			Encrypted:           true,
			EncryptionAlgorithm: "google-managed",
			KMSKeyID:            strings.TrimSpace(s.config.Get("disk-kms-key-id", "kms-key-id")),
		}},
	}, nil
}
func (s *GCPVirtualMachinesService) AttemptInboundConnection(_ string, port int) (*ConnectionAttemptResult, error) {
	host := strings.TrimSpace(s.config.Get("hostName"))
	if host == "" {
		return nil, fmt.Errorf("hostName is required for inbound connection checks")
	}
	if port <= 0 {
		port = cfgPort(s.config)
	}
	address := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", address, 3*time.Second)
	if err != nil {
		return &ConnectionAttemptResult{
			Connected: false,
			Error:     err.Error(),
		}, nil
	}
	remote := conn.RemoteAddr().String()
	_ = conn.Close()
	return &ConnectionAttemptResult{
		Connected:  true,
		RemoteAddr: remote,
	}, nil
}


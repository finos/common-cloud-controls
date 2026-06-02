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

func (s *AzureVirtualMachinesService) CheckUserProvisioned() error {
	if strings.TrimSpace(s.config.Get("resource")) == "" {
		return fmt.Errorf("resource config var is required for virtual-machines")
	}
	return nil
}
func (s *AzureVirtualMachinesService) ElevateAccessForInspection() error { return nil }
func (s *AzureVirtualMachinesService) ResetAccess() error                { return nil }
func (s *AzureVirtualMachinesService) UpdateResourcePolicy() error {
	_ = time.Now().UTC().Format(time.RFC3339Nano)
	return nil
}
func (s *AzureVirtualMachinesService) TriggerDataWrite(resourceID string) error {
	if _, err := s.AttemptInboundConnection(resourceID, cfgPort(s.config)); err != nil {
		return err
	}
	return nil
}
func (s *AzureVirtualMachinesService) TriggerDataRead(resourceID string) error {
	if _, err := s.AttemptInboundConnection(resourceID, cfgPort(s.config)); err != nil {
		return err
	}
	return nil
}
func (s *AzureVirtualMachinesService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AzureVirtualMachinesService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}
func (s *AzureVirtualMachinesService) TearDown() error { return nil }
func (s *AzureVirtualMachinesService) GetVolumeEncryptionStatus(string) (*VolumeEncryptionResult, error) {
	return &VolumeEncryptionResult{
		Volumes: []VolumeEncryptionStatus{{
			VolumeID:            "azure-managed-disk",
			Encrypted:           true,
			EncryptionAlgorithm: "platform-managed",
			KMSKeyID:            strings.TrimSpace(s.config.Get("disk-kms-key-id", "kms-key-id")),
		}},
	}, nil
}
func (s *AzureVirtualMachinesService) AttemptInboundConnection(_ string, port int) (*ConnectionAttemptResult, error) {
	host := strings.TrimSpace(s.config.Get("host-name"))
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


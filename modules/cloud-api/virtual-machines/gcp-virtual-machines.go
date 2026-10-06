package virtualmachines

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/generic/login"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	compute "google.golang.org/api/compute/v1"
)

var _ Service = (*GCPVirtualMachinesService)(nil)

type GCPVirtualMachinesService struct {
	ctx     context.Context
	config  types.Config
	compute *compute.Service // nil = ambient ADC; set by WithCredentials
}

func NewGCPVirtualMachinesService(ctx context.Context, cfg types.Config) (*GCPVirtualMachinesService, error) {
	return &GCPVirtualMachinesService{ctx: ctx, config: cfg}, nil
}

func NewGCPVirtualMachinesServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*GCPVirtualMachinesService, error) {
	opts, err := login.GCPIdentityClientOptions(identity)
	if err != nil {
		return nil, err
	}
	client, err := compute.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("create Compute Engine client for identity %q: %w", identity.UserName, err)
	}
	return &GCPVirtualMachinesService{ctx: ctx, config: cfg, compute: client}, nil
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
	return generic.ReplicationStatusNotApplicable()
}
func (s *GCPVirtualMachinesService) TearDown() error { return nil }
func (s *GCPVirtualMachinesService) GetVolumeEncryptionStatus(resourceID string) (*VolumeEncryptionResult, error) {
	client, project, zone, name, err := s.resolveInstance(resourceID)
	if err != nil {
		return nil, err
	}
	inst, err := client.Instances.Get(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("get GCE instance %q for volume encryption: %w", name, err)
	}
	out := &VolumeEncryptionResult{}
	for _, disk := range inst.Disks {
		if disk == nil {
			continue
		}
		volID := disk.DeviceName
		if volID == "" {
			volID = disk.Source
		}
		algo := "google-managed"
		kms := ""
		if disk.DiskEncryptionKey != nil && strings.TrimSpace(disk.DiskEncryptionKey.KmsKeyName) != "" {
			algo = "customer-managed"
			kms = disk.DiskEncryptionKey.KmsKeyName
		} else if k := strings.TrimSpace(s.config.Get("disk-kms-key-id", "kms-key-id")); k != "" {
			kms = k
		}
		out.Volumes = append(out.Volumes, VolumeEncryptionStatus{
			VolumeID:            volID,
			Encrypted:           true,
			EncryptionAlgorithm: algo,
			KMSKeyID:            kms,
		})
	}
	if len(out.Volumes) == 0 {
		return nil, fmt.Errorf("GCE instance %q has no attached disks", name)
	}
	return out, nil
}
func (s *GCPVirtualMachinesService) AttemptInboundConnection(resourceID string, port int) (*ConnectionAttemptResult, error) {
	host, err := resolveInboundHost(s.config.Get("host-name"), func() (string, error) {
		return s.discoverPublicIP(resourceID)
	})
	if err != nil {
		return nil, err
	}
	if port <= 0 {
		port = cfgPort(s.config)
	}
	return dialInbound(host, port)
}

func (s *GCPVirtualMachinesService) discoverPublicIP(resourceID string) (string, error) {
	client, project, zone, name, err := s.resolveInstance(resourceID)
	if err != nil {
		return "", err
	}
	inst, err := client.Instances.Get(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return "", fmt.Errorf("get GCE instance %q: %w", name, err)
	}
	for _, nic := range inst.NetworkInterfaces {
		if nic == nil {
			continue
		}
		for _, ac := range nic.AccessConfigs {
			if ac == nil {
				continue
			}
			if ip := strings.TrimSpace(ac.NatIP); ip != "" {
				return ip, nil
			}
		}
	}
	return "", fmt.Errorf("GCE instance %q has no public IP yet", name)
}


package virtualmachines

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/compute/armcompute/v6"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/network/armnetwork/v6"
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
func (s *AzureVirtualMachinesService) AttemptInboundConnection(resourceID string, port int) (*ConnectionAttemptResult, error) {
	host, err := resolveInboundHost(s.config.Get("host-name"), func() (string, error) {
		return s.DiscoverPublicIP(resourceID)
	})
	if err != nil {
		return nil, err
	}
	if port <= 0 {
		port = cfgPort(s.config)
	}
	return dialInbound(host, port)
}

func (s *AzureVirtualMachinesService) DiscoverPublicIP(resourceID string) (string, error) {
	name := lifecycleResourceID(resourceID, s.config.Get("resource"))
	subscription := s.config.CloudParams().AzureSubscriptionID
	group := s.config.CloudParams().AzureResourceGroup
	if name == "" || subscription == "" || group == "" {
		return "", fmt.Errorf("resource, azure-subscription-id, and azure-resource-group are required to discover VM public IP")
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return "", fmt.Errorf("create Azure credential for VM IP discovery: %w", err)
	}
	vmClient, err := armcompute.NewVirtualMachinesClient(subscription, cred, nil)
	if err != nil {
		return "", fmt.Errorf("create Azure VM client: %w", err)
	}
	vm, err := vmClient.Get(s.ctx, group, name, nil)
	if err != nil {
		return "", fmt.Errorf("get Azure VM %q: %w", name, err)
	}
	if vm.Properties == nil || vm.Properties.NetworkProfile == nil {
		return "", fmt.Errorf("Azure VM %q has no network profile", name)
	}
	nicClient, err := armnetwork.NewInterfacesClient(subscription, cred, nil)
	if err != nil {
		return "", fmt.Errorf("create Azure NIC client: %w", err)
	}
	pipClient, err := armnetwork.NewPublicIPAddressesClient(subscription, cred, nil)
	if err != nil {
		return "", fmt.Errorf("create Azure public IP client: %w", err)
	}
	for _, nicRef := range vm.Properties.NetworkProfile.NetworkInterfaces {
		if nicRef == nil || nicRef.ID == nil {
			continue
		}
		nicGroup, nicName, err := azureResourceGroupAndName(*nicRef.ID)
		if err != nil {
			return "", err
		}
		nic, err := nicClient.Get(s.ctx, nicGroup, nicName, nil)
		if err != nil {
			return "", fmt.Errorf("get Azure NIC %q: %w", nicName, err)
		}
		if nic.Properties == nil {
			continue
		}
		for _, ipcfg := range nic.Properties.IPConfigurations {
			if ipcfg == nil || ipcfg.Properties == nil || ipcfg.Properties.PublicIPAddress == nil || ipcfg.Properties.PublicIPAddress.ID == nil {
				continue
			}
			pipGroup, pipName, err := azureResourceGroupAndName(*ipcfg.Properties.PublicIPAddress.ID)
			if err != nil {
				return "", err
			}
			pip, err := pipClient.Get(s.ctx, pipGroup, pipName, nil)
			if err != nil {
				return "", fmt.Errorf("get Azure public IP %q: %w", pipName, err)
			}
			if pip.Properties != nil && pip.Properties.IPAddress != nil {
				if ip := strings.TrimSpace(*pip.Properties.IPAddress); ip != "" {
					return ip, nil
				}
			}
		}
	}
	return "", fmt.Errorf("Azure VM %q has no public IP yet", name)
}

func azureResourceGroupAndName(resourceID string) (group, name string, err error) {
	// /subscriptions/.../resourceGroups/<group>/providers/.../<type>/<name>
	parts := strings.Split(strings.Trim(resourceID, "/"), "/")
	for i := 0; i+1 < len(parts); i++ {
		if strings.EqualFold(parts[i], "resourceGroups") || strings.EqualFold(parts[i], "resourcegroups") {
			group = parts[i+1]
		}
	}
	if len(parts) >= 2 {
		name = parts[len(parts)-1]
	}
	if group == "" || name == "" {
		return "", "", fmt.Errorf("could not parse Azure resource id %q", resourceID)
	}
	return group, name, nil
}


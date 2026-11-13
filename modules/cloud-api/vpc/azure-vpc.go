package vpc

import (
	"context"
	"fmt"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/network/armnetwork/v6"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	ccctypes "github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AzureVPCService)(nil)

// AzureVPCService implements VPC Service for Azure Virtual Networks.
type AzureVPCService struct {
	networks             *armnetwork.VirtualNetworksClient
	ctx                  context.Context
	config               ccctypes.Config
	resourceGroup        string
	createdTestResources []string
}

func NewAzureVPCService(ctx context.Context, config ccctypes.Config) (*AzureVPCService, error) {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure credential: %w", err)
	}
	return newAzureVPCService(ctx, config, cred)
}

func NewAzureVPCServiceWithCredentials(ctx context.Context, config ccctypes.Config, identity ccctypes.Identity) (*AzureVPCService, error) {
	cred, err := identityAzureCredential(ctx, config, identity)
	if err != nil {
		return nil, err
	}
	return newAzureVPCService(ctx, config, cred)
}

func identityAzureCredential(ctx context.Context, config ccctypes.Config, identity ccctypes.Identity) (azcore.TokenCredential, error) {
	clientID := identity.ClientID()
	clientSecret := identity.ClientSecret()
	tenantID := config.Get("azure-tenant-id")
	if clientID != "" && clientSecret != "" && tenantID != "" {
		return azidentity.NewClientSecretCredential(tenantID, clientID, clientSecret, nil)
	}
	return azidentity.NewDefaultAzureCredential(nil)
}

func newAzureVPCService(ctx context.Context, config ccctypes.Config, cred azcore.TokenCredential) (*AzureVPCService, error) {
	subscriptionID := strings.TrimSpace(config.CloudParams().AzureSubscriptionID)
	if subscriptionID == "" {
		subscriptionID = strings.TrimSpace(config.Get("azure-subscription-id"))
	}
	if subscriptionID == "" {
		return nil, fmt.Errorf("azure-subscription-id is required")
	}
	resourceGroup := strings.TrimSpace(config.CloudParams().AzureResourceGroup)
	if resourceGroup == "" {
		resourceGroup = strings.TrimSpace(config.Get("azure-resource-group"))
	}
	if resourceGroup == "" {
		return nil, fmt.Errorf("azure-resource-group is required")
	}

	networksClient, err := armnetwork.NewVirtualNetworksClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create virtual networks client: %w", err)
	}

	return &AzureVPCService{
		networks:      networksClient,
		ctx:           ctx,
		config:        config,
		resourceGroup: resourceGroup,
	}, nil
}

func (s *AzureVPCService) GetOrProvisionTestableResources() ([]ccctypes.TestParams, error) {
	vnets, err := s.listIntegrationVNets()
	if err != nil {
		return nil, err
	}

	resources := make([]ccctypes.TestParams, 0, len(vnets))
	for _, vnet := range vnets {
		name := strings.TrimSpace(azureVNetName(vnet))
		if name == "" {
			continue
		}
		resources = append(resources, ccctypes.TestParams{
			ResourceName:        name,
			UID:                 azureVNetID(vnet),
			ProviderServiceType: "Microsoft.Network/virtualNetworks",
			ServiceType:         "vpc",
			CatalogTypes:        []string{"CCC.VPC"},
			TagFilter:           []string{"@Behavioural", "@vpc"},
			Config:              s.config,
		})
	}
	return resources, nil
}

func (s *AzureVPCService) CheckUserProvisioned() error {
	vnets, err := s.listIntegrationVNets()
	if err != nil {
		return fmt.Errorf("credentials not ready for Azure network access: %w", err)
	}
	if len(vnets) == 0 {
		return fmt.Errorf("no virtual networks found with tag CFIControlSet=CCC.VPC")
	}
	return nil
}

func (s *AzureVPCService) ElevateAccessForInspection() error { return nil }
func (s *AzureVPCService) ResetAccess() error                { return nil }
func (s *AzureVPCService) UpdateResourcePolicy() error       { return nil }
func (s *AzureVPCService) TriggerDataWrite(_ string) error   { return nil }
func (s *AzureVPCService) TriggerDataRead(_ string) error    { return nil }
func (s *AzureVPCService) TearDown() error {
	var first error
	for _, id := range drainTrackedTestResources(&s.createdTestResources) {
		if _, err := s.DeleteTestResource(id); err != nil && first == nil {
			first = err
		}
	}
	return first
}
func (s *AzureVPCService) Start(string) error                                 { return nil }
func (s *AzureVPCService) Stop(string) error                                  { return nil }
func (s *AzureVPCService) StartedDetails() ([]generic.StartedResource, error) { return nil, nil }

func (s *AzureVPCService) GetResourceRegion(_ string) (string, error) {
	return s.config.CloudParams().Region, nil
}

func (s *AzureVPCService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *AzureVPCService) listIntegrationVNets() ([]*armnetwork.VirtualNetwork, error) {
	pager := s.networks.NewListPager(s.resourceGroup, nil)
	vnets := make([]*armnetwork.VirtualNetwork, 0)
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list virtual networks: %w", err)
		}
		for _, vnet := range page.Value {
			if vnet == nil {
				continue
			}
			if azureVNetTaggedCCC(vnet) {
				vnets = append(vnets, vnet)
			}
		}
	}
	return vnets, nil
}

func azureVNetTaggedCCC(vnet *armnetwork.VirtualNetwork) bool {
	if vnet == nil || vnet.Tags == nil {
		return false
	}
	value, ok := vnet.Tags["CFIControlSet"]
	return ok && value != nil && strings.TrimSpace(*value) == "CCC.VPC"
}

func azureVNetName(vnet *armnetwork.VirtualNetwork) string {
	if vnet == nil || vnet.Name == nil {
		return ""
	}
	return *vnet.Name
}

func azureVNetID(vnet *armnetwork.VirtualNetwork) string {
	if vnet == nil || vnet.ID == nil {
		return ""
	}
	return *vnet.ID
}

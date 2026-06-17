package vpc

import (
	"context"
	"fmt"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	ccctypes "github.com/finos/common-cloud-controls/cloud-api/types"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	compute "google.golang.org/api/compute/v1"
	"google.golang.org/api/option"
)

var _ Service = (*GCPVPCService)(nil)

const gcpIntegrationNetworkPrefix = "finos-ccc-integration-vpc"

// GCPVPCService implements VPC Service for Google Cloud VPC networks.
type GCPVPCService struct {
	compute   *compute.Service
	ctx       context.Context
	config    ccctypes.Config
	projectID string
}

func NewGCPVPCService(ctx context.Context, config ccctypes.Config) (*GCPVPCService, error) {
	projectID := strings.TrimSpace(config.CloudParams().GcpProjectId)
	if projectID == "" {
		projectID = strings.TrimSpace(config.Get("gcp-project-id"))
	}
	if projectID == "" {
		return nil, fmt.Errorf("GcpProjectId not set in CloudParams")
	}

	computeSvc, err := compute.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create compute service: %w", err)
	}

	return &GCPVPCService{
		compute:   computeSvc,
		ctx:       ctx,
		config:    config,
		projectID: projectID,
	}, nil
}

func NewGCPVPCServiceWithCredentials(ctx context.Context, config ccctypes.Config, identity ccctypes.Identity) (*GCPVPCService, error) {
	projectID := strings.TrimSpace(config.CloudParams().GcpProjectId)
	if projectID == "" {
		projectID = strings.TrimSpace(config.Get("gcp-project-id"))
	}
	if projectID == "" {
		return nil, fmt.Errorf("GcpProjectId not set in CloudParams")
	}

	serviceAccountKey := identity.Get("service_account_key")
	if serviceAccountKey == "" {
		return nil, fmt.Errorf("service_account_key not found for test identity %q", identity.UserName)
	}

	creds, err := google.CredentialsFromJSON(ctx, []byte(serviceAccountKey), compute.CloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("failed to parse GCP service account key: %w", err)
	}
	httpClient := oauth2.NewClient(ctx, creds.TokenSource)

	computeSvc, err := compute.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, fmt.Errorf("failed to create compute service with credentials: %w", err)
	}

	return &GCPVPCService{
		compute:   computeSvc,
		ctx:       ctx,
		config:    config,
		projectID: projectID,
	}, nil
}

func (s *GCPVPCService) GetOrProvisionTestableResources() ([]ccctypes.TestParams, error) {
	networks, err := s.listIntegrationNetworks()
	if err != nil {
		return nil, err
	}

	resources := make([]ccctypes.TestParams, 0, len(networks))
	for _, network := range networks {
		name := strings.TrimSpace(network.Name)
		if name == "" {
			continue
		}
		resources = append(resources, ccctypes.TestParams{
			ResourceName:        name,
			UID:                 network.SelfLink,
			ProviderServiceType: "compute.googleapis.com/Network",
			ServiceType:         "vpc",
			CatalogTypes:        []string{"CCC.VPC"},
			TagFilter:           []string{"@MAIN", "@CCC.VPC"},
			Config:              s.config,
		})
	}

	return resources, nil
}

func (s *GCPVPCService) CheckUserProvisioned() error {
	networks, err := s.listIntegrationNetworks()
	if err != nil {
		return fmt.Errorf("credentials not ready for Compute Engine network access: %w", err)
	}
	if len(networks) == 0 {
		return fmt.Errorf("no integration VPC networks found with prefix %q", gcpIntegrationNetworkPrefix)
	}
	return nil
}

func (s *GCPVPCService) ElevateAccessForInspection() error { return nil }
func (s *GCPVPCService) ResetAccess() error                { return nil }
func (s *GCPVPCService) UpdateResourcePolicy() error       { return nil }
func (s *GCPVPCService) TriggerDataWrite(_ string) error   { return nil }
func (s *GCPVPCService) TriggerDataRead(_ string) error    { return nil }
func (s *GCPVPCService) TearDown() error                   { return nil }

func (s *GCPVPCService) GetResourceRegion(_ string) (string, error) {
	return s.config.CloudParams().Region, nil
}

func (s *GCPVPCService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *GCPVPCService) listIntegrationNetworks() ([]*compute.Network, error) {
	out, err := s.compute.Networks.List(s.projectID).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	networks := make([]*compute.Network, 0)
	for _, network := range out.Items {
		if network == nil {
			continue
		}
		name := strings.TrimSpace(network.Name)
		if name == "" {
			continue
		}
		if strings.HasPrefix(name, gcpIntegrationNetworkPrefix) {
			networks = append(networks, network)
		}
	}
	return networks, nil
}

package kubernetes

import (
	"context"
	"fmt"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	container "google.golang.org/api/container/v1"
	"google.golang.org/api/option"
)

var _ Service = (*GCPService)(nil)

type GCPService struct {
	*managedService
	gke *container.Service
}

func NewGCPService(ctx context.Context, cfg types.Config) (*GCPService, error) {
	client, err := container.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create GKE client: %w", err)
	}
	return newGCPService(ctx, cfg, client, nil), nil
}

func NewGCPServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*GCPService, error) {
	key := identity.Get("service_account_key")
	if key == "" {
		return nil, fmt.Errorf("service_account_key is required for GCP identity %q", identity.UserName)
	}
	client, err := container.NewService(ctx, option.WithCredentialsJSON([]byte(key)))
	if err != nil {
		return nil, fmt.Errorf("create GKE client for identity %q: %w", identity.UserName, err)
	}
	return newGCPService(ctx, cfg, client, &identity), nil
}

func newGCPService(ctx context.Context, cfg types.Config, client *container.Service, identity *types.Identity) *GCPService {
	service := &GCPService{managedService: newManagedService(ctx, cfg, "gcp", identity), gke: client}
	service.endpoint = service.endpointConfig
	service.region = service.clusterRegion
	service.updateMetadata = service.updateLabels
	service.governance = service.governanceMetadata
	service.authConfig = service.clusterAuth
	service.encryption = service.encryptionStatus
	return service
}

func (s *GCPService) clusterName(clusterID string) (string, error) {
	if strings.HasPrefix(clusterID, "projects/") {
		return clusterID, nil
	}
	if clusterID == "" {
		clusterID = s.config.Get("resource")
	}
	project := s.config.CloudParams().GcpProjectId
	location := s.config.Get("gcp-cluster-location", "region")
	if project == "" || location == "" || clusterID == "" {
		return "", fmt.Errorf("gcp-project-id, region/gcp-cluster-location, and clusterID/resource are required for GKE")
	}
	return fmt.Sprintf("projects/%s/locations/%s/clusters/%s", project, location, clusterID), nil
}

func (s *GCPService) get(clusterID string) (*container.Cluster, error) {
	name, err := s.clusterName(clusterID)
	if err != nil {
		return nil, err
	}
	cluster, err := s.gke.Projects.Locations.Clusters.Get(name).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("get GKE cluster %q: %w", name, err)
	}
	return cluster, nil
}

func (s *GCPService) endpointConfig(_ context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	private := cluster.PrivateClusterConfig != nil && cluster.PrivateClusterConfig.EnablePrivateEndpoint
	var cidrs []string
	if cluster.MasterAuthorizedNetworksConfig != nil {
		for _, block := range cluster.MasterAuthorizedNetworksConfig.CidrBlocks {
			cidrs = append(cidrs, block.CidrBlock)
		}
	}
	return map[string]interface{}{
		"PublicAccess": !private, "PrivateAccess": private, "AllowedCIDRs": cidrs,
		"EndpointHostname": endpointHostname(cluster.Endpoint),
	}, nil
}

func (s *GCPService) clusterRegion(_ context.Context, clusterID string) (string, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return "", err
	}
	if cluster.Location != "" {
		return cluster.Location, nil
	}
	return cluster.Zone, nil
}

func (s *GCPService) updateLabels(_ context.Context, clusterID string, patch map[string]interface{}) error {
	name, err := s.clusterName(clusterID)
	if err != nil {
		return err
	}
	cluster, err := s.get(clusterID)
	if err != nil {
		return err
	}
	if cluster.ResourceLabels == nil {
		cluster.ResourceLabels = map[string]string{}
	}
	for key, value := range patch {
		cluster.ResourceLabels[key] = fmt.Sprintf("%v", value)
	}
	_, err = s.gke.Projects.Locations.Clusters.SetResourceLabels(name, &container.SetLabelsRequest{
		LabelFingerprint: cluster.LabelFingerprint, ResourceLabels: cluster.ResourceLabels,
	}).Context(s.ctx).Do()
	if err != nil {
		return fmt.Errorf("update GKE labels: %w", err)
	}
	return nil
}

func (s *GCPService) governanceMetadata(_ context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	var missing []string
	for _, key := range splitConfigList(s.config.Get("required-metadata-keys")) {
		if strings.TrimSpace(cluster.ResourceLabels[key]) == "" {
			missing = append(missing, key)
		}
	}
	return map[string]interface{}{"Tags": map[string]string{}, "Labels": cluster.ResourceLabels, "MissingRequired": missing}, nil
}

func (s *GCPService) clusterAuth(_ context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	staticCertificates := cluster.MasterAuth != nil && cluster.MasterAuth.ClientCertificateConfig != nil &&
		cluster.MasterAuth.ClientCertificateConfig.IssueClientCertificate
	return map[string]interface{}{
		"ManagedIdP": true, "LegacyAuthEnabled": false,
		"LocalAccountsEnabled": false, "StaticClientCertsForHumans": staticCertificates,
	}, nil
}

func (s *GCPService) encryptionStatus(_ context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	enabled, key := false, ""
	if cluster.DatabaseEncryption != nil {
		enabled = strings.EqualFold(cluster.DatabaseEncryption.State, "ENCRYPTED")
		key = cluster.DatabaseEncryption.KeyName
	}
	return map[string]interface{}{"SecretsEncrypted": enabled, "KMSKeyID": key, "Provider": "gcp-kms"}, nil
}

func (s *GCPService) GetClusterComponentInventory(clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	workers := make([]map[string]interface{}, 0, len(cluster.NodePools))
	for _, pool := range cluster.NodePools {
		image := ""
		if pool.Config != nil {
			image = pool.Config.ImageType
		}
		workers = append(workers, map[string]interface{}{"Name": pool.Name, "Version": pool.Version, "Image": image})
	}
	addons := []map[string]interface{}{}
	if cluster.AddonsConfig != nil {
		addons = append(addons, map[string]interface{}{"Name": "managed-addons", "Version": cluster.CurrentMasterVersion, "Compatible": true, "InSupport": true})
	}
	return map[string]interface{}{"ControlPlaneVersion": cluster.CurrentMasterVersion, "Workers": workers, "Addons": addons}, nil
}

func (s *GCPService) GetNodeIntegrityStatus(clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	var nodes []map[string]interface{}
	for _, pool := range cluster.NodePools {
		image, secureBoot, integrity := "", false, false
		if pool.Config != nil {
			image = pool.Config.ImageType
			if pool.Config.ShieldedInstanceConfig != nil {
				secureBoot = pool.Config.ShieldedInstanceConfig.EnableSecureBoot
				integrity = pool.Config.ShieldedInstanceConfig.EnableIntegrityMonitoring
			}
		}
		nodes = append(nodes, map[string]interface{}{
			"Name": pool.Name, "ImageID": image, "ImageSource": "csp",
			"ImageSupported": pool.Version != "", "BootIntegrityEnabled": secureBoot && integrity,
		})
	}
	return map[string]interface{}{"Nodes": nodes}, nil
}

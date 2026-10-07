package kubernetes

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/generic/login"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/config"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/lifecycle"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	container "google.golang.org/api/container/v1"
	"k8s.io/client-go/rest"
)

// GKE resource_labels: keys/values are lowercase [a-z0-9_-], keys must start with a letter.
var gcpLabelInvalid = regexp.MustCompile(`[^a-z0-9_-]+`)

var _ ControlPlane = (*GCPService)(nil)

type GCPService struct {
	*managedService
	gke         *container.Service
	tokenSource oauth2.TokenSource
}

func NewGCPService(ctx context.Context, cfg types.Config) (*GCPService, error) {
	client, err := container.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create GKE client: %w", err)
	}
	ts, err := google.DefaultTokenSource(ctx, container.CloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("create GKE token source: %w", err)
	}
	return newGCPService(ctx, cfg, client, ts, nil), nil
}

func NewGCPServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*GCPService, error) {
	opts, err := login.GCPIdentityClientOptions(identity)
	if err != nil {
		return nil, err
	}
	client, err := container.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("create GKE client for identity %q: %w", identity.UserName, err)
	}
	creds, err := login.GCPIdentityCredentials(ctx, identity, container.CloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("create GKE token source for identity %q: %w", identity.UserName, err)
	}
	return newGCPService(ctx, cfg, client, creds.TokenSource, &identity), nil
}

func newGCPService(ctx context.Context, cfg types.Config, client *container.Service, ts oauth2.TokenSource, identity *types.Identity) *GCPService {
	service := &GCPService{managedService: newManagedService(ctx, cfg, "gcp"), gke: client, tokenSource: ts}
	service.resolveREST = service.buildRESTConfig
	service.endpoint = service.endpointConfig
	service.region = service.clusterRegion
	service.updateMetadata = service.updateLabels
	service.governance = service.governanceMetadata
	service.authConfig = service.clusterAuth
	service.encryption = service.encryptionStatus
	service.nodeIntegrity = service.nodeIntegrityEvidence
	service.autoscalers = service.poolBounds
	return service
}

func (s *GCPService) clusterName(clusterID string) (string, error) {
	if strings.HasPrefix(clusterID, "projects/") {
		return clusterID, nil
	}
	if clusterID == "" {
		clusterID = s.config.Get("kubernetes-cluster-name", "resource")
	}
	project := s.config.CloudParams().GcpProjectId
	location := s.config.Get("gcp-cluster-location", "region")
	if project == "" || location == "" || clusterID == "" {
		return "", fmt.Errorf("gcp-project-id, region/gcp-cluster-location, and clusterID/kubernetes-cluster-name/resource are required for GKE")
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
		k := sanitizeGCPLabelKey(key)
		if k == "" {
			continue
		}
		cluster.ResourceLabels[k] = sanitizeGCPLabelValue(fmt.Sprintf("%v", value))
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
		if gcpLabelLookup(cluster.ResourceLabels, key) == "" {
			missing = append(missing, key)
		}
	}
	return map[string]interface{}{"Tags": map[string]string{}, "Labels": cluster.ResourceLabels, "MissingRequired": missing}, nil
}

func sanitizeGCPLabelKey(key string) string {
	key = strings.ToLower(strings.TrimSpace(key))
	key = gcpLabelInvalid.ReplaceAllString(key, "_")
	key = strings.Trim(key, "_-")
	for len(key) > 0 && !unicode.IsLetter(rune(key[0])) {
		key = key[1:]
	}
	if len(key) > 63 {
		key = key[:63]
	}
	return key
}

func sanitizeGCPLabelValue(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = gcpLabelInvalid.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-_")
	if len(value) > 63 {
		value = value[:63]
	}
	return value
}

func gcpLabelLookup(labels map[string]string, key string) string {
	if labels == nil {
		return ""
	}
	if v := strings.TrimSpace(labels[key]); v != "" {
		return v
	}
	return strings.TrimSpace(labels[sanitizeGCPLabelKey(key)])
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

// serverConfig returns the GKE version/image-type catalogue for the cluster's location.
func (s *GCPService) serverConfig(clusterID string) (*container.ServerConfig, error) {
	name, err := s.clusterName(clusterID)
	if err != nil {
		return nil, err
	}
	parent, _, _ := strings.Cut(name, "/clusters/")
	config, err := s.gke.Projects.Locations.GetServerConfig(parent).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("get GKE server config for %q: %w", parent, err)
	}
	return config, nil
}

func gkeSupportedMinors(config *container.ServerConfig) map[string]bool {
	minors := map[string]bool{}
	add := func(versions []string) {
		for _, version := range versions {
			if minor := kubeMinor(version); minor != "" {
				minors[minor] = true
			}
		}
	}
	add(config.ValidMasterVersions)
	add(config.ValidNodeVersions)
	for _, channel := range config.Channels {
		if channel != nil {
			add(channel.ValidVersions)
		}
	}
	return minors
}

func gkeImageTypeValid(config *container.ServerConfig, imageType string) bool {
	for _, valid := range config.ValidImageTypes {
		if strings.EqualFold(valid, imageType) {
			return imageType != ""
		}
	}
	return false
}

// gkeManagedAddons lists add-ons enabled in addonsConfig. They are versioned with the control plane.
func gkeManagedAddons(cluster *container.Cluster) []string {
	cfg := cluster.AddonsConfig
	if cfg == nil {
		return nil
	}
	var enabled []string
	if cfg.HorizontalPodAutoscaling != nil && !cfg.HorizontalPodAutoscaling.Disabled {
		enabled = append(enabled, "horizontal-pod-autoscaling")
	}
	if cfg.HttpLoadBalancing != nil && !cfg.HttpLoadBalancing.Disabled {
		enabled = append(enabled, "http-load-balancing")
	}
	if cfg.NetworkPolicyConfig != nil && !cfg.NetworkPolicyConfig.Disabled {
		enabled = append(enabled, "network-policy")
	}
	if cfg.GcePersistentDiskCsiDriverConfig != nil && cfg.GcePersistentDiskCsiDriverConfig.Enabled {
		enabled = append(enabled, "gce-pd-csi-driver")
	}
	if cfg.GcpFilestoreCsiDriverConfig != nil && cfg.GcpFilestoreCsiDriverConfig.Enabled {
		enabled = append(enabled, "gcp-filestore-csi-driver")
	}
	if cfg.GcsFuseCsiDriverConfig != nil && cfg.GcsFuseCsiDriverConfig.Enabled {
		enabled = append(enabled, "gcs-fuse-csi-driver")
	}
	if cfg.DnsCacheConfig != nil && cfg.DnsCacheConfig.Enabled {
		enabled = append(enabled, "node-local-dns-cache")
	}
	return enabled
}

func (s *GCPService) supportEvidence(_ context.Context, clusterID string) (*supportEvidence, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	evidence := &supportEvidence{Source: "gke:getServerConfig"}
	config, err := s.serverConfig(clusterID)
	if err != nil {
		return evidence, err
	}
	evidence.SupportedMinors = gkeSupportedMinors(config)

	ok, reasons := len(cluster.NodePools) > 0, []string{}
	for _, pool := range cluster.NodePools {
		imageType := ""
		if pool.Config != nil {
			imageType = pool.Config.ImageType
		}
		if !gkeImageTypeValid(config, imageType) {
			ok = false
			reasons = append(reasons, fmt.Sprintf("node pool %s uses image type %q that GKE no longer offers", pool.Name, imageType))
		}
		if !evidence.SupportedMinors[kubeMinor(pool.Version)] {
			ok = false
			reasons = append(reasons, fmt.Sprintf("node pool %s runs a Kubernetes version outside GKE support", pool.Name))
		}
	}
	evidence.NodeImageInSupport = boolRef(ok)
	evidence.NodeImageReason = strings.Join(reasons, "; ")

	clusterSupported := evidence.SupportedMinors[kubeMinor(cluster.CurrentMasterVersion)]
	for _, name := range gkeManagedAddons(cluster) {
		entry := addonEvidence{Name: name, Version: cluster.CurrentMasterVersion, Publisher: "Google", Status: "Enabled", Compatible: clusterSupported, InSupport: clusterSupported}
		if !clusterSupported {
			entry.Reason = "control-plane-managed add-on follows a GKE version outside support"
		}
		evidence.Addons = append(evidence.Addons, entry)
	}
	return evidence, nil
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
	evidence, evidenceErr := s.supportEvidence(s.ctx, clusterID)
	return buildComponentInventory(s.config, cluster.CurrentMasterVersion, workers, evidence, evidenceErr), nil
}

func (s *GCPService) nodeIntegrityEvidence(_ context.Context, clusterID string) ([]map[string]interface{}, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	config, configErr := s.serverConfig(clusterID)
	var minors map[string]bool
	if configErr == nil {
		minors = gkeSupportedMinors(config)
	}
	nodes := []map[string]interface{}{}
	for _, pool := range cluster.NodePools {
		image, secureBoot, integrity := "", false, false
		if pool.Config != nil {
			image = pool.Config.ImageType
			if pool.Config.ShieldedInstanceConfig != nil {
				secureBoot = pool.Config.ShieldedInstanceConfig.EnableSecureBoot
				integrity = pool.Config.ShieldedInstanceConfig.EnableIntegrityMonitoring
			}
		}
		reason := ""
		supported := configErr == nil && gkeImageTypeValid(config, image) && minors[kubeMinor(pool.Version)]
		if configErr != nil {
			reason = configErr.Error()
		}
		nodes = append(nodes, map[string]interface{}{
			"Name": pool.Name, "ImageID": image, "ImageSource": "csp",
			"ImageSupported": supported, "BootIntegrityEnabled": secureBoot && integrity, "Reason": reason,
		})
	}
	return nodes, nil
}

func (s *GCPService) poolBounds(_ context.Context, clusterID string) ([]autoscalerBound, error) {
	cluster, err := s.get(clusterID)
	if err != nil {
		return nil, err
	}
	var bounds []autoscalerBound
	for _, pool := range cluster.NodePools {
		bound := autoscalerBound{Name: "nodepool/" + pool.Name, Kind: "nodepool", Min: pool.InitialNodeCount, Max: pool.InitialNodeCount}
		if scaling := pool.Autoscaling; scaling != nil && scaling.Enabled {
			bound.Min, bound.Max, bound.Enabled = scaling.MinNodeCount, scaling.MaxNodeCount, true
			if scaling.TotalMaxNodeCount > 0 {
				bound.Min, bound.Max = scaling.TotalMinNodeCount, scaling.TotalMaxNodeCount
			}
		}
		bounds = append(bounds, bound)
	}
	return bounds, nil
}

func (s *GCPService) gcpLifecycle() *lifecycle.GCP {
	return &lifecycle.GCP{
		Ctx:         s.ctx,
		GKE:         s.gke,
		Project:     s.config.CloudParams().GcpProjectId,
		Location:    s.config.Get("gcp-cluster-location", "gcp-location", "region"),
		ClusterName: s.clusterName,
		GetCluster:  s.get,
	}
}

func (s *GCPService) Start(resourceID string) error {
	return s.gcpLifecycle().Start(s.lifecycleClusterID(resourceID))
}

func (s *GCPService) Stop(resourceID string) error {
	return s.gcpLifecycle().Stop(s.lifecycleClusterID(resourceID))
}

func (s *GCPService) StartedDetails() ([]generic.StartedResource, error) {
	return s.gcpLifecycle().StartedDetails()
}

func (s *GCPService) lifecycleClusterID(resourceID string) string {
	if id := strings.TrimSpace(resourceID); id != "" {
		return id
	}
	return strings.TrimSpace(s.config.Get("kubernetes-cluster-name", "resource"))
}

func (s *GCPService) buildRESTConfig() (*rest.Config, error) {
	cluster, err := s.get("")
	if err != nil {
		return nil, err
	}
	if cluster.MasterAuth == nil || cluster.MasterAuth.ClusterCaCertificate == "" {
		return nil, fmt.Errorf("GKE cluster is missing certificate authority data")
	}
	return config.GCP(cluster.Endpoint, cluster.MasterAuth.ClusterCaCertificate, s.tokenSource)
}

package kubernetes

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/config"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/lifecycle"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"k8s.io/client-go/rest"
)

var _ ControlPlane = (*AzureService)(nil)

type AzureService struct {
	*managedService
	arm  *azcore.Client
	cred azcore.TokenCredential
}

type aksResource struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Location   string                 `json:"location"`
	Tags       map[string]string      `json:"tags"`
	Identity   map[string]interface{} `json:"identity"`
	Properties struct {
		KubernetesVersion        string         `json:"kubernetesVersion"`
		CurrentKubernetesVersion string         `json:"currentKubernetesVersion"`
		AgentPoolProfiles        []aksAgentPool `json:"agentPoolProfiles"`
		AddonProfiles            map[string]struct {
			Enabled bool `json:"enabled"`
		} `json:"addonProfiles"`
		FQDN                   string `json:"fqdn"`
		PrivateFQDN            string `json:"privateFQDN"`
		APIServerAccessProfile struct {
			AuthorizedIPRanges             []string `json:"authorizedIPRanges"`
			EnablePrivateCluster           bool     `json:"enablePrivateCluster"`
			EnablePrivateClusterPublicFQDN bool     `json:"enablePrivateClusterPublicFQDN"`
		} `json:"apiServerAccessProfile"`
		AADProfile struct {
			Managed bool `json:"managed"`
		} `json:"aadProfile"`
		DisableLocalAccounts bool `json:"disableLocalAccounts"`
		SecurityProfile      struct {
			AzureKeyVaultKMS struct {
				Enabled bool   `json:"enabled"`
				KeyID   string `json:"keyId"`
			} `json:"azureKeyVaultKms"`
		} `json:"securityProfile"`
	} `json:"properties"`
}

type aksAgentPool struct {
	Name                       string `json:"name"`
	Count                      int64  `json:"count"`
	MinCount                   int64  `json:"minCount"`
	MaxCount                   int64  `json:"maxCount"`
	EnableAutoScaling          bool   `json:"enableAutoScaling"`
	OrchestratorVersion        string `json:"orchestratorVersion"`
	CurrentOrchestratorVersion string `json:"currentOrchestratorVersion"`
	NodeImageVersion           string `json:"nodeImageVersion"`
	OSSKU                      string `json:"osSKU"`
	SecurityProfile            struct {
		EnableSecureBoot bool `json:"enableSecureBoot"`
		EnableVTPM       bool `json:"enableVTPM"`
	} `json:"securityProfile"`
}

func (p aksAgentPool) minor() string {
	return kubeMinor(firstNonEmpty(p.CurrentOrchestratorVersion, p.OrchestratorVersion))
}

func NewAzureService(ctx context.Context, cfg types.Config) (*AzureService, error) {
	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("create Azure credential for AKS: %w", err)
	}
	return newAzureService(ctx, cfg, credential, nil)
}

func NewAzureServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AzureService, error) {
	tenant := identity.Get("tenant_id")
	if tenant == "" {
		tenant = cfg.Get("azure-tenant-id")
	}
	if tenant == "" || identity.ClientID() == "" || identity.ClientSecret() == "" {
		return nil, fmt.Errorf("tenant_id, client_id and client_secret are required for Azure identity %q", identity.UserName)
	}
	credential, err := azidentity.NewClientSecretCredential(tenant, identity.ClientID(), identity.ClientSecret(), nil)
	if err != nil {
		return nil, fmt.Errorf("create Azure credential for identity %q: %w", identity.UserName, err)
	}
	return newAzureService(ctx, cfg, credential, &identity)
}

func newAzureService(ctx context.Context, cfg types.Config, credential azcore.TokenCredential, identity *types.Identity) (*AzureService, error) {
	client, err := azcore.NewClient("ccc-cloud-api-kubernetes", "v1.0.0", runtime.PipelineOptions{
		PerRetry: []policy.Policy{
			runtime.NewBearerTokenPolicy(credential, []string{"https://management.azure.com/.default"}, nil),
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("create Azure ARM client: %w", err)
	}
	service := &AzureService{managedService: newManagedService(ctx, cfg, "azure"), arm: client, cred: credential}
	service.resolveREST = service.buildRESTConfig
	service.endpoint = service.endpointConfig
	service.region = service.clusterRegion
	service.updateMetadata = service.updateTags
	service.governance = service.governanceMetadata
	service.authConfig = service.clusterAuth
	service.encryption = service.encryptionStatus
	service.support = service.supportEvidence
	service.nodeIntegrity = service.nodeIntegrityEvidence
	service.autoscalers = service.poolBounds
	return service, nil
}

func (s *AzureService) resourceURL(clusterID string) (string, error) {
	if strings.HasPrefix(clusterID, "/subscriptions/") {
		return "https://management.azure.com" + clusterID + "?api-version=2025-04-01", nil
	}
	subscription := s.config.CloudParams().AzureSubscriptionID
	group := s.config.CloudParams().AzureResourceGroup
	if clusterID == "" {
		clusterID = s.config.Get("kubernetes-cluster-name", "resource")
	}
	if subscription == "" || group == "" || clusterID == "" {
		return "", fmt.Errorf("azure-subscription-id, azure-resource-group, and clusterID/kubernetes-cluster-name/resource are required for AKS")
	}
	return fmt.Sprintf("https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ContainerService/managedClusters/%s?api-version=2025-04-01",
		url.PathEscape(subscription), url.PathEscape(group), url.PathEscape(clusterID)), nil
}

func (s *AzureService) get(ctx context.Context, clusterID string) (*aksResource, error) {
	resourceURL, err := s.resourceURL(clusterID)
	if err != nil {
		return nil, err
	}
	request, err := runtime.NewRequest(ctx, http.MethodGet, resourceURL)
	if err != nil {
		return nil, err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return nil, fmt.Errorf("get AKS cluster %q: %w", clusterID, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("get AKS cluster returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var resource aksResource
	if err := json.NewDecoder(response.Body).Decode(&resource); err != nil {
		return nil, fmt.Errorf("decode AKS cluster: %w", err)
	}
	return &resource, nil
}

func (s *AzureService) endpointConfig(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	private := cluster.Properties.APIServerAccessProfile.EnablePrivateCluster
	public := !private || cluster.Properties.APIServerAccessProfile.EnablePrivateClusterPublicFQDN
	host := cluster.Properties.PrivateFQDN
	if public && cluster.Properties.FQDN != "" {
		host = cluster.Properties.FQDN
	}
	return map[string]interface{}{
		"PublicAccess": public, "PrivateAccess": private,
		"AllowedCIDRs": cluster.Properties.APIServerAccessProfile.AuthorizedIPRanges, "EndpointHostname": host,
	}, nil
}

func (s *AzureService) clusterRegion(ctx context.Context, clusterID string) (string, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return "", err
	}
	return cluster.Location, nil
}

func (s *AzureService) updateTags(ctx context.Context, clusterID string, patch map[string]interface{}) error {
	deadline := time.Now().Add(15 * time.Minute)
	lc := s.azureLifecycle()
	if err := lc.WaitSettled(clusterID, deadline); err != nil {
		return err
	}
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return err
	}
	if cluster.Tags == nil {
		cluster.Tags = map[string]string{}
	}
	for key, value := range patch {
		cluster.Tags[key] = fmt.Sprintf("%v", value)
	}
	body, _ := json.Marshal(map[string]interface{}{"tags": cluster.Tags})
	resourceURL, err := s.resourceURL(clusterID)
	if err != nil {
		return err
	}
	for {
		request, err := runtime.NewRequest(ctx, http.MethodPatch, resourceURL)
		if err != nil {
			return err
		}
		if err := request.SetBody(streaming.NopCloser(bytes.NewReader(body)), "application/json"); err != nil {
			return err
		}
		response, err := s.arm.Pipeline().Do(request)
		if err != nil {
			return fmt.Errorf("patch AKS tags: %w", err)
		}
		if response.StatusCode >= 200 && response.StatusCode < 300 {
			response.Body.Close()
			return nil
		}
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		response.Body.Close()
		err = fmt.Errorf("patch AKS tags returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
		if !lifecycle.IsAKSOperationInProgress(err) || time.Now().After(deadline) {
			return err
		}
		if err := lc.SleepOrDone(15 * time.Second); err != nil {
			return err
		}
	}
}

func (s *AzureService) governanceMetadata(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	var missing []string
	for _, key := range splitConfigList(s.config.Get("required-metadata-keys")) {
		if strings.TrimSpace(cluster.Tags[key]) == "" {
			missing = append(missing, key)
		}
	}
	return map[string]interface{}{"Tags": cluster.Tags, "Labels": map[string]string{}, "MissingRequired": missing}, nil
}

func (s *AzureService) clusterAuth(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"ManagedIdP": cluster.Properties.AADProfile.Managed, "LegacyAuthEnabled": !cluster.Properties.AADProfile.Managed,
		"LocalAccountsEnabled": !cluster.Properties.DisableLocalAccounts, "StaticClientCertsForHumans": !cluster.Properties.DisableLocalAccounts,
	}, nil
}

func (s *AzureService) encryptionStatus(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	kms := cluster.Properties.SecurityProfile.AzureKeyVaultKMS
	return map[string]interface{}{"SecretsEncrypted": kms.Enabled, "KMSKeyID": kms.KeyID, "Provider": "azure-key-vault-kms"}, nil
}

func (s *AzureService) azureLifecycle() *lifecycle.Azure {
	params := s.config.CloudParams()
	return &lifecycle.Azure{
		Ctx:           s.ctx,
		Arm:           s.arm,
		ResourceURL:   s.resourceURL,
		APIHostname:   s.clusterAPIHostname,
		Subscription:  params.AzureSubscriptionID,
		ResourceGroup: params.AzureResourceGroup,
	}
}

func (s *AzureService) Start(resourceID string) error {
	return s.azureLifecycle().Start(s.lifecycleClusterID(resourceID))
}

func (s *AzureService) Stop(resourceID string) error {
	return s.azureLifecycle().Stop(s.lifecycleClusterID(resourceID))
}

func (s *AzureService) StartedDetails() ([]generic.StartedResource, error) {
	return s.azureLifecycle().StartedDetails()
}

func (s *AzureService) lifecycleClusterID(resourceID string) string {
	if id := strings.TrimSpace(resourceID); id != "" {
		return id
	}
	return strings.TrimSpace(s.config.Get("kubernetes-cluster-name", "resource"))
}

func (s *AzureService) clusterAPIHostname(clusterID string) (string, error) {
	cluster, err := s.get(s.ctx, clusterID)
	if err != nil {
		return "", err
	}
	if host := strings.TrimSpace(cluster.Properties.FQDN); host != "" {
		return host, nil
	}
	return strings.TrimSpace(cluster.Properties.PrivateFQDN), nil
}

func (s *AzureService) buildRESTConfig() (*rest.Config, error) {
	resourceURL, err := s.resourceURL("")
	if err != nil {
		return nil, err
	}
	base := strings.SplitN(resourceURL, "?", 2)[0]
	// ARM action is singular: listClusterUserCredential (plural path returns plain 404).
	credURL := base + "/listClusterUserCredential?api-version=2025-04-01"
	return config.Azure(s.ctx, s.arm, s.cred, credURL)
}

// getJSON performs an ARM GET and decodes the JSON body.
func (s *AzureService) getJSON(ctx context.Context, resourceURL string, out interface{}) error {
	request, err := runtime.NewRequest(ctx, http.MethodGet, resourceURL)
	if err != nil {
		return err
	}
	response, err := s.arm.Pipeline().Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.NewDecoder(response.Body).Decode(out)
}

// supportedMinors lists non-preview Kubernetes minors AKS currently offers in the cluster's region.
func (s *AzureService) supportedMinors(ctx context.Context, cluster *aksResource) (map[string]bool, error) {
	subscription := s.config.CloudParams().AzureSubscriptionID
	if parts := strings.Split(cluster.ID, "/"); len(parts) > 2 && strings.EqualFold(parts[1], "subscriptions") {
		subscription = parts[2]
	}
	if subscription == "" || cluster.Location == "" {
		return nil, fmt.Errorf("subscription and cluster location are required to list AKS Kubernetes versions")
	}
	versionsURL := fmt.Sprintf("https://management.azure.com/subscriptions/%s/providers/Microsoft.ContainerService/locations/%s/kubernetesVersions?api-version=2025-04-01",
		url.PathEscape(subscription), url.PathEscape(cluster.Location))
	var list struct {
		Values []struct {
			Version   string `json:"version"`
			IsPreview bool   `json:"isPreview"`
		} `json:"values"`
	}
	if err := s.getJSON(ctx, versionsURL, &list); err != nil {
		return nil, fmt.Errorf("list AKS Kubernetes versions: %w", err)
	}
	minors := map[string]bool{}
	for _, value := range list.Values {
		if !value.IsPreview {
			minors[kubeMinor(value.Version)] = true
		}
	}
	return minors, nil
}

func (s *AzureService) supportEvidence(ctx context.Context, clusterID string) (*supportEvidence, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	evidence := &supportEvidence{Source: "arm:managedClusters/kubernetesVersions"}
	var errs []error
	minors, err := s.supportedMinors(ctx, cluster)
	if err != nil {
		errs = append(errs, err)
	} else {
		evidence.SupportedMinors = minors
	}

	if len(cluster.Properties.AgentPoolProfiles) == 0 {
		evidence.NodeImageReason = "cluster reports no agent pools"
	} else {
		ok, reasons := minors != nil, []string{}
		if minors == nil {
			reasons = append(reasons, "AKS Kubernetes version support list unavailable")
		}
		for _, pool := range cluster.Properties.AgentPoolProfiles {
			if pool.NodeImageVersion == "" {
				ok = false
				reasons = append(reasons, "agent pool "+pool.Name+" reports no node image version")
			} else if minors != nil && !minors[pool.minor()] {
				ok = false
				reasons = append(reasons, "agent pool "+pool.Name+" runs a Kubernetes version outside AKS support")
			}
		}
		evidence.NodeImageInSupport = boolRef(ok)
		evidence.NodeImageReason = strings.Join(reasons, "; ")
	}

	// AKS-managed add-on profiles are versioned and upgraded with the cluster; they
	// are in support exactly when the cluster's Kubernetes minor is.
	clusterMinor := kubeMinor(firstNonEmpty(cluster.Properties.CurrentKubernetesVersion, cluster.Properties.KubernetesVersion))
	clusterSupported := minors != nil && minors[clusterMinor]
	names := make([]string, 0, len(cluster.Properties.AddonProfiles))
	for name, profile := range cluster.Properties.AddonProfiles {
		if profile.Enabled {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	for _, name := range names {
		entry := addonEvidence{Name: name, Version: clusterMinor, Publisher: "Microsoft", Status: "Enabled", Compatible: clusterSupported, InSupport: clusterSupported}
		if !clusterSupported {
			entry.Reason = "cluster-managed add-on follows an AKS Kubernetes version outside support or unverified"
		}
		evidence.Addons = append(evidence.Addons, entry)
	}
	return evidence, errors.Join(errs...)
}

// nodeIntegrityEvidence reports per-agent-pool node image support and Trusted Launch
// (secure boot + vTPM) state from the AKS agent pool profiles.
func (s *AzureService) nodeIntegrityEvidence(ctx context.Context, clusterID string) ([]map[string]interface{}, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	minors, minorsErr := s.supportedMinors(ctx, cluster)
	nodes := []map[string]interface{}{}
	for _, pool := range cluster.Properties.AgentPoolProfiles {
		reason := ""
		supported := pool.NodeImageVersion != "" && minorsErr == nil && minors[pool.minor()]
		if minorsErr != nil {
			reason = "AKS Kubernetes version support list unavailable: " + minorsErr.Error()
		}
		boot := pool.SecurityProfile.EnableSecureBoot && pool.SecurityProfile.EnableVTPM
		if !boot {
			reason = strings.TrimSpace(reason + " secure boot and vTPM are not both enabled on this agent pool")
		}
		source := "csp"
		if pool.NodeImageVersion == "" {
			source = "unknown"
		}
		nodes = append(nodes, map[string]interface{}{
			"Name": pool.Name, "ImageID": pool.NodeImageVersion, "ImageSource": source,
			"ImageSupported": supported, "BootIntegrityEnabled": boot, "Reason": reason,
		})
	}
	return nodes, nil
}

func (s *AzureService) poolBounds(ctx context.Context, clusterID string) ([]autoscalerBound, error) {
	cluster, err := s.get(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	var bounds []autoscalerBound
	for _, pool := range cluster.Properties.AgentPoolProfiles {
		bound := autoscalerBound{Name: "agentpool/" + pool.Name, Kind: "nodepool", Min: pool.Count, Max: pool.Count}
		if pool.EnableAutoScaling {
			bound.Min, bound.Max, bound.Enabled = pool.MinCount, pool.MaxCount, pool.MaxCount > pool.MinCount
		}
		bounds = append(bounds, bound)
	}
	return bounds, nil
}

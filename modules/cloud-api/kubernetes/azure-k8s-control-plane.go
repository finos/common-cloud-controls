package kubernetes

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

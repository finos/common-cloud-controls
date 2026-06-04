package secrets

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AzureSecretsService)(nil)

type AzureSecretsService struct {
	client *azsecrets.Client
	ctx    context.Context
	config types.Config
}

func NewAzureSecretsService(ctx context.Context, cfg types.Config) (*AzureSecretsService, error) {
	vaultURI := strings.TrimSpace(cfg.Get("azure-key-vault-uri"))
	if vaultURI == "" {
		name := strings.TrimSpace(cfg.Get("azure-key-vault-name"))
		if name == "" {
			return nil, fmt.Errorf("azure-key-vault-uri or azure-key-vault-name is required")
		}
		vaultURI = fmt.Sprintf("https://%s.vault.azure.net/", name)
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("azure credential: %w", err)
	}
	client, err := azsecrets.NewClient(vaultURI, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("key vault secrets client: %w", err)
	}
	return &AzureSecretsService{client: client, ctx: ctx, config: cfg}, nil
}

func NewAzureSecretsServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AzureSecretsService, error) {
	vaultURI := strings.TrimSpace(cfg.Get("azure-key-vault-uri"))
	if vaultURI == "" {
		name := strings.TrimSpace(cfg.Get("azure-key-vault-name"))
		if name == "" {
			return nil, fmt.Errorf("azure-key-vault-uri or azure-key-vault-name is required")
		}
		vaultURI = fmt.Sprintf("https://%s.vault.azure.net/", name)
	}
	clientID := identity.ClientID()
	secret := identity.ClientSecret()
	if clientID == "" || secret == "" {
		return nil, fmt.Errorf("client_id and client_secret required for identity %q", identity.UserName)
	}
	cred, err := azidentity.NewClientSecretCredential(
		cfg.Get("azure-tenant-id"),
		clientID,
		secret,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("client secret credential: %w", err)
	}
	client, err := azsecrets.NewClient(vaultURI, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("key vault secrets client: %w", err)
	}
	return &AzureSecretsService{client: client, ctx: ctx, config: cfg}, nil
}

func (s *AzureSecretsService) secretName(secretID string) string {
	if secretID != "" {
		return secretID
	}
	if v := s.config.Get("azure-secret-name"); v != "" {
		return v
	}
	return s.config.Get("resource")
}

func (s *AzureSecretsService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	name := s.secretName("")
	if name == "" {
		return nil, fmt.Errorf("resource or azure-secret-name is required")
	}
	return []types.TestParams{{
		UID:                 name,
		ResourceName:        name,
		ProviderServiceType: "Microsoft.KeyVault/vault/secrets",
		ServiceType:         "secrets",
		CatalogTypes:        []string{"CCC.SecMgmt"},
		TagFilter:           []string{"@Behavioural", "@secrets"},
		Config:              s.config,
	}}, nil
}

func (s *AzureSecretsService) CheckUserProvisioned() error {
	name := s.secretName("")
	if name == "" {
		return fmt.Errorf("secret name is required")
	}
	_, err := s.client.GetSecret(s.ctx, name, "", nil)
	if err != nil {
		return fmt.Errorf("key vault secret access not ready: %w", err)
	}
	return nil
}

func (s *AzureSecretsService) ElevateAccessForInspection() error { return nil }
func (s *AzureSecretsService) ResetAccess() error                { return nil }
func (s *AzureSecretsService) TearDown() error                   { return nil }

func (s *AzureSecretsService) UpdateResourcePolicy() error {
	return fmt.Errorf("UpdateResourcePolicy not implemented for secrets")
}
func (s *AzureSecretsService) TriggerDataWrite(string) error {
	return fmt.Errorf("TriggerDataWrite not implemented for secrets")
}
func (s *AzureSecretsService) TriggerDataRead(string) error {
	return fmt.Errorf("TriggerDataRead not implemented for secrets")
}
func (s *AzureSecretsService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AzureSecretsService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *AzureSecretsService) RetrieveSecretVersion(secretID, versionSpecifier string) (*SecretValue, error) {
	name := s.secretName(secretID)
	if name == "" {
		return nil, fmt.Errorf("secret id is required")
	}
	version := strings.TrimSpace(versionSpecifier)
	if version == "" || strings.EqualFold(version, "latest") {
		version = ""
	}
	resp, err := s.client.GetSecret(s.ctx, name, version, nil)
	if err != nil {
		return nil, classifyAzureDeny(err)
	}
	val := ""
	if resp.Value != nil {
		val = *resp.Value
	}
	versionID := ""
	if resp.ID != nil {
		versionID = resp.ID.Version()
	}
	return &SecretValue{Plaintext: val, VersionID: versionID, Denied: false}, nil
}

func (s *AzureSecretsService) RetrieveSecretInRegion(secretID, region string) (*SecretValue, error) {
	authorized := strings.TrimSpace(s.config.CloudParams().Region)
	if authorized == "" {
		authorized = firstPermittedRegion(s.config)
	}
	region = strings.TrimSpace(region)
	if region == "" {
		return nil, fmt.Errorf("region is required")
	}
	if !strings.EqualFold(region, authorized) {
		// Wrong region: use a non-existent vault hostname for the requested geography.
		badVault := fmt.Sprintf("https://finos-ccc-integration-missing-%s.vault.azure.net/", sanitizeAzureRegion(region))
		cred, err := azidentity.NewDefaultAzureCredential(nil)
		if err != nil {
			return nil, err
		}
		client, err := azsecrets.NewClient(badVault, cred, nil)
		if err != nil {
			return nil, classifyAzureDeny(err)
		}
		_, err = client.GetSecret(s.ctx, s.secretName(secretID), "", nil)
		if err != nil {
			return nil, classifyAzureDeny(err)
		}
		return &SecretValue{Denied: false}, nil
	}
	return s.RetrieveSecretVersion(secretID, "latest")
}

func classifyAzureDeny(err error) error {
	if err == nil {
		return nil
	}
	var respErr *azcore.ResponseError
	if errors.As(err, &respErr) {
		return fmt.Errorf("access denied: %w", err)
	}
	if strings.Contains(strings.ToLower(err.Error()), "secretnotfound") {
		return fmt.Errorf("access denied: %w", err)
	}
	return fmt.Errorf("access denied: %w", err)
}

func firstPermittedRegion(cfg types.Config) string {
	raw, ok := cfg.Vars()["permitted-regions"]
	if !ok {
		return ""
	}
	switch v := raw.(type) {
	case []interface{}:
		if len(v) > 0 {
			return fmt.Sprintf("%v", v[0])
		}
	case []string:
		if len(v) > 0 {
			return v[0]
		}
	}
	return ""
}

func sanitizeAzureRegion(region string) string {
	r := strings.ToLower(strings.ReplaceAll(region, " ", ""))
	var b strings.Builder
	for _, c := range r {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			b.WriteRune(c)
		}
	}
	if b.Len() == 0 {
		return "invalid"
	}
	return b.String()
}

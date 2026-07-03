package secrets

import (
	"context"
	"fmt"
	"strings"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	"cloud.google.com/go/secretmanager/apiv1/secretmanagerpb"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var _ Service = (*GCPSecretsService)(nil)

type GCPSecretsService struct {
	ctx       context.Context
	config    types.Config
	projectID string
}

func NewGCPSecretsService(ctx context.Context, cfg types.Config) (*GCPSecretsService, error) {
	projectID := strings.TrimSpace(cfg.Get("gcp-project-id"))
	if projectID == "" {
		projectID = strings.TrimSpace(cfg.CloudParams().GcpProjectId)
	}
	if projectID == "" {
		return nil, fmt.Errorf("gcp-project-id is required")
	}
	if strings.TrimSpace(cfg.Get("authorized-region")) == "" {
		return nil, fmt.Errorf("authorized-region is required in config")
	}
	return &GCPSecretsService{
		ctx:       ctx,
		config:    cfg,
		projectID: projectID,
	}, nil
}

func NewGCPSecretsServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*GCPSecretsService, error) {
	// Service account JSON is loaded via GOOGLE_APPLICATION_CREDENTIALS when set by test harness.
	return NewGCPSecretsService(ctx, cfg)
}

func (s *GCPSecretsService) secretID(secretID string) string {
	if secretID != "" {
		return secretID
	}
	if v := s.config.Get("gcp-secret-id"); v != "" {
		return v
	}
	return s.config.Get("resource")
}

func normalizeVersionSpecifier(versionSpecifier string) string {
	version := strings.TrimSpace(versionSpecifier)
	if version == "" || strings.EqualFold(version, "latest") {
		return "latest"
	}
	return version
}

func (s *GCPSecretsService) regionalVersionResourceName(secretID, location, versionSpecifier string) string {
	id := s.secretID(secretID)
	return fmt.Sprintf("projects/%s/locations/%s/secrets/%s/versions/%s",
		s.projectID, location, id, normalizeVersionSpecifier(versionSpecifier))
}

func (s *GCPSecretsService) homeLocation() (string, error) {
	authorized := strings.TrimSpace(s.config.Get("authorized-region"))
	if authorized == "" {
		return "", fmt.Errorf("authorized-region is required in config")
	}
	return authorized, nil
}

func (s *GCPSecretsService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	id := s.secretID("")
	if id == "" {
		return nil, fmt.Errorf("resource or gcp-secret-id is required")
	}
	return []types.TestParams{{
		UID:                 id,
		ResourceName:        id,
		ProviderServiceType: "secretmanager.googleapis.com/Secret",
		ServiceType:         "secrets",
		CatalogTypes:        []string{"CCC.SecMgmt"},
		TagFilter:           []string{"@Behavioural", "@secrets"},
		Config:              s.config,
	}}, nil
}

func (s *GCPSecretsService) CheckUserProvisioned() error {
	home, err := s.homeLocation()
	if err != nil {
		return err
	}
	_, err = s.accessRegionalSecretVersion(s.secretID(""), home, "latest")
	if err != nil {
		return fmt.Errorf("secret manager access not ready: %w", err)
	}
	return nil
}

func (s *GCPSecretsService) ElevateAccessForInspection() error { return nil }
func (s *GCPSecretsService) ResetAccess() error                { return nil }
func (s *GCPSecretsService) TearDown() error                   { return nil }

func (s *GCPSecretsService) UpdateResourcePolicy() error {
	return fmt.Errorf("UpdateResourcePolicy not implemented for secrets")
}
func (s *GCPSecretsService) TriggerDataWrite(string) error {
	return fmt.Errorf("TriggerDataWrite not implemented for secrets")
}
func (s *GCPSecretsService) TriggerDataRead(string) error {
	return fmt.Errorf("TriggerDataRead not implemented for secrets")
}
func (s *GCPSecretsService) GetResourceRegion(string) (string, error) {
	return s.homeLocation()
}
func (s *GCPSecretsService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *GCPSecretsService) RetrieveSecretVersion(secretID, versionSpecifier string) (*SecretValue, error) {
	home, err := s.homeLocation()
	if err != nil {
		return nil, err
	}
	data, err := s.accessRegionalSecretVersion(secretID, home, versionSpecifier)
	if err != nil {
		return nil, classifyGCPDeny(err)
	}
	return &SecretValue{
		Plaintext: string(data),
		VersionID: versionSpecifier,
		Denied:    false,
	}, nil
}

func (s *GCPSecretsService) RetrieveSecretInRegion(secretID, region string) (*SecretValue, error) {
	region = strings.TrimSpace(region)
	if region == "" {
		return nil, fmt.Errorf("region is required")
	}
	_, err := s.accessRegionalSecretVersion(secretID, region, "latest")
	if err != nil {
		return nil, classifyGCPDeny(err)
	}
	return &SecretValue{Denied: false}, nil
}

func (s *GCPSecretsService) accessRegionalSecretVersion(secretID, location, versionSpecifier string) ([]byte, error) {
	client, err := newRegionalSecretManagerClient(s.ctx, location)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	name := s.regionalVersionResourceName(secretID, location, versionSpecifier)
	resp, err := client.AccessSecretVersion(s.ctx, &secretmanagerpb.AccessSecretVersionRequest{Name: name})
	if err != nil {
		return nil, err
	}
	return resp.Payload.Data, nil
}

func newRegionalSecretManagerClient(ctx context.Context, location string) (*secretmanager.Client, error) {
	endpoint := fmt.Sprintf("secretmanager.%s.rep.googleapis.com:443", location)
	client, err := secretmanager.NewClient(ctx,
		option.WithEndpoint(endpoint),
		option.WithScopes("https://www.googleapis.com/auth/cloud-platform"),
	)
	if err != nil {
		return nil, fmt.Errorf("secret manager client (%s): %w", location, err)
	}
	return client, nil
}

func classifyGCPDeny(err error) error {
	if err == nil {
		return nil
	}
	if st, ok := status.FromError(err); ok {
		switch st.Code() {
		case codes.PermissionDenied, codes.NotFound, codes.FailedPrecondition, codes.InvalidArgument:
			return fmt.Errorf("access denied: %w", err)
		}
	}
	return err
}

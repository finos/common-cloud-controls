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
	client    *secretmanager.Client
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
	client, err := secretmanager.NewClient(ctx, option.WithScopes("https://www.googleapis.com/auth/cloud-platform"))
	if err != nil {
		return nil, fmt.Errorf("secret manager client: %w", err)
	}
	return &GCPSecretsService{
		client:    client,
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

func (s *GCPSecretsService) versionResourceName(secretID, versionSpecifier string) string {
	id := s.secretID(secretID)
	version := strings.TrimSpace(versionSpecifier)
	if version == "" || strings.EqualFold(version, "latest") {
		version = "latest"
	}
	return fmt.Sprintf("projects/%s/secrets/%s/versions/%s", s.projectID, id, version)
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
	name := s.versionResourceName(s.secretID(""), "latest")
	_, err := s.client.AccessSecretVersion(s.ctx, &secretmanagerpb.AccessSecretVersionRequest{Name: name})
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
	authorized := strings.TrimSpace(s.config.Get("authorized-region"))
	if authorized == "" {
		return "", fmt.Errorf("authorized-region is required in config")
	}
	return authorized, nil
}
func (s *GCPSecretsService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *GCPSecretsService) RetrieveSecretVersion(secretID, versionSpecifier string) (*SecretValue, error) {
	name := s.versionResourceName(secretID, versionSpecifier)
	resp, err := s.client.AccessSecretVersion(s.ctx, &secretmanagerpb.AccessSecretVersionRequest{Name: name})
	if err != nil {
		return nil, classifyGCPDeny(err)
	}
	return &SecretValue{
		Plaintext: string(resp.Payload.Data),
		VersionID: versionSpecifier,
		Denied:    false,
	}, nil
}

func (s *GCPSecretsService) RetrieveSecretInRegion(secretID, region string) (*SecretValue, error) {
	region = strings.TrimSpace(region)
	if region == "" {
		return nil, fmt.Errorf("region is required")
	}
	// Use the regional replication endpoint for the requested location (same idea as AWS
	// regional SM). The global client ignores region and would not satisfy CN02.
	client, err := newRegionalSecretManagerClient(s.ctx, region)
	if err != nil {
		return nil, classifyGCPDeny(err)
	}
	defer client.Close()
	name := s.versionResourceName(secretID, "latest")
	_, err = client.AccessSecretVersion(s.ctx, &secretmanagerpb.AccessSecretVersionRequest{Name: name})
	if err != nil {
		return nil, classifyGCPDeny(err)
	}
	return &SecretValue{Denied: false}, nil
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

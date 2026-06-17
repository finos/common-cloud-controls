package secrets

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/aws/smithy-go"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AWSSecretsService)(nil)

type AWSSecretsService struct {
	client *secretsmanager.Client
	ctx    context.Context
	config types.Config
}

func NewAWSSecretsService(ctx context.Context, cfg types.Config) (*AWSSecretsService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}
	return &AWSSecretsService{
		client: secretsmanager.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func NewAWSSecretsServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AWSSecretsService, error) {
	accessKeyID := identity.Get("access_key_id")
	secretAccessKey := identity.Get("secret_access_key")
	sessionToken := identity.Get("session_token")
	if accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("missing AWS keys for identity %q", identity.UserName)
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(cfg.CloudParams().Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, sessionToken)),
	)
	if err != nil {
		return nil, fmt.Errorf("load AWS config with credentials: %w", err)
	}
	return &AWSSecretsService{
		client: secretsmanager.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func (s *AWSSecretsService) secretName(secretID string) string {
	if secretID != "" {
		return secretID
	}
	return s.config.Get("resource")
}

func (s *AWSSecretsService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	name := s.secretName("")
	if name == "" {
		return nil, fmt.Errorf("resource config var is required")
	}
	return []types.TestParams{{
		UID:                 name,
		ResourceName:        name,
		ProviderServiceType: "secretsmanager:secret",
		ServiceType:         "secrets",
		CatalogTypes:        []string{"CCC.SecMgmt"},
		TagFilter:           []string{"@Behavioural", "@secrets"},
		Config:              s.config,
	}}, nil
}

func (s *AWSSecretsService) CheckUserProvisioned() error {
	_, err := s.client.ListSecrets(s.ctx, &secretsmanager.ListSecretsInput{
		MaxResults: aws.Int32(1),
	})
	if err != nil {
		return fmt.Errorf("credentials not ready for Secrets Manager: %w", err)
	}
	return nil
}

func (s *AWSSecretsService) ElevateAccessForInspection() error { return nil }
func (s *AWSSecretsService) ResetAccess() error                { return nil }
func (s *AWSSecretsService) TearDown() error                   { return nil }

func (s *AWSSecretsService) UpdateResourcePolicy() error {
	return fmt.Errorf("UpdateResourcePolicy not implemented for secrets")
}
func (s *AWSSecretsService) TriggerDataWrite(string) error {
	return fmt.Errorf("TriggerDataWrite not implemented for secrets")
}
func (s *AWSSecretsService) TriggerDataRead(string) error {
	return fmt.Errorf("TriggerDataRead not implemented for secrets")
}
func (s *AWSSecretsService) GetResourceRegion(resourceID string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AWSSecretsService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}

func (s *AWSSecretsService) RetrieveSecretVersion(secretID, versionSpecifier string) (*SecretValue, error) {
	name := s.secretName(secretID)
	if name == "" {
		return nil, fmt.Errorf("secret id is required")
	}
	in := &secretsmanager.GetSecretValueInput{SecretId: aws.String(name)}
	switch strings.ToLower(strings.TrimSpace(versionSpecifier)) {
	case "", "latest", "awscurrent":
		in.VersionStage = aws.String("AWSCURRENT")
	default:
		if strings.HasPrefix(strings.ToLower(versionSpecifier), "aws") {
			in.VersionStage = aws.String(versionSpecifier)
		} else {
			in.VersionId = aws.String(versionSpecifier)
		}
	}
	out, err := s.client.GetSecretValue(s.ctx, in)
	if err != nil {
		return nil, classifyAWSDeny(err)
	}
	val := ""
	if out.SecretString != nil {
		val = *out.SecretString
	}
	versionID := ""
	if out.VersionId != nil {
		versionID = *out.VersionId
	}
	return &SecretValue{Plaintext: val, VersionID: versionID, Denied: false}, nil
}

func (s *AWSSecretsService) RetrieveSecretInRegion(secretID, region string) (*SecretValue, error) {
	name := s.secretName(secretID)
	if name == "" {
		return nil, fmt.Errorf("secret id is required")
	}
	region = strings.TrimSpace(region)
	if region == "" {
		return nil, fmt.Errorf("region is required")
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(s.ctx, awsconfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load AWS config for region %s: %w", region, err)
	}
	client := secretsmanager.NewFromConfig(awsCfg)
	_, err = client.GetSecretValue(s.ctx, &secretsmanager.GetSecretValueInput{
		SecretId:     aws.String(name),
		VersionStage: aws.String("AWSCURRENT"),
	})
	if err != nil {
		return nil, classifyAWSDeny(err)
	}
	return &SecretValue{Denied: false}, nil
}

func classifyAWSDeny(err error) error {
	if err == nil {
		return nil
	}
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		switch apiErr.ErrorCode() {
		case "AccessDeniedException", "ResourceNotFoundException", "InvalidParameterException",
			"DecryptionFailure", "InvalidRequestException":
			return fmt.Errorf("access denied: %w", err)
		}
	}
	return err
}

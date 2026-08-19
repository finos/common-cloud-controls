package kubernetes

import (
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AWSService)(nil)

type AWSService struct {
	*managedService
	eks *eks.Client
}

func NewAWSService(ctx context.Context, cfg types.Config) (*AWSService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("load AWS configuration for EKS: %w", err)
	}
	return newAWSService(ctx, cfg, awsCfg, nil), nil
}

func NewAWSServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AWSService, error) {
	accessKey := identity.Get("access_key_id")
	secretKey := identity.Get("secret_access_key")
	if accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("missing AWS keys for identity %q", identity.UserName)
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.CloudParams().Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, identity.Get("session_token"))),
	)
	if err != nil {
		return nil, fmt.Errorf("load AWS configuration for EKS identity %q: %w", identity.UserName, err)
	}
	return newAWSService(ctx, cfg, awsCfg, &identity), nil
}

func newAWSService(ctx context.Context, cfg types.Config, awsCfg aws.Config, identity *types.Identity) *AWSService {
	service := &AWSService{managedService: newManagedService(ctx, cfg, "aws", identity), eks: eks.NewFromConfig(awsCfg)}
	service.endpoint = service.endpointConfig
	service.region = service.clusterRegion
	service.updateMetadata = service.updateTags
	service.governance = service.governanceMetadata
	service.authConfig = service.clusterAuth
	service.encryption = service.encryptionStatus
	return service
}

func (s *AWSService) describe(ctx context.Context, clusterID string) (*eks.DescribeClusterOutput, error) {
	name := strings.TrimSpace(clusterID)
	if name == "" {
		name = s.config.Get("resource")
	}
	if name == "" {
		return nil, fmt.Errorf("EKS clusterID or resource config var is required")
	}
	output, err := s.eks.DescribeCluster(ctx, &eks.DescribeClusterInput{Name: aws.String(name)})
	if err != nil {
		return nil, fmt.Errorf("describe EKS cluster %q: %w", name, err)
	}
	if output.Cluster == nil {
		return nil, fmt.Errorf("EKS DescribeCluster returned no cluster for %q", name)
	}
	return output, nil
}

func (s *AWSService) endpointConfig(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	vpc := output.Cluster.ResourcesVpcConfig
	if vpc == nil {
		return nil, fmt.Errorf("EKS cluster %q has no resourcesVpcConfig", clusterID)
	}
	return map[string]interface{}{
		"PublicAccess": vpc.EndpointPublicAccess, "PrivateAccess": vpc.EndpointPrivateAccess,
		"AllowedCIDRs": vpc.PublicAccessCidrs, "EndpointHostname": endpointHostname(aws.ToString(output.Cluster.Endpoint)),
	}, nil
}

func (s *AWSService) clusterRegion(ctx context.Context, clusterID string) (string, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return "", err
	}
	arn := aws.ToString(output.Cluster.Arn)
	parts := strings.Split(arn, ":")
	if len(parts) > 3 && parts[3] != "" {
		return parts[3], nil
	}
	if s.config.CloudParams().Region != "" {
		return s.config.CloudParams().Region, nil
	}
	return "", fmt.Errorf("EKS cluster ARN did not contain a region")
}

func (s *AWSService) updateTags(ctx context.Context, clusterID string, patch map[string]interface{}) error {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return err
	}
	tags := make(map[string]string, len(patch))
	for key, value := range patch {
		tags[key] = fmt.Sprintf("%v", value)
	}
	if len(tags) == 0 {
		return fmt.Errorf("at least one EKS tag is required")
	}
	_, err = s.eks.TagResource(ctx, &eks.TagResourceInput{ResourceArn: output.Cluster.Arn, Tags: tags})
	if err != nil {
		return fmt.Errorf("tag EKS cluster: %w", err)
	}
	return nil
}

func (s *AWSService) governanceMetadata(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	required := splitConfigList(s.config.Get("required-metadata-keys"))
	var missing []string
	for _, key := range required {
		if strings.TrimSpace(output.Cluster.Tags[key]) == "" {
			missing = append(missing, key)
		}
	}
	return map[string]interface{}{"Tags": output.Cluster.Tags, "Labels": map[string]string{}, "MissingRequired": missing}, nil
}

func (s *AWSService) clusterAuth(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	mode := ""
	if output.Cluster.AccessConfig != nil {
		mode = string(output.Cluster.AccessConfig.AuthenticationMode)
	}
	return map[string]interface{}{
		"ManagedIdP": mode != "", "LegacyAuthEnabled": mode == "CONFIG_MAP",
		"LocalAccountsEnabled": false, "StaticClientCertsForHumans": false, "AuthenticationMode": mode,
	}, nil
}

func (s *AWSService) encryptionStatus(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	key := ""
	encrypted := false
	for _, config := range output.Cluster.EncryptionConfig {
		if contains(config.Resources, "secrets") {
			encrypted = true
			if config.Provider != nil {
				key = aws.ToString(config.Provider.KeyArn)
			}
		}
	}
	return map[string]interface{}{"SecretsEncrypted": encrypted, "KMSKeyID": key, "Provider": "aws-kms"}, nil
}

func splitConfigList(value string) []string {
	value = strings.Trim(value, "[]")
	if strings.TrimSpace(value) == "" {
		return nil
	}
	fields := strings.FieldsFunc(value, func(r rune) bool { return r == ',' || r == ' ' })
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		if trimmed := strings.Trim(strings.TrimSpace(field), `"'`); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

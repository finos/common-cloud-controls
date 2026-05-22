package iam

import (
	"context"
	"fmt"
	"net/url"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AWSIAMService implements IAMService for AWS.
type AWSIAMService struct {
	client *iam.Client
	ctx    context.Context
}

// NewAWSIAMService creates a new AWS IAM service using default credentials.
func NewAWSIAMService(ctx context.Context, _ types.Config) (*AWSIAMService, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}
	return &AWSIAMService{
		client: iam.NewFromConfig(cfg),
		ctx:    ctx,
	}, nil
}

// GetAccess retrieves the current access level for a user and service.
func (s *AWSIAMService) GetAccess(userName string, serviceID string) (string, string, error) {
	listPoliciesOutput, err := s.client.ListUserPolicies(s.ctx, &iam.ListUserPoliciesInput{
		UserName: aws.String(userName),
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to list user policies: %w", err)
	}

	policyPrefix := fmt.Sprintf("CCC-Test-%s-", sanitizeForPolicyName(serviceID))
	for _, policyName := range listPoliciesOutput.PolicyNames {
		if len(policyName) >= len(policyPrefix) && policyName[:len(policyPrefix)] == policyPrefix {
			getPolicyOutput, err := s.client.GetUserPolicy(s.ctx, &iam.GetUserPolicyInput{
				UserName:   aws.String(userName),
				PolicyName: aws.String(policyName),
			})
			if err != nil {
				return "", "", fmt.Errorf("failed to get policy %s: %w", policyName, err)
			}
			level := policyName[len(policyPrefix):]
			policyDocument := aws.ToString(getPolicyOutput.PolicyDocument)
			decodedPolicy, err := url.QueryUnescape(policyDocument)
			if err != nil {
				decodedPolicy = policyDocument
			}
			return level, decodedPolicy, nil
		}
	}
	return "none", "", nil
}

func sanitizeForPolicyName(s string) string {
	result := ""
	for _, char := range s {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			result += string(char)
		}
	}
	if len(result) > 64 {
		result = result[:64]
	}
	return result
}

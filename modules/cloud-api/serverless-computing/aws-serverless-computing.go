package serverlesscomputing

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/smithy-go"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AWSServerlessComputingService)(nil)

type AWSServerlessComputingService struct {
	client *lambda.Client
	ctx    context.Context
	config types.Config
}

func NewAWSServerlessComputingService(ctx context.Context, cfg types.Config) (*AWSServerlessComputingService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}
	return &AWSServerlessComputingService{
		client: lambda.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func NewAWSServerlessComputingServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AWSServerlessComputingService, error) {
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
		return nil, fmt.Errorf("failed to load AWS config with credentials: %w", err)
	}
	return &AWSServerlessComputingService{
		client: lambda.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func (s *AWSServerlessComputingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	functionName := s.config.Get("function-name", "resource")
	if functionName == "" {
		return nil, fmt.Errorf("function-name or resource config var is required")
	}
	return []types.TestParams{{
		UID:                 functionName,
		ResourceName:        functionName,
		ProviderServiceType: "lambda:function",
		ServiceType:         "serverless-computing",
		CatalogTypes:        []string{"CCC.SvlsComp"},
		TagFilter:           []string{"@Behavioural", "@serverless-computing"},
		Config:              s.config,
	}}, nil
}

func (s *AWSServerlessComputingService) CheckUserProvisioned() error {
	_, err := s.client.ListFunctions(s.ctx, &lambda.ListFunctionsInput{MaxItems: aws.Int32(1)})
	if err != nil {
		return fmt.Errorf("credentials not ready for Lambda access: %w", err)
	}
	return nil
}

func (s *AWSServerlessComputingService) ElevateAccessForInspection() error { return nil }
func (s *AWSServerlessComputingService) ResetAccess() error                { return nil }
func (s *AWSServerlessComputingService) TearDown() error                   { return nil }

func (s *AWSServerlessComputingService) UpdateResourcePolicy() error {
	functionID := s.config.Get("function-name", "resource")
	if functionID == "" {
		return fmt.Errorf("function-name or resource config var is required")
	}
	desc := "ccc-compliance-update-" + time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.client.UpdateFunctionConfiguration(s.ctx, &lambda.UpdateFunctionConfigurationInput{
		FunctionName: aws.String(functionID),
		Description:  aws.String(desc),
	})
	if err != nil {
		return fmt.Errorf("failed to update function metadata: %w", err)
	}
	return nil
}

func (s *AWSServerlessComputingService) TriggerDataWrite(resourceID string) error {
	payload := []byte(`{"action":"write","timestamp":"` + time.Now().UTC().Format(time.RFC3339Nano) + `"}`)
	_, err := s.client.Invoke(s.ctx, &lambda.InvokeInput{
		FunctionName: aws.String(resourceID),
		Payload:      payload,
	})
	if err != nil {
		return fmt.Errorf("failed to invoke function write trigger: %w", err)
	}
	return nil
}

func (s *AWSServerlessComputingService) TriggerDataRead(resourceID string) error {
	payload := []byte(`{"action":"read","timestamp":"` + time.Now().UTC().Format(time.RFC3339Nano) + `"}`)
	_, err := s.client.Invoke(s.ctx, &lambda.InvokeInput{
		FunctionName: aws.String(resourceID),
		Payload:      payload,
	})
	if err != nil {
		return fmt.Errorf("failed to invoke function read trigger: %w", err)
	}
	return nil
}

func (s *AWSServerlessComputingService) GetResourceRegion(_ string) (string, error) {
	return s.config.CloudParams().Region, nil
}

func (s *AWSServerlessComputingService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for serverless-computing")
}

func (s *AWSServerlessComputingService) GetInvokeEndpointExposure(functionID string) (*InvokeEndpointExposure, error) {
	exposure := &InvokeEndpointExposure{
		PrivateEndpointConfigured: strings.TrimSpace(s.config.Get("private-endpoint-url")) != "",
		PrivateEndpointURL:        strings.TrimSpace(s.config.Get("private-endpoint-url")),
	}
	out, err := s.client.GetFunctionUrlConfig(s.ctx, &lambda.GetFunctionUrlConfigInput{
		FunctionName: aws.String(functionID),
	})
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && apiErr.ErrorCode() == "ResourceNotFoundException" {
			return exposure, nil
		}
		return nil, fmt.Errorf("failed to inspect function URL config: %w", err)
	}
	exposure.PublicEndpointConfigured = true
	exposure.PublicEndpointURL = aws.ToString(out.FunctionUrl)
	return exposure, nil
}

func (s *AWSServerlessComputingService) AttemptPrivateInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	if url == "" {
		return nil, fmt.Errorf("private-endpoint-url is required")
	}
	return invokeHTTP(url, map[string]string{"function": functionID, "path": "private"})
}

func (s *AWSServerlessComputingService) AttemptPublicInternetInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("public-invoke-url"))
	if url == "" {
		exposure, err := s.GetInvokeEndpointExposure(functionID)
		if err != nil {
			return nil, err
		}
		url = strings.TrimSpace(exposure.PublicEndpointURL)
	}
	if url == "" {
		return nil, fmt.Errorf("no public invoke URL available (set public-invoke-url or expose Function URL)")
	}
	return invokeHTTP(url, map[string]string{"function": functionID, "path": "public"})
}

func (s *AWSServerlessComputingService) InvokeFunctionBurst(functionID string, count int) (*BurstInvokeResult, error) {
	if count <= 0 {
		return nil, fmt.Errorf("count must be > 0")
	}
	result := &BurstInvokeResult{}
	for i := 0; i < count; i++ {
		payload := []byte(fmt.Sprintf(`{"burstIndex":%d}`, i))
		_, err := s.client.Invoke(s.ctx, &lambda.InvokeInput{
			FunctionName: aws.String(functionID),
			Payload:      payload,
		})
		if err != nil {
			var apiErr smithy.APIError
			if errors.As(err, &apiErr) && apiErr.ErrorCode() == "TooManyRequestsException" {
				result.ThrottledCount++
				continue
			}
			result.FailedCount++
			continue
		}
		result.SuccessCount++
	}
	result.AllSucceeded = result.SuccessCount == count
	return result, nil
}

func (s *AWSServerlessComputingService) GetFunctionEncryptionStatus(functionID string) (*FunctionEncryptionStatus, error) {
	out, err := s.client.GetFunctionConfiguration(s.ctx, &lambda.GetFunctionConfigurationInput{
		FunctionName: aws.String(functionID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get function configuration: %w", err)
	}
	return &FunctionEncryptionStatus{
		EnvEncrypted:     aws.ToString(out.KMSKeyArn) != "",
		KMSKeyArn:        aws.ToString(out.KMSKeyArn),
		SecretsEncrypted: aws.ToString(out.KMSKeyArn) != "",
	}, nil
}

func invokeHTTP(url string, payload map[string]string) (*InvokeAttemptResult, error) {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return &InvokeAttemptResult{
			Invoked:      false,
			AccessDenied: true,
			Error:        err.Error(),
		}, nil
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	return &InvokeAttemptResult{
		Invoked:      resp.StatusCode >= 200 && resp.StatusCode < 300,
		AccessDenied: resp.StatusCode >= 400,
		StatusCode:   resp.StatusCode,
		Error:        strings.TrimSpace(string(out)),
	}, nil
}

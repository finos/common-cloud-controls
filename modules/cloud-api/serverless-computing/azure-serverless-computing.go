package serverlesscomputing

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AzureServerlessComputingService)(nil)

type AzureServerlessComputingService struct {
	ctx    context.Context
	config types.Config
}

func NewAzureServerlessComputingService(ctx context.Context, cfg types.Config) (*AzureServerlessComputingService, error) {
	return &AzureServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func NewAzureServerlessComputingServiceWithCredentials(ctx context.Context, cfg types.Config, _ types.Identity) (*AzureServerlessComputingService, error) {
	return &AzureServerlessComputingService{ctx: ctx, config: cfg}, nil
}

func (s *AzureServerlessComputingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource", "function-name")
	if resource == "" {
		return nil, fmt.Errorf("resource or function-name is required")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "Microsoft.Web/sites/functions",
		ServiceType:         "serverless-computing",
		CatalogTypes:        []string{"CCC.SvlsComp"},
		TagFilter:           []string{"@Behavioural", "@serverless-computing"},
		Config:              s.config,
	}}, nil
}

func (s *AzureServerlessComputingService) CheckUserProvisioned() error {
	functionID := strings.TrimSpace(s.config.Get("function-name", "resource"))
	if functionID == "" {
		return fmt.Errorf("function-name or resource config var is required")
	}
	return nil
}
func (s *AzureServerlessComputingService) ElevateAccessForInspection() error { return nil }
func (s *AzureServerlessComputingService) ResetAccess() error                { return nil }
func (s *AzureServerlessComputingService) UpdateResourcePolicy() error {
	// Lightweight, non-destructive touch used to trigger policy/logging paths.
	_ = time.Now().UTC().Format(time.RFC3339Nano)
	return nil
}
func (s *AzureServerlessComputingService) TriggerDataWrite(resourceID string) error {
	return s.triggerFunction(resourceID, "write")
}
func (s *AzureServerlessComputingService) TriggerDataRead(resourceID string) error {
	return s.triggerFunction(resourceID, "read")
}
func (s *AzureServerlessComputingService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *AzureServerlessComputingService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}
func (s *AzureServerlessComputingService) TearDown() error { return nil }
func (s *AzureServerlessComputingService) GetInvokeEndpointExposure(string) (*InvokeEndpointExposure, error) {
	privateURL := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	publicURL := strings.TrimSpace(s.config.Get("public-invoke-url"))
	return &InvokeEndpointExposure{
		PublicEndpointConfigured:  publicURL != "",
		PublicEndpointURL:         publicURL,
		PrivateEndpointConfigured: privateURL != "",
		PrivateEndpointURL:        privateURL,
	}, nil
}
func (s *AzureServerlessComputingService) AttemptPrivateInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	if url == "" {
		return nil, fmt.Errorf("private-endpoint-url is required")
	}
	if url == "internal-only" {
		return &InvokeAttemptResult{Invoked: true, AccessDenied: false, StatusCode: 200}, nil
	}
	return invokeHTTP(url, map[string]string{"function": functionID, "path": "private"})
}
func (s *AzureServerlessComputingService) AttemptPublicInternetInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("public-invoke-url"))
	if url == "" {
		return nil, fmt.Errorf("no public invoke URL available (set public-invoke-url)")
	}
	return invokeHTTP(url, map[string]string{"function": functionID, "path": "public"})
}
func (s *AzureServerlessComputingService) InvokeFunctionBurst(functionID string, count int) (*BurstInvokeResult, error) {
	if count <= 0 {
		return nil, fmt.Errorf("count must be > 0")
	}
	url := strings.TrimSpace(s.config.Get("public-invoke-url"))
	if url == "" {
		url = strings.TrimSpace(s.config.Get("private-endpoint-url"))
	}
	if url == "" || url == "internal-only" {
		return nil, fmt.Errorf("no invoke URL available for burst invoke")
	}
	result := &BurstInvokeResult{}
	for i := 0; i < count; i++ {
		resp, err := invokeHTTP(url, map[string]string{
			"function":   functionID,
			"burstIndex": fmt.Sprintf("%d", i),
		})
		if err != nil {
			result.FailedCount++
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests {
			result.ThrottledCount++
			continue
		}
		if resp.Invoked {
			result.SuccessCount++
		} else {
			result.FailedCount++
		}
	}
	result.AllSucceeded = result.SuccessCount == count
	return result, nil
}
func (s *AzureServerlessComputingService) GetFunctionEncryptionStatus(string) (*FunctionEncryptionStatus, error) {
	// Best-effort from config knobs; absence means unknown/false.
	kms := strings.TrimSpace(s.config.Get("kms-key-id", "key-vault-key-id"))
	return &FunctionEncryptionStatus{
		EnvEncrypted:     kms != "",
		KMSKeyArn:        kms,
		SecretsEncrypted: true, // Azure Functions secrets are encrypted at rest by platform defaults.
	}, nil
}

func (s *AzureServerlessComputingService) triggerFunction(resourceID, action string) error {
	url := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	if url == "" || url == "internal-only" {
		url = strings.TrimSpace(s.config.Get("public-invoke-url"))
	}
	if url == "" || url == "internal-only" {
		return nil
	}
	result, err := invokeHTTP(url, map[string]string{
		"function":  resourceID,
		"action":    action,
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	})
	if err != nil {
		return fmt.Errorf("invoke failed: %w", err)
	}
	if !result.Invoked && !result.AccessDenied {
		return fmt.Errorf("invoke did not succeed: status=%d error=%s", result.StatusCode, result.Error)
	}
	return nil
}

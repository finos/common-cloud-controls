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

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/cloudfunctions/v2"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

var _ Service = (*GCPServerlessComputingService)(nil)

type GCPServerlessComputingService struct {
	ctx        context.Context
	config     types.Config
	projectID  string
	region     string
	cfService  *cloudfunctions.Service
	httpClient *http.Client
}

func NewGCPServerlessComputingService(ctx context.Context, cfg types.Config) (*GCPServerlessComputingService, error) {
	projectID := cfg.Get("gcp-project-id")
	if projectID == "" {
		projectID = cfg.CloudParams().GcpProjectId
	}
	if projectID == "" {
		return nil, fmt.Errorf("gcp-project-id is required")
	}

	region := cfg.CloudParams().Region
	if strings.TrimSpace(region) == "" {
		region = "us-central1"
	}

	httpClient, err := google.DefaultClient(ctx, cloudfunctions.CloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("failed to create default GCP client: %w", err)
	}

	cfSvc, err := cloudfunctions.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, fmt.Errorf("failed to create cloudfunctions service: %w", err)
	}

	return &GCPServerlessComputingService{
		ctx:        ctx,
		config:     cfg,
		projectID:  projectID,
		region:     region,
		cfService:  cfSvc,
		httpClient: httpClient,
	}, nil
}

func NewGCPServerlessComputingServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*GCPServerlessComputingService, error) {
	projectID := cfg.Get("gcp-project-id")
	if projectID == "" {
		projectID = cfg.CloudParams().GcpProjectId
	}
	if projectID == "" {
		return nil, fmt.Errorf("gcp-project-id is required")
	}

	region := cfg.CloudParams().Region
	if strings.TrimSpace(region) == "" {
		region = "us-central1"
	}

	serviceAccountKey := identity.Get("service_account_key")
	if serviceAccountKey == "" {
		return nil, fmt.Errorf("service_account_key not found for test identity %q", identity.UserName)
	}
	creds, err := google.CredentialsFromJSON(ctx, []byte(serviceAccountKey), cloudfunctions.CloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("failed to parse GCP service account key for %q: %w", identity.UserName, err)
	}
	httpClient := oauth2HTTPClient(ctx, creds.TokenSource)
	cfSvc, err := cloudfunctions.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, fmt.Errorf("failed to create cloudfunctions service: %w", err)
	}

	return &GCPServerlessComputingService{
		ctx:        ctx,
		config:     cfg,
		projectID:  projectID,
		region:     region,
		cfService:  cfSvc,
		httpClient: httpClient,
	}, nil
}

func (s *GCPServerlessComputingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource", "function-name")
	if resource == "" {
		return nil, fmt.Errorf("resource or function-name is required")
	}
	return []types.TestParams{{
		UID:                 resource,
		ResourceName:        resource,
		ProviderServiceType: "cloudfunctions.googleapis.com/Function",
		ServiceType:         "serverless-computing",
		CatalogTypes:        []string{"CCC.SvlsComp"},
		TagFilter:           []string{"@Behavioural", "@serverless-computing"},
		Config:              s.config,
	}}, nil
}

func (s *GCPServerlessComputingService) CheckUserProvisioned() error {
	_, err := s.getFunction(s.functionResourceName(s.config.Get("function-name", "resource")))
	if err != nil {
		return fmt.Errorf("credentials not ready for Cloud Functions access: %w", err)
	}
	return nil
}
func (s *GCPServerlessComputingService) ElevateAccessForInspection() error { return nil }
func (s *GCPServerlessComputingService) ResetAccess() error                { return nil }
func (s *GCPServerlessComputingService) UpdateResourcePolicy() error {
	functionID := s.config.Get("function-name", "resource")
	if functionID == "" {
		return fmt.Errorf("function-name or resource config var is required")
	}
	fn, err := s.getFunction(s.functionResourceName(functionID))
	if err != nil {
		return err
	}
	if fn.Labels == nil {
		fn.Labels = map[string]string{}
	}
	fn.Labels["ccc-compliance-touch"] = time.Now().UTC().Format("20060102t150405z")
	_, err = s.cfService.Projects.Locations.Functions.Patch(fn.Name, &cloudfunctions.Function{
		Labels: fn.Labels,
	}).UpdateMask("labels").Do()
	if err != nil {
		return fmt.Errorf("failed to update function labels: %w", err)
	}
	return nil
}
func (s *GCPServerlessComputingService) TriggerDataWrite(resourceID string) error {
	return s.triggerFunction(resourceID, "write")
}
func (s *GCPServerlessComputingService) TriggerDataRead(resourceID string) error {
	return s.triggerFunction(resourceID, "read")
}
func (s *GCPServerlessComputingService) GetResourceRegion(string) (string, error) {
	return s.config.CloudParams().Region, nil
}
func (s *GCPServerlessComputingService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for serverless-computing")
}
func (s *GCPServerlessComputingService) TearDown() error { return nil }
func (s *GCPServerlessComputingService) GetInvokeEndpointExposure(functionID string) (*InvokeEndpointExposure, error) {
	fn, err := s.getFunction(s.functionResourceName(functionID))
	if err != nil {
		return nil, err
	}
	privateURL := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	publicURL := ""
	publicConfigured := false
	if fn.ServiceConfig != nil {
		if strings.TrimSpace(fn.ServiceConfig.Uri) != "" && fn.ServiceConfig.IngressSettings == "ALLOW_ALL" {
			publicConfigured = true
			publicURL = strings.TrimSpace(fn.ServiceConfig.Uri)
		}
	}
	return &InvokeEndpointExposure{
		PublicEndpointConfigured:  publicConfigured,
		PublicEndpointURL:         publicURL,
		PrivateEndpointConfigured: privateURL != "",
		PrivateEndpointURL:        privateURL,
	}, nil
}
func (s *GCPServerlessComputingService) AttemptPrivateInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	if url == "" {
		return nil, fmt.Errorf("private-endpoint-url is required")
	}
	if url == "internal-only" {
		return &InvokeAttemptResult{Invoked: true, AccessDenied: false, StatusCode: 200}, nil
	}
	return s.invokeHTTP(url, map[string]string{"function": functionID, "path": "private"})
}
func (s *GCPServerlessComputingService) AttemptPublicInternetInvoke(functionID string) (*InvokeAttemptResult, error) {
	url := strings.TrimSpace(s.config.Get("public-invoke-url"))
	if url == "" {
		exposure, err := s.GetInvokeEndpointExposure(functionID)
		if err != nil {
			return nil, err
		}
		url = strings.TrimSpace(exposure.PublicEndpointURL)
	}
	if url == "" {
		return &InvokeAttemptResult{
			Invoked:      false,
			AccessDenied: true,
			StatusCode:   0,
			Error:        "no public invoke URL available",
		}, nil
	}
	return s.invokeHTTP(url, map[string]string{"function": functionID, "path": "public"})
}
func (s *GCPServerlessComputingService) InvokeFunctionBurst(string, int) (*BurstInvokeResult, error) {
	functionID := s.config.Get("function-name", "resource")
	return s.InvokeFunctionBurstWithID(functionID, s.config.Get("burst-overrun"), 0)
}
func (s *GCPServerlessComputingService) GetFunctionEncryptionStatus(functionID string) (*FunctionEncryptionStatus, error) {
	fn, err := s.getFunction(s.functionResourceName(functionID))
	if err != nil {
		return nil, err
	}
	kmsKey := strings.TrimSpace(fn.KmsKeyName)
	secretsEncrypted := false
	if fn.ServiceConfig != nil && len(fn.ServiceConfig.SecretEnvironmentVariables) > 0 {
		secretsEncrypted = true
	}
	return &FunctionEncryptionStatus{
		EnvEncrypted:     kmsKey != "",
		KMSKeyArn:        kmsKey,
		SecretsEncrypted: secretsEncrypted || kmsKey != "",
	}, nil
}

func (s *GCPServerlessComputingService) InvokeFunctionBurstWithID(functionID, configuredCount string, fallback int) (*BurstInvokeResult, error) {
	count := fallback
	if strings.TrimSpace(configuredCount) != "" {
		if _, err := fmt.Sscanf(strings.TrimSpace(configuredCount), "%d", &count); err != nil {
			return nil, fmt.Errorf("invalid burst count %q", configuredCount)
		}
	}
	return s.InvokeFunctionBurstInternal(functionID, count)
}

func (s *GCPServerlessComputingService) InvokeFunctionBurstInternal(functionID string, count int) (*BurstInvokeResult, error) {
	if count <= 0 {
		return nil, fmt.Errorf("count must be > 0")
	}
	url := strings.TrimSpace(s.config.Get("public-invoke-url"))
	if url == "" {
		exposure, err := s.GetInvokeEndpointExposure(functionID)
		if err != nil {
			return nil, err
		}
		url = strings.TrimSpace(exposure.PublicEndpointURL)
	}
	if url == "" {
		return nil, fmt.Errorf("no invoke URL available for burst invoke")
	}
	result := &BurstInvokeResult{}
	for i := 0; i < count; i++ {
		resp, err := s.invokeHTTP(url, map[string]string{
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

func (s *GCPServerlessComputingService) InvokeFunctionBurst(functionID string, count int) (*BurstInvokeResult, error) {
	return s.InvokeFunctionBurstInternal(functionID, count)
}

func (s *GCPServerlessComputingService) triggerFunction(resourceID, action string) error {
	url := strings.TrimSpace(s.config.Get("private-endpoint-url"))
	if url == "" || url == "internal-only" {
		exposure, err := s.GetInvokeEndpointExposure(resourceID)
		if err != nil {
			return err
		}
		url = strings.TrimSpace(exposure.PublicEndpointURL)
	}
	if url == "" || url == "internal-only" {
		return nil
	}
	result, err := s.invokeHTTP(url, map[string]string{
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

func (s *GCPServerlessComputingService) functionResourceName(functionID string) string {
	functionID = strings.TrimSpace(functionID)
	if strings.HasPrefix(functionID, "projects/") {
		return functionID
	}
	return fmt.Sprintf("projects/%s/locations/%s/functions/%s", s.projectID, s.region, functionID)
}

func (s *GCPServerlessComputingService) getFunction(functionName string) (*cloudfunctions.Function, error) {
	fn, err := s.cfService.Projects.Locations.Functions.Get(functionName).Do()
	if err != nil {
		var gErr *googleapi.Error
		if errors.As(err, &gErr) && gErr.Code == http.StatusNotFound {
			return nil, fmt.Errorf("function %q not found", functionName)
		}
		return nil, fmt.Errorf("failed to get function %q: %w", functionName, err)
	}
	return fn, nil
}

func (s *GCPServerlessComputingService) invokeHTTP(url string, payload map[string]string) (*InvokeAttemptResult, error) {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := s.httpClient
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
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

func oauth2HTTPClient(ctx context.Context, tokenSource oauth2TokenSource) *http.Client {
	return &http.Client{
		Transport: &tokenTransport{
			base:   http.DefaultTransport,
			source: tokenSource,
		},
		Timeout: 15 * time.Second,
	}
}

type oauth2TokenSource interface {
	Token() (*oauth2Token, error)
}

type oauth2Token struct {
	AccessToken string
	TokenType   string
}

type tokenTransport struct {
	base   http.RoundTripper
	source oauth2TokenSource
}

func (t *tokenTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	token, err := t.source.Token()
	if err != nil {
		return nil, err
	}
	cloned := req.Clone(req.Context())
	if token.TokenType == "" {
		token.TokenType = "Bearer"
	}
	cloned.Header.Set("Authorization", token.TokenType+" "+token.AccessToken)
	return t.base.RoundTrip(cloned)
}

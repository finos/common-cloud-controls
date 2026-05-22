package iam

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/authorization/armauthorization/v2"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/generic/retry"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/google/uuid"
)

// AzureIAMService implements IAMService for Azure using Service Principals
type AzureIAMService struct {
	authClient       *armauthorization.RoleAssignmentsClient
	ctx              context.Context
	credential       azcore.TokenCredential
	instance         types.InstanceConfig
	httpClient       *http.Client
	tenantID         string
	provisionedUsers map[string]*Identity // Cache of provisioned users by userName
	accessLevels     map[string]string    // Cache of access levels by "userName:serviceID"
}

// NewAzureIAMService creates a new Azure IAM service using default credentials
func NewAzureIAMService(ctx context.Context, instance types.InstanceConfig) (*AzureIAMService, error) {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure credential: %w", err)
	}

	return newAzureIAMServiceInternal(ctx, instance, cred)
}

// NewAzureIAMServiceWithCredentials creates a new Azure IAM service with specific credentials
func NewAzureIAMServiceWithCredentials(ctx context.Context, instance types.InstanceConfig, cred azcore.TokenCredential) (*AzureIAMService, error) {
	return newAzureIAMServiceInternal(ctx, instance, cred)
}

func newAzureIAMServiceInternal(ctx context.Context, instance types.InstanceConfig, cred azcore.TokenCredential) (*AzureIAMService, error) {
	cloudParams := instance.CloudParams()
	authClient, err := armauthorization.NewRoleAssignmentsClient(cloudParams.AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create authorization client: %w", err)
	}

	// Get tenant ID from the credential
	tenantID, err := getTenantID(ctx, cred)
	if err != nil {
		return nil, fmt.Errorf("failed to get tenant ID: %w", err)
	}

	return &AzureIAMService{
		authClient:       authClient,
		ctx:              ctx,
		credential:       cred,
		instance:         instance,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
		tenantID:         tenantID,
		provisionedUsers: make(map[string]*Identity),
		accessLevels:     make(map[string]string),
	}, nil
}

// getTenantID retrieves the tenant ID from the credential
func getTenantID(ctx context.Context, cred azcore.TokenCredential) (string, error) {
	// Get a token to extract tenant ID
	token, err := cred.GetToken(ctx, policy.TokenRequestOptions{
		Scopes: []string{"https://management.azure.com/.default"},
	})
	if err != nil {
		return "", err
	}

	// Parse the JWT token to extract tenant ID
	// The token is in format: header.payload.signature
	parts := strings.Split(token.Token, ".")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid token format")
	}

	// For now, we'll use a simpler approach - get it from the Azure CLI config
	// In production, you'd parse the JWT properly
	return getAzureTenantID(), nil
}

// getAzureTenantID gets the tenant ID from environment or Azure CLI
func getAzureTenantID() string {
	// Try to get from Azure CLI
	// In production, this should be passed as a parameter or read from config
	// For now, return a placeholder that will be populated by the credential
	return "" // Will be populated when we make Graph API calls
}

// ProvisionUser creates a new service principal with a client secret, or returns existing one
// ProvisionUserWithAccess creates a user and sets their access level in a single operation
func (s *AzureIAMService) ProvisionUserWithAccess(userName string, serviceID string, level string) (*Identity, error) {
	cacheKey := fmt.Sprintf("%s:%s", userName, serviceID)
	if cachedIdentity, exists := s.provisionedUsers[userName]; exists {
		if cachedLevel, levelExists := s.accessLevels[cacheKey]; levelExists && cachedLevel == level {
			fmt.Printf("♻️  Using cached identity for user %s with %s access (skipping all delays)\n", userName, level)
			return cachedIdentity, nil
		}
		fmt.Printf("♻️  Reusing provisioned principal %s; applying %s access for current scope\n", userName, level)
		policyDoc, err := s.setAccessInternal(cachedIdentity, serviceID, level)
		if err != nil {
			return nil, err
		}
		cachedIdentity.Policy = policyDoc
		s.accessLevels[cacheKey] = level
		return cachedIdentity, nil
	}

	// Step 1: Provision the user (or retrieve existing) - no waiting yet
	identity, err := s.provisionUserInternal(userName)
	if err != nil {
		return nil, err
	}

	// Step 2: Set access level - this will wait for both credential and RBAC propagation together
	policyDoc, err := s.setAccessInternal(identity, serviceID, level)
	if err != nil {
		return nil, err
	}

	// Store policy in identity
	identity.Policy = policyDoc

	// Cache the identity and access level AFTER validation completes
	s.provisionedUsers[userName] = identity
	s.accessLevels[cacheKey] = level

	return identity, nil
}

// provisionUserInternal is the internal implementation of ProvisionUser
// Note: This does NOT interact with cache or wait for credential propagation
// All caching and validation is handled by ProvisionUserWithAccess
func (s *AzureIAMService) provisionUserInternal(userName string) (*Identity, error) {
	// Service principal display names can be more flexible than managed identity names
	displayName := sanitizeServicePrincipalName(userName)

	fmt.Printf("🔷 Provisioning service principal: %s\n", displayName)

	// Check if application already exists
	existingAppID, existingObjectID, err := s.findApplicationByDisplayName(displayName)
	if err != nil {
		return nil, fmt.Errorf("failed to check for existing application: %w", err)
	}

	var appID, objectID, spObjectID string
	var isExisting bool

	if existingAppID != "" {
		// Application already exists
		fmt.Printf("   ℹ️  Application already exists: %s\n", existingAppID)
		appID = existingAppID
		objectID = existingObjectID
		isExisting = true

		// Get or create service principal for existing app
		spObjectID, err = s.getOrCreateServicePrincipal(appID)
		if err != nil {
			return nil, fmt.Errorf("failed to get service principal: %w", err)
		}
	} else {
		// Create new application
		fmt.Printf("   📱 Creating new application...\n")
		appID, objectID, err = s.createApplication(displayName)
		if err != nil {
			return nil, fmt.Errorf("failed to create application: %w", err)
		}
		fmt.Printf("   📱 Application created: %s (ObjectID: %s)\n", appID, objectID)

		// Create service principal for the application
		spObjectID, err = s.createServicePrincipal(appID)
		if err != nil {
			// Try to clean up the application if service principal creation fails
			_ = s.deleteApplication(objectID)
			return nil, fmt.Errorf("failed to create service principal: %w", err)
		}
		fmt.Printf("   🔑 Service principal created (ObjectID: %s)\n", spObjectID)
	}

	// Always create a new client secret (we can't retrieve existing ones)
	clientSecret, secretID, err := s.addApplicationPassword(objectID, displayName)
	if err != nil {
		if !isExisting {
			// Clean up if this was a new resource
			_ = s.deleteServicePrincipal(spObjectID)
			_ = s.deleteApplication(objectID)
		}
		return nil, fmt.Errorf("failed to create client secret: %w", err)
	}

	fmt.Printf("   🔐 Client secret created\n")

	// Get tenant ID
	tenantID, err := s.getActualTenantID()
	if err != nil {
		return nil, fmt.Errorf("failed to get tenant ID: %w", err)
	}

	// Create identity with credentials
	identity := &Identity{
		UserName:    userName,
		Provider:    "azure",
		Credentials: make(map[string]string),
	}

	// Store Azure-specific fields in Credentials map
	identity.Credentials["client_id"] = appID            // Application (client) ID
	identity.Credentials["client_secret"] = clientSecret // Client secret (works from anywhere!)
	identity.Credentials["tenant_id"] = tenantID         // Tenant ID
	identity.Credentials["object_id"] = spObjectID       // Service principal object ID
	identity.Credentials["app_object_id"] = objectID     // Application object ID
	identity.Credentials["secret_id"] = secretID         // Secret ID for cleanup
	identity.Credentials["subscription_id"] = s.instance.Properties.AzureSubscriptionID
	identity.Credentials["display_name"] = displayName

	if isExisting {
		fmt.Printf("✅ Using existing service principal with new secret: %s\n", userName)
	} else {
		fmt.Printf("✅ Provisioned new service principal: %s\n", userName)
	}
	fmt.Printf("   Client ID: %s\n", identity.Credentials["client_id"])
	fmt.Printf("   Tenant ID: %s\n", identity.Credentials["tenant_id"])
	fmt.Printf("   💡 Client secret can be used from anywhere (not just Azure)\n")

	// Don't cache or wait here - that's handled by ProvisionUserWithAccess
	return identity, nil
}

// setAccessInternal grants an identity access to a specific Azure resource at the specified level
// This is the internal implementation called by ProvisionUserWithAccess
// Note: This does NOT interact with cache - all caching is handled by ProvisionUserWithAccess
func (s *AzureIAMService) setAccessInternal(identity *Identity, serviceID string, level string) (string, error) {
	// Get the role definition ID based on access level
	roleDefinitionID, err := s.getRoleDefinitionForLevel(serviceID, level)
	if err != nil {
		return "", fmt.Errorf("failed to determine role: %w", err)
	}

	// Generate policy document
	policyDoc := fmt.Sprintf(`{"user": "%s", "service": "%s", "level": "%s", "role": "%s"}`, identity.UserName, serviceID, level, roleDefinitionID)

	if roleDefinitionID == "" {
		// "none" level - no role to assign
		return policyDoc, nil
	}

	// Get the service principal object ID from the identity
	objectID := identity.Credentials["object_id"]
	if objectID == "" {
		return "", fmt.Errorf("object_id not found in identity credentials")
	}

	// Parse the scope from serviceID
	scope := s.parseScope(serviceID)

	fmt.Printf("🔐 Granting %s access for service principal %s\n", level, objectID)
	fmt.Printf("   Scope: %s\n", scope)
	fmt.Printf("   Role: %s\n", roleDefinitionID)

	principalType := armauthorization.PrincipalTypeServicePrincipal
	// principalType + retries: new service principals can return PrincipalNotFound until directory replication
	// completes (see https://aka.ms/docs-principaltype).
	roleAssignmentParams := armauthorization.RoleAssignmentCreateParameters{
		Properties: &armauthorization.RoleAssignmentProperties{
			PrincipalID:      &objectID,
			PrincipalType:    &principalType,
			RoleDefinitionID: &roleDefinitionID,
		},
	}

	err = retry.DoVoid(12, 5*time.Second, func() error {
		roleAssignmentName := uuid.New().String()
		_, e := s.authClient.Create(s.ctx, scope, roleAssignmentName, roleAssignmentParams, nil)
		if e == nil {
			return nil
		}
		if strings.Contains(e.Error(), "already exists") || strings.Contains(e.Error(), "RoleAssignmentExists") {
			fmt.Printf("   ℹ️  Role assignment already exists\n")
			return nil
		}
		return e
	}, isAzureRoleAssignmentPrincipalNotYetVisible)
	if err != nil {
		return "", fmt.Errorf("failed to create role assignment: %w", err)
	}

	fmt.Printf("   ✅ Access granted\n")

	// Now validate both credential and RBAC propagation together
	fmt.Printf("   🔄 Validating service principal credentials and RBAC propagation...\n")

	// Step 1: Validate credentials work
	err = s.waitForCredentialPropagation(identity.Credentials["client_id"], identity.Credentials["client_secret"], identity.Credentials["tenant_id"])
	if err != nil {
		return "", fmt.Errorf("service principal credentials failed to propagate: %w", err)
	}

	// Step 2: Validate RBAC has propagated
	err = s.waitForRBACPropagation(objectID, scope, roleDefinitionID)
	if err != nil {
		return "", fmt.Errorf("RBAC propagation validation failed: %w", err)
	}

	fmt.Printf("   ✅ Credentials and RBAC permissions validated and active\n")

	// Don't cache here - that's handled by ProvisionUserWithAccess
	return policyDoc, nil
}

// DestroyUser removes a service principal and all associated resources
func (s *AzureIAMService) DestroyUser(identity *Identity) error {
	displayName := identity.Credentials["display_name"]
	if displayName == "" {
		displayName = identity.UserName
	}

	fmt.Printf("🗑️  Deleting service principal: %s\n", displayName)

	// Step 1: Delete role assignments for this identity
	objectID := identity.Credentials["object_id"]
	if objectID != "" {
		fmt.Printf("   🔍 Looking for role assignments for principal %s...\n", objectID)

		// List role assignments in the subscription (assignedTo('...') is the supported OData form;
		// principalId eq without strict quoting can yield UnsupportedQuery from ARM).
		filter := roleAssignmentFilterAssignedTo(objectID)
		pager := s.authClient.NewListForSubscriptionPager(&armauthorization.RoleAssignmentsClientListForSubscriptionOptions{
			Filter: &filter,
		})

		for pager.More() {
			page, err := pager.NextPage(s.ctx)
			if err != nil {
				fmt.Printf("   ⚠️  Failed to list role assignments: %v\n", err)
				break
			}

			for _, assignment := range page.Value {
				if assignment.Name != nil {
					fmt.Printf("   🗑️  Deleting role assignment %s...\n", *assignment.Name)

					// Extract scope from assignment ID
					scope := extractScopeFromAssignmentID(*assignment.ID)

					_, err := s.authClient.Delete(s.ctx, scope, *assignment.Name, nil)
					if err != nil {
						fmt.Printf("   ⚠️  Failed to delete role assignment: %v\n", err)
					}
				}
			}
		}
	}

	// Step 2: Delete the service principal
	spObjectID := identity.Credentials["object_id"]
	if spObjectID != "" {
		err := s.deleteServicePrincipal(spObjectID)
		if err != nil {
			fmt.Printf("   ⚠️  Failed to delete service principal: %v\n", err)
		} else {
			fmt.Printf("   ✅ Service principal deleted\n")
		}
	}

	// Step 3: Delete the application
	appObjectID := identity.Credentials["app_object_id"]
	if appObjectID != "" {
		err := s.deleteApplication(appObjectID)
		if err != nil {
			fmt.Printf("   ⚠️  Failed to delete application: %v\n", err)
		} else {
			fmt.Printf("   ✅ Application deleted\n")
		}
	}

	fmt.Printf("✅ Service principal cleanup complete\n")
	return nil
}

// Helper functions

// isAzureRoleAssignmentPrincipalNotYetVisible matches transient ARM errors when assigning a role
// to an application/service principal that was just created (directory replication delay).
func isAzureRoleAssignmentPrincipalNotYetVisible(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "principalnotfound") ||
		strings.Contains(msg, "does not exist in the directory")
}

func (s *AzureIAMService) getRoleDefinitionForLevel(serviceID string, level string) (string, error) {
	// Azure built-in role definition IDs
	// Format: /subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/{roleId}

	baseRolePath := fmt.Sprintf("/subscriptions/%s/providers/Microsoft.Authorization/roleDefinitions", s.instance.Properties.AzureSubscriptionID)

	switch level {
	case "none":
		return "", nil
	case "read":
		// Reader role for general read access
		// Storage Blob Data Reader for blob storage
		if strings.Contains(serviceID, "storage") || strings.Contains(serviceID, "blob") {
			return fmt.Sprintf("%s/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1", baseRolePath), nil // Storage Blob Data Reader
		}
		return fmt.Sprintf("%s/acdd72a7-3385-48ef-bd42-f606fba81ae7", baseRolePath), nil // Reader
	case "write":
		// Contributor role for write access
		// Storage Blob Data Contributor for blob storage
		if strings.Contains(serviceID, "storage") || strings.Contains(serviceID, "blob") {
			return fmt.Sprintf("%s/ba92f5b4-2d11-453d-a403-e96b0029c9fe", baseRolePath), nil // Storage Blob Data Contributor
		}
		return fmt.Sprintf("%s/b24988ac-6180-42a0-ab88-20f7382dd24c", baseRolePath), nil // Contributor
	case "admin":
		// Owner role for admin access
		// Storage Blob Data Owner for blob storage
		if strings.Contains(serviceID, "storage") || strings.Contains(serviceID, "blob") {
			return fmt.Sprintf("%s/b7e6dc6d-f1e8-4753-8033-0f276bb0955b", baseRolePath), nil // Storage Blob Data Owner
		}
		return fmt.Sprintf("%s/8e3af657-a8ff-443c-a75c-2fe8c4bcb635", baseRolePath), nil // Owner
	default:
		return "", fmt.Errorf("unsupported access level: %s", level)
	}
}

func (s *AzureIAMService) parseScope(serviceID string) string {
	// If serviceID is already a full resource ID, use it as scope
	if strings.HasPrefix(serviceID, "/subscriptions/") {
		return serviceID
	}

	// If it's a storage account or container reference
	if strings.Contains(serviceID, "storage") {
		// Try to extract storage account name and build resource ID
		// Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{name}
		parts := strings.Split(serviceID, "/")
		if len(parts) > 0 {
			accountName := parts[len(parts)-1]
			return fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Storage/storageAccounts/%s",
				s.instance.Properties.AzureSubscriptionID, s.instance.Properties.AzureResourceGroup, accountName)
		}
	}

	// Default: use resource group scope
	return fmt.Sprintf("/subscriptions/%s/resourceGroups/%s", s.instance.Properties.AzureSubscriptionID, s.instance.Properties.AzureResourceGroup)
}

func extractScopeFromAssignmentID(assignmentID string) string {
	// Assignment ID format: {scope}/providers/Microsoft.Authorization/roleAssignments/{name}
	// Extract scope by removing the role assignment suffix
	parts := strings.Split(assignmentID, "/providers/Microsoft.Authorization/roleAssignments/")
	if len(parts) > 0 {
		return parts[0]
	}
	return assignmentID
}

func sanitizeServicePrincipalName(userName string) string {
	// Service principal display names can be more flexible
	// Just ensure it's a valid display name
	result := userName

	// Add CCC prefix for easy identification
	if !strings.HasPrefix(result, "CCC-") {
		result = "CCC-Test-" + result
	}

	// Ensure maximum length (120 chars is safe)
	if len(result) > 120 {
		result = result[:120]
	}

	return result
}

func toPtr(s string) *string {
	return &s
}

// Fill this later when we are writing tests for IAM
func (s *AzureIAMService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	return []types.TestParams{}, nil
}

func (s *AzureIAMService) CheckUserProvisioned() error {
	// No-op: IAM services don't require additional credential validation
	return nil
}

func (s *AzureIAMService) ElevateAccessForInspection() error {
	// No-op: IAM services don't have network-level access controls to elevate
	return nil
}

// ResetAccess is a no-op for IAM services
func (s *AzureIAMService) ResetAccess() error {
	// No-op: IAM services don't have network-level access controls to reset
	return nil
}

// UpdateResourcePolicy is not applicable for IAM service
func (s *AzureIAMService) UpdateResourcePolicy() error {
	return nil
}

// TriggerDataWrite is not applicable for IAM service
func (s *AzureIAMService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not supported for IAM service")
}

// GetResourceRegion is not applicable for IAM service
func (s *AzureIAMService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not supported for IAM service")
}

// IsDataReplicatedToSeparateLocation is not applicable for IAM service
func (s *AzureIAMService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not supported for IAM service")
}

// GetReplicationStatus is not applicable for IAM service
func (s *AzureIAMService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for IAM service")
}

// TearDown removes all provisioned test users
func (s *AzureIAMService) TearDown() error {
	for userName, identity := range s.provisionedUsers {
		if err := s.DestroyUser(identity); err != nil {
			fmt.Printf("⚠️  Failed to destroy user %s: %v\n", userName, err)
		}
	}
	s.provisionedUsers = make(map[string]*Identity)
	s.accessLevels = make(map[string]string)
	return nil
}

// Microsoft Graph API helper methods

func (s *AzureIAMService) callGraphAPI(method, endpoint string, body interface{}) (map[string]interface{}, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (map[string]interface{}, error) {
		return s.callGraphAPIOnce(method, endpoint, body)
	}, retry.IsAzureGraphAuthorizationDeniedError)
}

func (s *AzureIAMService) callGraphAPIOnce(method, endpoint string, body interface{}) (map[string]interface{}, error) {
	graphURL := "https://graph.microsoft.com/v1.0" + endpoint

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequestWithContext(s.ctx, method, graphURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Get access token for Microsoft Graph
	token, err := s.credential.GetToken(s.ctx, policy.TokenRequestOptions{
		Scopes: []string{"https://graph.microsoft.com/.default"},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("graph API request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return result, nil
}

func (s *AzureIAMService) createApplication(displayName string) (appID, objectID string, err error) {
	requestBody := map[string]interface{}{
		"displayName":    displayName,
		"signInAudience": "AzureADMyOrg",
	}

	result, err := s.callGraphAPI("POST", "/applications", requestBody)
	if err != nil {
		return "", "", err
	}

	appID, _ = result["appId"].(string)
	objectID, _ = result["id"].(string)

	if appID == "" || objectID == "" {
		return "", "", fmt.Errorf("failed to extract application IDs from response")
	}

	return appID, objectID, nil
}

func (s *AzureIAMService) createServicePrincipal(appID string) (objectID string, err error) {
	requestBody := map[string]interface{}{
		"appId": appID,
	}

	result, err := s.callGraphAPI("POST", "/servicePrincipals", requestBody)
	if err != nil {
		return "", err
	}

	objectID, _ = result["id"].(string)
	if objectID == "" {
		return "", fmt.Errorf("failed to extract service principal object ID from response")
	}

	return objectID, nil
}

func (s *AzureIAMService) addApplicationPassword(appObjectID, displayName string) (secret, secretID string, err error) {
	requestBody := map[string]interface{}{
		"passwordCredential": map[string]interface{}{
			"displayName": displayName + "-secret",
		},
	}

	result, err := s.callGraphAPI("POST", "/applications/"+appObjectID+"/addPassword", requestBody)
	if err != nil {
		return "", "", err
	}

	secret, _ = result["secretText"].(string)
	secretID, _ = result["keyId"].(string)

	if secret == "" || secretID == "" {
		return "", "", fmt.Errorf("failed to extract secret from response")
	}

	return secret, secretID, nil
}

func (s *AzureIAMService) deleteServicePrincipal(objectID string) error {
	_, err := s.callGraphAPI("DELETE", "/servicePrincipals/"+objectID, nil)
	return err
}

func (s *AzureIAMService) deleteApplication(objectID string) error {
	_, err := s.callGraphAPI("DELETE", "/applications/"+objectID, nil)
	return err
}

func (s *AzureIAMService) getActualTenantID() (string, error) {
	// Get the organization details to extract tenant ID
	result, err := s.callGraphAPI("GET", "/organization", nil)
	if err != nil {
		return "", err
	}

	// Extract tenant ID from the organization response
	if value, ok := result["value"].([]interface{}); ok && len(value) > 0 {
		if org, ok := value[0].(map[string]interface{}); ok {
			if tenantID, ok := org["id"].(string); ok {
				return tenantID, nil
			}
		}
	}

	return "", fmt.Errorf("failed to extract tenant ID from organization response")
}

func (s *AzureIAMService) findApplicationByDisplayName(displayName string) (appID, objectID string, err error) {
	// Search for applications by display name
	filter := fmt.Sprintf("displayName eq '%s'", displayName)
	endpoint := fmt.Sprintf("/applications?$filter=%s", url.QueryEscape(filter))

	result, err := s.callGraphAPI("GET", endpoint, nil)
	if err != nil {
		return "", "", err
	}

	// Check if any applications were found
	if value, ok := result["value"].([]interface{}); ok && len(value) > 0 {
		if app, ok := value[0].(map[string]interface{}); ok {
			appID, _ = app["appId"].(string)
			objectID, _ = app["id"].(string)

			if appID != "" && objectID != "" {
				return appID, objectID, nil
			}
		}
	}

	// No application found
	return "", "", nil
}

func (s *AzureIAMService) getOrCreateServicePrincipal(appID string) (objectID string, err error) {
	// Try to find existing service principal
	filter := fmt.Sprintf("appId eq '%s'", appID)
	endpoint := fmt.Sprintf("/servicePrincipals?$filter=%s", url.QueryEscape(filter))

	result, err := s.callGraphAPI("GET", endpoint, nil)
	if err != nil {
		return "", err
	}

	// Check if service principal exists
	if value, ok := result["value"].([]interface{}); ok && len(value) > 0 {
		if sp, ok := value[0].(map[string]interface{}); ok {
			objectID, _ = sp["id"].(string)
			if objectID != "" {
				fmt.Printf("   ℹ️  Service principal already exists (ObjectID: %s)\n", objectID)
				return objectID, nil
			}
		}
	}

	// Service principal doesn't exist, create it
	fmt.Printf("   🔑 Creating service principal...\n")
	objectID, err = s.createServicePrincipal(appID)
	if err != nil {
		return "", err
	}

	fmt.Printf("   🔑 Service principal created (ObjectID: %s)\n", objectID)
	return objectID, nil
}

// errRBACNotPropagatedYet is a sentinel returned when the role assignment exists in ARM
// but we haven't confirmed it yet (used for retry predicate).
var errRBACNotPropagatedYet = errors.New("rbac not propagated yet")

// waitForCredentialPropagation validates that the service principal credentials work
// by attempting to acquire a token for Graph API (identity management scope).
// It retries for up to 60 seconds when propagation errors are detected.
func (s *AzureIAMService) waitForCredentialPropagation(clientID, clientSecret, tenantID string) error {
	_, err := retry.Do(12, 5*time.Second, func() (struct{}, error) {
		cred, err := azidentity.NewClientSecretCredential(tenantID, clientID, clientSecret, nil)
		if err != nil {
			return struct{}{}, fmt.Errorf("failed to create credential for validation: %w", err)
		}
		_, err = cred.GetToken(s.ctx, policy.TokenRequestOptions{
			Scopes: []string{"https://graph.microsoft.com/.default"},
		})
		return struct{}{}, err
	}, retry.IsAzureCredentialPropagationError)
	if err != nil {
		return fmt.Errorf("credential validation failed: %w", err)
	}
	fmt.Printf("   ✅ Credentials validated\n")
	return nil
}

// waitForRBACPropagation validates that the role assignment has propagated and is effective
// by verifying the assignment exists. It retries for up to 60 seconds.
func (s *AzureIAMService) waitForRBACPropagation(principalID, scope, roleDefinitionID string) error {
	err := retry.DoVoid(12, 5*time.Second, func() error {
		found, listErr := s.checkRoleAssignmentExists(principalID, scope, roleDefinitionID)
		if listErr != nil {
			return listErr
		}
		if found {
			fmt.Printf("   ✅ RBAC assignment found\n")
			fmt.Printf("   ⏳ Waiting 10s for data plane propagation...\n")
			time.Sleep(10 * time.Second)
			return nil
		}
		return errRBACNotPropagatedYet
	}, func(e error) bool {
		return e != nil
	})
	if err != nil {
		return fmt.Errorf("RBAC validation failed: %w", err)
	}
	return nil
}

// roleAssignmentFilterAssignedTo returns OData for List role assignments by principal (service principal / user).
func roleAssignmentFilterAssignedTo(principalID string) string {
	return fmt.Sprintf("assignedTo('%s')", strings.TrimSpace(principalID))
}

// roleAssignmentFilterAtScopeAndAssignedTo limits results to the requested scope and principal (ARM List for Scope).
func roleAssignmentFilterAtScopeAndAssignedTo(principalID string) string {
	return fmt.Sprintf("atScope() and assignedTo('%s')", strings.TrimSpace(principalID))
}

// checkRoleAssignmentExists lists role assignments and returns true if the expected one exists.
func (s *AzureIAMService) checkRoleAssignmentExists(principalID, scope, roleDefinitionID string) (bool, error) {
	filter := roleAssignmentFilterAtScopeAndAssignedTo(principalID)
	pager := s.authClient.NewListForScopePager(scope, &armauthorization.RoleAssignmentsClientListForScopeOptions{
		Filter: &filter,
	})

	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return false, err
		}

		for _, assignment := range page.Value {
			if assignment.Properties != nil &&
				assignment.Properties.RoleDefinitionID != nil &&
				*assignment.Properties.RoleDefinitionID == roleDefinitionID {
				return true, nil
			}
		}
	}
	return false, nil
}

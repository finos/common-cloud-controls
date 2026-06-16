package elevation

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/authorization/armauthorization/v2"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storage/armstorage"
	"github.com/google/uuid"
)

// AzureStorageElevationState tracks all elevation state for Azure Storage
type AzureStorageElevationState struct {
	// Public Network Access
	OriginalPublicNetworkAccess *armstorage.PublicNetworkAccess
	CurrentPublicNetworkAccess  *armstorage.PublicNetworkAccess

	// Network Firewall Rules
	OriginalNetworkDefaultAction *armstorage.DefaultAction
	CurrentNetworkDefaultAction  *armstorage.DefaultAction

	// RBAC
	GrantedRoleAssignments []string // List of role assignment IDs we created
}

// AzureStorageElevator handles elevation of Azure Storage Account access controls
// It manages both storage-specific network controls and RBAC
type AzureStorageElevator struct {
	ctx            context.Context
	credential     azcore.TokenCredential
	subscriptionID string
	resourceGroup  string
	storageClient  *armstorage.AccountsClient
	authClient     *armauthorization.RoleAssignmentsClient
	state          *AzureStorageElevationState
}

// NewAzureStorageElevator creates a new Azure Storage elevator
func NewAzureStorageElevator(
	ctx context.Context,
	credential azcore.TokenCredential,
	subscriptionID string,
	resourceGroup string,
) (*AzureStorageElevator, error) {
	// Create storage-specific client
	storageClient, err := armstorage.NewAccountsClient(subscriptionID, credential, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage accounts client: %w", err)
	}

	// Create authorization client for RBAC
	authClient, err := armauthorization.NewRoleAssignmentsClient(subscriptionID, credential, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create authorization client: %w", err)
	}

	return &AzureStorageElevator{
		ctx:            ctx,
		credential:     credential,
		subscriptionID: subscriptionID,
		resourceGroup:  resourceGroup,
		storageClient:  storageClient,
		authClient:     authClient,
		state:          &AzureStorageElevationState{},
	}, nil
}

// objectIDFromJWT reads the Entra object id (oid) claim from an Azure access token JWT.
// Avoids Microsoft Graph, which frequently returns 400 for workload / CI tokens lacking Graph permissions.
func objectIDFromJWT(accessToken string) (string, error) {
	parts := strings.Split(accessToken, ".")
	if len(parts) < 2 {
		return "", fmt.Errorf("token is not a JWT")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("decode JWT payload: %w", err)
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", err
	}
	if oid, ok := claims["oid"].(string); ok && oid != "" {
		return oid, nil
	}
	return "", fmt.Errorf("JWT has no oid claim")
}

func (e *AzureStorageElevator) objectIDFromResourceManagerToken() (string, error) {
	token, err := e.credential.GetToken(e.ctx, policy.TokenRequestOptions{
		Scopes: []string{"https://management.azure.com/.default"},
	})
	if err != nil {
		return "", err
	}
	return objectIDFromJWT(token.Token)
}

// GetCurrentIdentityObjectID resolves the current principal's object id (ARM token oid first, then Graph).
func (e *AzureStorageElevator) GetCurrentIdentityObjectID() (string, error) {
	if oid, err := e.objectIDFromResourceManagerToken(); err == nil {
		return oid, nil
	}

	// Get a token for Graph API
	token, err := e.credential.GetToken(e.ctx, policy.TokenRequestOptions{
		Scopes: []string{"https://graph.microsoft.com/.default"},
	})
	if err != nil {
		return "", fmt.Errorf("failed to get Graph API token: %w", err)
	}

	// Try /me first (works for users)
	req, err := http.NewRequestWithContext(e.ctx, "GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.Token)

	resp, err := http.DefaultClient.Do(req)

	// If /me fails, it might be a service principal (standard for CI/GitHub Actions)
	if err == nil && resp.StatusCode != 200 {
		resp.Body.Close()

		// Map common environment variables for client ID
		clientID := os.Getenv("AZURE_CLIENT_ID")
		if clientID == "" {
			clientID = os.Getenv("ARM_CLIENT_ID")
		}

		if clientID != "" {
			fmt.Printf("   ℹ️  /me failed, searching for service principal ID for client %s...\n", clientID)
			query := fmt.Sprintf("https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '%s'", clientID)
			req, _ = http.NewRequestWithContext(e.ctx, "GET", query, nil)
			req.Header.Set("Authorization", "Bearer "+token.Token)
			resp, err = http.DefaultClient.Do(req)
		}
	}

	if err != nil {
		return "", fmt.Errorf("failed to call Graph API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("graph API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode Graph API response: %w", err)
	}

	// If it's a list (from servicePrincipals query)
	if value, ok := result["value"].([]interface{}); ok && len(value) > 0 {
		if first, ok := value[0].(map[string]interface{}); ok {
			if id, ok := first["id"].(string); ok {
				return id, nil
			}
		}
	}

	// If it's a direct object (from /me query)
	if objectID, ok := result["id"].(string); ok {
		return objectID, nil
	}

	return "", fmt.Errorf("object ID not found in Graph API response")
}

// ElevatePublicNetworkAccess enables public network access on a storage account
func (e *AzureStorageElevator) ElevatePublicNetworkAccess(storageAccountName string) error {
	resp, err := e.storageClient.GetProperties(e.ctx, e.resourceGroup, storageAccountName, nil)
	if err != nil {
		return fmt.Errorf("failed to get storage account properties: %w", err)
	}

	if resp.Properties == nil || resp.Properties.PublicNetworkAccess == nil {
		fmt.Printf("   ⚠️  Public network access property not found\n")
		return nil
	}

	// Store original value on first call
	if e.state.OriginalPublicNetworkAccess == nil {
		e.state.OriginalPublicNetworkAccess = resp.Properties.PublicNetworkAccess
		fmt.Printf("   📝 Original public network access: %s\n", *e.state.OriginalPublicNetworkAccess)
	}

	// Check if already enabled
	if *resp.Properties.PublicNetworkAccess == armstorage.PublicNetworkAccessEnabled {
		e.state.CurrentPublicNetworkAccess = resp.Properties.PublicNetworkAccess
		fmt.Printf("   ✅ Public network access already enabled\n")
		return nil
	}

	// Enable it
	fmt.Printf("   🔓 Enabling public network access...\n")
	enabled := armstorage.PublicNetworkAccessEnabled
	updateParams := armstorage.AccountUpdateParameters{
		Properties: &armstorage.AccountPropertiesUpdateParameters{
			PublicNetworkAccess: &enabled,
		},
	}

	_, err = e.storageClient.Update(e.ctx, e.resourceGroup, storageAccountName, updateParams, nil)
	if err != nil {
		return fmt.Errorf("failed to enable public network access: %w", err)
	}

	e.state.CurrentPublicNetworkAccess = &enabled
	fmt.Printf("   ✅ Public network access enabled\n")
	return nil
}

// ResetPublicNetworkAccess restores the original public network access setting
func (e *AzureStorageElevator) ResetPublicNetworkAccess(storageAccountName string) error {
	if e.state.OriginalPublicNetworkAccess == nil {
		fmt.Printf("   ℹ️  No original public network access stored\n")
		return nil
	}

	// Check current value before attempting to change
	if e.state.CurrentPublicNetworkAccess != nil &&
		*e.state.CurrentPublicNetworkAccess == *e.state.OriginalPublicNetworkAccess {
		fmt.Printf("   ✅ Public network access already at original value\n")
		return nil
	}

	resp, err := e.storageClient.GetProperties(e.ctx, e.resourceGroup, storageAccountName, nil)
	if err != nil {
		return fmt.Errorf("failed to get storage account properties: %w", err)
	}

	if resp.Properties == nil || resp.Properties.PublicNetworkAccess == nil {
		return nil
	}

	// Double-check current value
	if *resp.Properties.PublicNetworkAccess == *e.state.OriginalPublicNetworkAccess {
		fmt.Printf("   ✅ Public network access already at original value\n")
		e.state.CurrentPublicNetworkAccess = e.state.OriginalPublicNetworkAccess
		return nil
	}

	// Restore original
	fmt.Printf("   🔒 Restoring public network access to %s...\n", *e.state.OriginalPublicNetworkAccess)
	updateParams := armstorage.AccountUpdateParameters{
		Properties: &armstorage.AccountPropertiesUpdateParameters{
			PublicNetworkAccess: e.state.OriginalPublicNetworkAccess,
		},
	}

	_, err = e.storageClient.Update(e.ctx, e.resourceGroup, storageAccountName, updateParams, nil)
	if err != nil {
		return fmt.Errorf("failed to restore public network access: %w", err)
	}

	e.state.CurrentPublicNetworkAccess = e.state.OriginalPublicNetworkAccess
	fmt.Printf("   ✅ Public network access restored\n")
	return nil
}

// ElevateNetworkFirewall changes the network firewall default action to Allow
func (e *AzureStorageElevator) ElevateNetworkFirewall(storageAccountName string) error {
	resp, err := e.storageClient.GetProperties(e.ctx, e.resourceGroup, storageAccountName, nil)
	if err != nil {
		return fmt.Errorf("failed to get storage account properties: %w", err)
	}

	if resp.Properties == nil || resp.Properties.NetworkRuleSet == nil || resp.Properties.NetworkRuleSet.DefaultAction == nil {
		fmt.Printf("   ⚠️  Network rule set not found\n")
		return nil
	}

	// Store original value on first call
	if e.state.OriginalNetworkDefaultAction == nil {
		e.state.OriginalNetworkDefaultAction = resp.Properties.NetworkRuleSet.DefaultAction
		fmt.Printf("   📝 Original network firewall default action: %s\n", *e.state.OriginalNetworkDefaultAction)
	}

	// Check if already set to Allow
	if *resp.Properties.NetworkRuleSet.DefaultAction == armstorage.DefaultActionAllow {
		e.state.CurrentNetworkDefaultAction = resp.Properties.NetworkRuleSet.DefaultAction
		fmt.Printf("   ✅ Network firewall already set to Allow\n")
		return nil
	}

	// Change to Allow
	fmt.Printf("   🔓 Changing network firewall to Allow...\n")
	allowAction := armstorage.DefaultActionAllow
	updateParams := armstorage.AccountUpdateParameters{
		Properties: &armstorage.AccountPropertiesUpdateParameters{
			NetworkRuleSet: &armstorage.NetworkRuleSet{
				DefaultAction: &allowAction,
			},
		},
	}

	_, err = e.storageClient.Update(e.ctx, e.resourceGroup, storageAccountName, updateParams, nil)
	if err != nil {
		return fmt.Errorf("failed to update network firewall: %w", err)
	}

	e.state.CurrentNetworkDefaultAction = &allowAction
	fmt.Printf("   ✅ Network firewall changed to Allow\n")
	return nil
}

// ResetNetworkFirewall restores the original network firewall setting
func (e *AzureStorageElevator) ResetNetworkFirewall(storageAccountName string) error {
	if e.state.OriginalNetworkDefaultAction == nil {
		fmt.Printf("   ℹ️  No original network firewall setting stored\n")
		return nil
	}

	// Check current value before attempting to change
	if e.state.CurrentNetworkDefaultAction != nil &&
		*e.state.CurrentNetworkDefaultAction == *e.state.OriginalNetworkDefaultAction {
		fmt.Printf("   ✅ Network firewall already at original value\n")
		return nil
	}

	resp, err := e.storageClient.GetProperties(e.ctx, e.resourceGroup, storageAccountName, nil)
	if err != nil {
		return fmt.Errorf("failed to get storage account properties: %w", err)
	}

	if resp.Properties == nil || resp.Properties.NetworkRuleSet == nil || resp.Properties.NetworkRuleSet.DefaultAction == nil {
		return nil
	}

	// Double-check current value
	if *resp.Properties.NetworkRuleSet.DefaultAction == *e.state.OriginalNetworkDefaultAction {
		fmt.Printf("   ✅ Network firewall already at original value\n")
		e.state.CurrentNetworkDefaultAction = e.state.OriginalNetworkDefaultAction
		return nil
	}

	// Restore original
	fmt.Printf("   🔒 Restoring network firewall to %s...\n", *e.state.OriginalNetworkDefaultAction)
	updateParams := armstorage.AccountUpdateParameters{
		Properties: &armstorage.AccountPropertiesUpdateParameters{
			NetworkRuleSet: &armstorage.NetworkRuleSet{
				DefaultAction: e.state.OriginalNetworkDefaultAction,
			},
		},
	}

	_, err = e.storageClient.Update(e.ctx, e.resourceGroup, storageAccountName, updateParams, nil)
	if err != nil {
		return fmt.Errorf("failed to restore network firewall: %w", err)
	}

	e.state.CurrentNetworkDefaultAction = e.state.OriginalNetworkDefaultAction
	fmt.Printf("   ✅ Network firewall restored\n")
	return nil
}

// GrantRBAC grants an RBAC role to a principal on a resource
func (e *AzureStorageElevator) GrantRBAC(resourceID string, principalID string, roleDefinitionID string) error {
	// Check if role assignment already exists
	filter := "atScope()"
	pager := e.authClient.NewListForScopePager(resourceID, &armauthorization.RoleAssignmentsClientListForScopeOptions{
		Filter: &filter,
	})

	// Check if already assigned
	for pager.More() {
		page, err := pager.NextPage(e.ctx)
		if err != nil {
			fmt.Printf("   ⚠️  Warning: Failed to check existing role assignments: %v\n", err)
			break
		}

		for _, assignment := range page.Value {
			if assignment.Properties != nil {
				matchesPrincipal := assignment.Properties.PrincipalID != nil && *assignment.Properties.PrincipalID == principalID
				matchesRole := assignment.Properties.RoleDefinitionID != nil && *assignment.Properties.RoleDefinitionID == roleDefinitionID

				if matchesPrincipal && matchesRole {
					fmt.Printf("   ✅ RBAC role already assigned\n")
					return nil
				}
			}
		}
	}

	// Create role assignment
	fmt.Printf("   🔐 Assigning RBAC role...\n")
	roleAssignmentName := uuid.New().String()
	roleAssignmentParams := armauthorization.RoleAssignmentCreateParameters{
		Properties: &armauthorization.RoleAssignmentProperties{
			PrincipalID:      &principalID,
			RoleDefinitionID: &roleDefinitionID,
		},
	}

	assignment, err := e.authClient.Create(e.ctx, resourceID, roleAssignmentName, roleAssignmentParams, nil)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "RoleAssignmentExists") {
			fmt.Printf("   ✅ Role assignment already exists\n")
			return nil
		}
		return fmt.Errorf("failed to create role assignment: %w", err)
	}

	// Store the assignment ID for cleanup
	if assignment.ID != nil {
		e.state.GrantedRoleAssignments = append(e.state.GrantedRoleAssignments, *assignment.ID)
		fmt.Printf("   ✅ RBAC role assigned\n")
	}

	return nil
}

// ResetRBAC removes all RBAC role assignments that were granted
func (e *AzureStorageElevator) ResetRBAC() error {
	if len(e.state.GrantedRoleAssignments) == 0 {
		fmt.Printf("   ℹ️  No RBAC role assignments to remove\n")
		return nil
	}

	fmt.Printf("   🔓 Removing %d granted RBAC role assignment(s)...\n", len(e.state.GrantedRoleAssignments))

	for _, assignmentID := range e.state.GrantedRoleAssignments {
		_, err := e.authClient.DeleteByID(e.ctx, assignmentID, nil)
		if err != nil {
			fmt.Printf("   ⚠️  Warning: Failed to remove role assignment %s: %v\n", assignmentID, err)
		} else {
			fmt.Printf("   ✅ Removed role assignment\n")
		}
	}

	e.state.GrantedRoleAssignments = []string{}
	return nil
}

// ElevateStorageAccountAccess performs all elevation steps for a storage account
// This includes: public network access, firewall rules, and RBAC for the current identity
func (e *AzureStorageElevator) ElevateStorageAccountAccess(storageAccountName string) error {
	fmt.Printf("🔍 Elevating access for storage account %s...\n", storageAccountName)

	// Step 1: Enable public network access
	if err := e.ElevatePublicNetworkAccess(storageAccountName); err != nil {
		fmt.Printf("⚠️  Warning: Failed to elevate public network access: %v\n", err)
		// Continue - might already be enabled
	}

	// Step 2: Change network firewall default action to Allow
	if err := e.ElevateNetworkFirewall(storageAccountName); err != nil {
		fmt.Printf("⚠️  Warning: Failed to elevate network firewall: %v\n", err)
		// Continue - might already be Allow
	}

	// Step 3: Grant Storage Blob Data Contributor role to current identity
	storageAccountResourceID := fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Storage/storageAccounts/%s",
		e.subscriptionID,
		e.resourceGroup,
		storageAccountName)

	roleDefinitionID := fmt.Sprintf("/subscriptions/%s/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
		e.subscriptionID)

	principalID, err := e.GetCurrentIdentityObjectID()
	if err != nil {
		fmt.Printf("⚠️  Warning: Could not determine current identity object ID: %v\n", err)
		fmt.Printf("   Tests may fail if RBAC permissions are not already granted\n")
		return nil
	}

	if err := e.GrantRBAC(storageAccountResourceID, principalID, roleDefinitionID); err != nil {
		fmt.Printf("⚠️  Warning: Failed to grant RBAC role: %v\n", err)
		fmt.Printf("   Tests may fail if RBAC permissions are not already granted\n")
	}

	fmt.Printf("✅ Access elevation complete\n")
	fmt.Printf("   Note: If you still see 403 errors, changes may need more time to propagate (up to 5 minutes)\n")

	return nil
}

// ResetStorageAccountAccess resets all elevation changes for a storage account
func (e *AzureStorageElevator) ResetStorageAccountAccess(storageAccountName string) error {
	fmt.Printf("🔒 Resetting access for %s...\n", storageAccountName)

	// Step 1: Remove RBAC role assignments
	if err := e.ResetRBAC(); err != nil {
		fmt.Printf("⚠️  Warning: Failed to remove RBAC role: %v\n", err)
	}

	// Step 2: Restore network firewall
	if err := e.ResetNetworkFirewall(storageAccountName); err != nil {
		fmt.Printf("⚠️  Warning: Failed to reset network firewall: %v\n", err)
	}

	// Step 3: Restore public network access
	if err := e.ResetPublicNetworkAccess(storageAccountName); err != nil {
		fmt.Printf("⚠️  Warning: Failed to reset public network access: %v\n", err)
	}

	fmt.Printf("✅ Access reset complete\n")
	return nil
}

// GetState returns the current elevation state
func (e *AzureStorageElevator) GetState() *AzureStorageElevationState {
	return e.state
}

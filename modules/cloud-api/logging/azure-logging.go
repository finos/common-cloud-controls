package logging

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/azquery"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/operationalinsights/armoperationalinsights"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/generic/retry"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AzureLoggingService implements Service for Azure Monitor/Log Analytics
type AzureLoggingService struct {
	activityLogsClient       *armmonitor.ActivityLogsClient
	logsClient               *azquery.LogsClient
	workspacesClient         *armoperationalinsights.WorkspacesClient
	diagnosticSettingsClient *armmonitor.DiagnosticSettingsClient
	credential               azcore.TokenCredential
	ctx                      context.Context
	instance                 types.InstanceConfig
	workspaceIDCache         string
	workspaceIDInit          sync.Once
	workspaceIDInitErr       error
}

// NewAzureLoggingService creates a new Azure logging service using default credential chain
func NewAzureLoggingService(ctx context.Context, instance *types.InstanceConfig) (*AzureLoggingService, error) {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, err
	}

	activityLogsClient, err := armmonitor.NewActivityLogsClient(instance.CloudParams().AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, err
	}

	logsClient, err := azquery.NewLogsClient(cred, nil)
	if err != nil {
		return nil, err
	}

	workspacesClient, err := armoperationalinsights.NewWorkspacesClient(instance.CloudParams().AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, err
	}

	diagnosticSettingsClient, err := armmonitor.NewDiagnosticSettingsClient(cred, nil)
	if err != nil {
		return nil, err
	}

	return &AzureLoggingService{
		activityLogsClient:       activityLogsClient,
		logsClient:               logsClient,
		workspacesClient:         workspacesClient,
		diagnosticSettingsClient: diagnosticSettingsClient,
		credential:               cred,
		ctx:                      ctx,
		instance:                 *instance,
	}, nil
}

// GetOrProvisionTestableResources returns testable resources for the logging service
func (s *AzureLoggingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resourceName := "azure-monitor"
	return []types.TestParams{
		{
			ServiceType:         "logging",
			ProviderServiceType: "azure-monitor",
			CatalogTypes:        []string{"CCC.Core"},
			TagFilter:           []string{"@logging", "@PerService"},
			ResourceName:        resourceName,
			UID:                 resourceName,
			ReportFile:          "azure-monitor",
			ReportTitle:         "Azure Monitor",
			Instance:            s.instance,
		},
	}, nil
}

// CheckUserProvisioned validates that the service's identity is properly provisioned
func (s *AzureLoggingService) CheckUserProvisioned() error {
	return nil
}

// ElevateAccessForInspection temporarily elevates access permissions
func (s *AzureLoggingService) ElevateAccessForInspection() error {
	return nil
}

// ResetAccess restores the original access permissions
func (s *AzureLoggingService) ResetAccess() error {
	return nil
}

// UpdateResourcePolicy is not applicable for logging service
func (s *AzureLoggingService) UpdateResourcePolicy() error {
	return nil
}

// TriggerDataWrite is not applicable for logging service
func (s *AzureLoggingService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not supported for logging service")
}

// GetResourceRegion is not applicable for logging service
func (s *AzureLoggingService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}

// IsDataReplicatedToSeparateLocation is not applicable for logging service
func (s *AzureLoggingService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}

// GetReplicationStatus is not applicable for logging service
func (s *AzureLoggingService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for logging service")
}

// TearDown is a no-op for logging service (does not create resources)
func (s *AzureLoggingService) TearDown() error {
	return nil
}

// QueryAdminLogs queries Azure Activity Log for admin events
func (s *AzureLoggingService) QueryAdminLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]LogEntry, error) {
		return s.queryAdminLogs(resourceID, lookbackMinutes)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureLoggingService) queryAdminLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	startTime := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute)
	endTime := time.Now()

	// Build the filter for Activity Log query
	// Filter by time range and resource group (storage account operations are logged at resource group level)
	filter := fmt.Sprintf("eventTimestamp ge '%s' and eventTimestamp le '%s' and resourceGroupName eq '%s'",
		startTime.UTC().Format(time.RFC3339),
		endTime.UTC().Format(time.RFC3339),
		s.instance.CloudParams().AzureResourceGroup)

	pager := s.activityLogsClient.NewListPager(filter, nil)

	var entries []LogEntry
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to get activity log page: %w", err)
		}

		for _, event := range page.Value {
			entry := LogEntry{
				Timestamp: azureGetTime(event.EventTimestamp),
				Resource:  azureGetString(event.ResourceID),
			}
			if event.OperationName != nil {
				entry.Action = azureGetString(event.OperationName.LocalizedValue)
			}
			if event.Status != nil {
				entry.Result = azureGetString(event.Status.LocalizedValue)
			}
			if event.Caller != nil {
				entry.Identity = *event.Caller
			}
			entries = append(entries, entry)
		}
	}

	return entries, nil
}

// QueryDataWriteLogs queries Azure Log Analytics for storage write events
// Note: Requires Diagnostic Settings configured to send StorageWrite logs to a Log Analytics workspace
func (s *AzureLoggingService) QueryDataWriteLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]LogEntry, error) {
		return s.queryStorageLogs(resourceID, lookbackMinutes, "StorageWrite")
	}, retry.IsAzureRBACPropagationError)
}

// QueryDataReadLogs queries Azure Log Analytics for storage read events
// Note: Requires Diagnostic Settings configured to send StorageRead logs to a Log Analytics workspace
func (s *AzureLoggingService) QueryDataReadLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]LogEntry, error) {
		return s.queryStorageLogs(resourceID, lookbackMinutes, "StorageRead")
	}, retry.IsAzureRBACPropagationError)
}

// getOrDiscoverWorkspaceID returns the Log Analytics workspace ID (CustomerID).
// Discovery order: 1) workspace from
// storage account diagnostic settings (where logs are actually sent); 2) first
// workspace in the instance's resource group.
func (s *AzureLoggingService) getOrDiscoverWorkspaceID() (string, error) {
	s.workspaceIDInit.Do(func() {
		cp := s.instance.CloudParams()
		rg := cp.AzureResourceGroup
		if rg == "" {
			s.workspaceIDInitErr = fmt.Errorf("Azure resource group is empty")
			return
		}
		// Try to get workspace from diagnostic settings on the storage account's blob service.
		// This matches where the policy says logs are sent; workspace may be in a different RG.
		storageAccount := serviceParamString(s.instance.ServiceProperties("object-storage"), "azure-storage-account")
		if storageAccount != "" && cp.AzureSubscriptionID != "" {
			blobServiceURI := fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Storage/storageAccounts/%s/blobServices/default",
				cp.AzureSubscriptionID, rg, storageAccount)
			if customerID := s.workspaceFromDiagnosticSettings(blobServiceURI); customerID != "" {
				s.workspaceIDCache = customerID
				return
			}
		}
		// Fallback: first workspace in the instance's resource group.
		pager := s.workspacesClient.NewListByResourceGroupPager(rg, nil)
		for pager.More() {
			page, err := pager.NextPage(s.ctx)
			if err != nil {
				s.workspaceIDInitErr = fmt.Errorf("failed to list Log Analytics workspaces: %w", err)
				return
			}
			if len(page.Value) == 0 {
				continue
			}
			w := page.Value[0]
			if w.Properties != nil && w.Properties.CustomerID != nil {
				s.workspaceIDCache = *w.Properties.CustomerID
				return
			}
			break
		}
		if s.workspaceIDCache == "" {
			s.workspaceIDInitErr = fmt.Errorf("ensure logs go to Log Analytics in resource group %s", rg)
		}
	})
	if s.workspaceIDInitErr != nil {
		return "", s.workspaceIDInitErr
	}
	return s.workspaceIDCache, nil
}

// workspaceFromDiagnosticSettings lists diagnostic settings for the resource and returns
// the CustomerID of the first workspace destination found, or "" if none.
func (s *AzureLoggingService) workspaceFromDiagnosticSettings(resourceURI string) string {
	pager := s.diagnosticSettingsClient.NewListPager(resourceURI, nil)
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return ""
		}
		for _, ds := range page.Value {
			if ds.Properties == nil || ds.Properties.WorkspaceID == nil || *ds.Properties.WorkspaceID == "" {
				continue
			}
			workspaceARMID := *ds.Properties.WorkspaceID
			customerID, err := s.customerIDFromWorkspaceARMID(workspaceARMID)
			if err == nil && customerID != "" {
				return customerID
			}
		}
	}
	return ""
}

// customerIDFromWorkspaceARMID parses an ARM resource ID and fetches the workspace CustomerID.
// Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{name}
func (s *AzureLoggingService) customerIDFromWorkspaceARMID(armID string) (string, error) {
	parts := strings.Split(strings.Trim(armID, "/"), "/")
	var resourceGroup, workspaceName string
	for i := 0; i < len(parts)-1; i++ {
		if parts[i] == "resourceGroups" && i+1 < len(parts) {
			resourceGroup = parts[i+1]
		}
		if parts[i] == "workspaces" && i+1 < len(parts) {
			workspaceName = parts[i+1]
			break
		}
	}
	if resourceGroup == "" || workspaceName == "" {
		return "", fmt.Errorf("invalid workspace ARM ID: %s", armID)
	}
	w, err := s.workspacesClient.Get(s.ctx, resourceGroup, workspaceName, nil)
	if err != nil {
		return "", err
	}
	if w.Properties == nil || w.Properties.CustomerID == nil {
		return "", fmt.Errorf("workspace has no CustomerID")
	}
	return *w.Properties.CustomerID, nil
}

func (s *AzureLoggingService) queryStorageLogs(resourceID string, lookbackMinutes int, category string) ([]LogEntry, error) {
	workspaceID, err := s.getOrDiscoverWorkspaceID()
	if err != nil {
		return nil, err
	}
	if workspaceID == "" {
		return []LogEntry{}, nil
	}

	storageAccount := serviceParamString(s.instance.ServiceProperties("object-storage"), "azure-storage-account")

	kql := fmt.Sprintf(`StorageBlobLogs
| where TimeGenerated >= ago(%dm)
| where Category == '%s'
| where AccountName == '%s'
| project TimeGenerated, CallerIpAddress, AuthenticationType, OperationName, StatusText, Uri
| order by TimeGenerated desc`,
		lookbackMinutes, category, storageAccount)

	query := azquery.Body{Query: &kql}
	resp, err := s.logsClient.QueryWorkspace(s.ctx, workspaceID, query, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to query Log Analytics workspace: %w", err)
	}

	var entries []LogEntry
	for _, table := range resp.Tables {
		colIdx := map[string]int{}
		for i, col := range table.Columns {
			if col.Name != nil {
				colIdx[*col.Name] = i
			}
		}
		for _, row := range table.Rows {
			entry := LogEntry{}
			if i, ok := colIdx["CallerIpAddress"]; ok && i < len(row) && row[i] != nil {
				entry.Identity = fmt.Sprintf("%v", row[i])
			}
			if i, ok := colIdx["OperationName"]; ok && i < len(row) && row[i] != nil {
				entry.Action = fmt.Sprintf("%v", row[i])
			}
			if i, ok := colIdx["TimeGenerated"]; ok && i < len(row) && row[i] != nil {
				if t, err := time.Parse(time.RFC3339, fmt.Sprintf("%v", row[i])); err == nil {
					entry.Timestamp = t
				}
			}
			if i, ok := colIdx["Uri"]; ok && i < len(row) && row[i] != nil {
				entry.Resource = fmt.Sprintf("%v", row[i])
			}
			if i, ok := colIdx["StatusText"]; ok && i < len(row) && row[i] != nil {
				entry.Result = fmt.Sprintf("%v", row[i])
			}
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

func azureGetString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func azureGetTime(t *time.Time) time.Time {
	if t == nil {
		return time.Now()
	}
	return *t
}

package logging

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/azquery"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Compile-time assertion that AzureLoggingService satisfies the Service contract.
var _ Service = (*AzureLoggingService)(nil)

// AzureLoggingService implements Service for Azure Monitor (Activity Log) and
// Log Analytics (data-plane diagnostics + Traffic-Analytics flow logs). All
// sink coordinates come from the privateer config — no discovery.
type AzureLoggingService struct {
	activityLogsClient *armmonitor.ActivityLogsClient
	logsClient         *azquery.LogsClient
	credential         azcore.TokenCredential
	ctx                context.Context
	config             types.Config
}

// NewAzureLoggingService creates a new Azure logging service using default credential chain
func NewAzureLoggingService(ctx context.Context, config types.Config) (*AzureLoggingService, error) {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, err
	}

	activityLogsClient, err := armmonitor.NewActivityLogsClient(config.CloudParams().AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, err
	}

	logsClient, err := azquery.NewLogsClient(cred, nil)
	if err != nil {
		return nil, err
	}

	return &AzureLoggingService{
		activityLogsClient: activityLogsClient,
		logsClient:         logsClient,
		credential:         cred,
		ctx:                ctx,
		config:             config,
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
			Config:              s.config,
		},
	}, nil
}

func (s *AzureLoggingService) CheckUserProvisioned() error       { return nil }
func (s *AzureLoggingService) ElevateAccessForInspection() error { return nil }
func (s *AzureLoggingService) ResetAccess() error                { return nil }
func (s *AzureLoggingService) UpdateResourcePolicy() error       { return nil }
func (s *AzureLoggingService) TriggerDataWrite(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *AzureLoggingService) TriggerDataRead(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *AzureLoggingService) GetResourceRegion(_ string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}
func (s *AzureLoggingService) IsDataReplicatedToSeparateLocation(_ string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}
func (s *AzureLoggingService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for logging service")
}
func (s *AzureLoggingService) TearDown() error { return nil }
func (s *AzureLoggingService) Start(string) error                { return nil }
func (s *AzureLoggingService) Stop(string) error                 { return nil }
func (s *AzureLoggingService) StartedDetails() ([]generic.StartedResource, error) { return nil, nil }

// QueryLogs dispatches on logType. admin reads Azure Activity Log (filtered by
// the resource group from cloud params). data-write / data-read / flow read
// from the Log Analytics workspace configured at
// logging.azure-log-analytics-workspace-id.
func (s *AzureLoggingService) QueryLogs(resourceID, logType string, lookbackMinutes int) ([]LogEntry, error) {
	switch logType {
	case LogTypeAdmin:
		return s.queryActivityLog(resourceID, lookbackMinutes)
	case LogTypeDataWrite:
		if s.kubernetesAuditTarget(resourceID) {
			return s.queryKubernetesAuditLogs(resourceID, lookbackMinutes, "write")
		}
		return s.queryStorageLogs(resourceID, lookbackMinutes, "StorageWrite")
	case LogTypeDataRead:
		if s.kubernetesAuditTarget(resourceID) {
			return s.queryKubernetesAuditLogs(resourceID, lookbackMinutes, "read")
		}
		return s.queryStorageLogs(resourceID, lookbackMinutes, "StorageRead")
	case LogTypeFlow:
		return s.queryFlowLogs(resourceID, lookbackMinutes)
	default:
		return nil, fmt.Errorf("Azure logging service does not support log type %q", logType)
	}
}

// queryActivityLog returns Activity Log records for the resource group from
// cloud params. resourceID is matched client-side against the event's ResourceID
// (substring) when non-empty.
func (s *AzureLoggingService) queryActivityLog(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	rg := s.config.CloudParams().AzureResourceGroup
	if rg == "" {
		return nil, fmt.Errorf("azure-resource-group is required to query admin logs but is not set in config")
	}

	startTime := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute)
	endTime := time.Now()
	filter := fmt.Sprintf("eventTimestamp ge '%s' and eventTimestamp le '%s' and resourceGroupName eq '%s'",
		startTime.UTC().Format(time.RFC3339),
		endTime.UTC().Format(time.RFC3339),
		rg)

	pager := s.activityLogsClient.NewListPager(filter, nil)
	entries := make([]LogEntry, 0)
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("activity log query: %w", err)
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
				entry.Result = normalizeAzureResult(azureGetString(event.Status.LocalizedValue), azureGetString(event.Status.Value))
			}
			if event.Caller != nil {
				entry.Identity = *event.Caller
			}
			if resourceID != "" && entry.Resource != "" {
				if !strings.Contains(strings.ToLower(entry.Resource), strings.ToLower(resourceID)) {
					continue
				}
			}
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

// queryStorageLogs runs a KQL query against the configured Log Analytics
// workspace. Table defaults to StorageBlobLogs but can be overridden via
// azure-storage-log-table. The KQL filter on AccountName uses the resourceID
// argument; when empty it falls back to azure-storage-account from config.
func (s *AzureLoggingService) queryStorageLogs(resourceID string, lookbackMinutes int, category string) ([]LogEntry, error) {
	cfg := s.config.LoggingConfig()
	workspaceID := cfg.AzureLogAnalyticsWorkspaceID
	if workspaceID == "" {
		return nil, fmt.Errorf("azure-log-analytics-workspace-id is required to query data logs but is not set in config")
	}

	accountName := resourceID
	if accountName == "" {
		accountName = cfg.AzureStorageAccountName
	}
	if accountName == "" {
		return nil, fmt.Errorf("storage account name is required (pass via resourceID or set azure-storage-account)")
	}

	table := cfg.AzureStorageLogTable
	if table == "" {
		table = "StorageBlobLogs"
	}

	kql := fmt.Sprintf(`%s
| where TimeGenerated >= ago(%dm)
| where Category == '%s'
| where AccountName == '%s'
| project TimeGenerated, CallerIpAddress, OperationName, StatusText, Uri
| order by TimeGenerated desc`,
		table, lookbackMinutes, category, accountName)

	return s.runKQL(workspaceID, kql)
}

// queryFlowLogs runs a KQL query against the Traffic-Analytics flow log table.
// Defaults to AzureNetworkAnalytics_CL (legacy Traffic Analytics schema);
// override via azure-flow-log-table for the newer NTANetAnalytics schema or a
// custom table. resourceID is applied as a substring match on FlowType_s when
// non-empty (best-effort given the variable schemas).
func (s *AzureLoggingService) queryFlowLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	cfg := s.config.LoggingConfig()
	workspaceID := cfg.AzureLogAnalyticsWorkspaceID
	if workspaceID == "" {
		return nil, fmt.Errorf("azure-log-analytics-workspace-id is required to query flow logs but is not set in config")
	}

	table := cfg.AzureFlowLogTable
	if table == "" {
		table = "AzureNetworkAnalytics_CL"
	}

	resourceFilter := ""
	if resourceID != "" {
		resourceFilter = fmt.Sprintf("\n| where TargetResourceID_s contains '%s' or SrcIP_s == '%s' or DestIP_s == '%s'",
			resourceID, resourceID, resourceID)
	}

	kql := fmt.Sprintf(`%s
| where TimeGenerated >= ago(%dm)%s
| order by TimeGenerated desc`, table, lookbackMinutes, resourceFilter)

	return s.runKQL(workspaceID, kql)
}

// runKQL executes a KQL query and flattens the response into LogEntry rows.
// Standard identity-shape columns (CallerIpAddress, OperationName, etc.) are
// mapped onto LogEntry fields; everything else is preserved verbatim in Fields.
func (s *AzureLoggingService) runKQL(workspaceID, kql string) ([]LogEntry, error) {
	query := azquery.Body{Query: &kql}
	resp, err := s.logsClient.QueryWorkspace(s.ctx, workspaceID, query, nil)
	if err != nil {
		return nil, fmt.Errorf("Log Analytics workspace query: %w", err)
	}

	entries := make([]LogEntry, 0)
	for _, table := range resp.Tables {
		colIdx := map[string]int{}
		for i, col := range table.Columns {
			if col.Name != nil {
				colIdx[*col.Name] = i
			}
		}
		for _, row := range table.Rows {
			entry := LogEntry{Fields: map[string]string{}}
			for name, i := range colIdx {
				if i >= len(row) || row[i] == nil {
					continue
				}
				value := fmt.Sprintf("%v", row[i])
				entry.Fields[name] = value
				switch name {
				case "CallerIpAddress":
					entry.Identity = value
				case "OperationName":
					entry.Action = value
				case "Uri", "TargetResourceID_s":
					entry.Resource = value
				case "StatusText":
					entry.Result = value
				case "TimeGenerated":
					if t, err := time.Parse(time.RFC3339, value); err == nil {
						entry.Timestamp = t
					}
				}
			}
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

func (s *AzureLoggingService) kubernetesAuditTarget(resourceID string) bool {
	if s.config.Get("azure-k8s-audit-table") != "" {
		return true
	}
	serviceType := strings.ToLower(s.config.Get("service-type", "service"))
	if serviceType == "kubernetes" {
		return true
	}
	cluster := strings.ToLower(strings.TrimSpace(s.config.Get("azure-aks-name", "kubernetes-cluster-name", "resource")))
	if cluster != "" && strings.Contains(strings.ToLower(resourceID), cluster) {
		return true
	}
	return false
}

func (s *AzureLoggingService) queryKubernetesAuditLogs(resourceID string, lookbackMinutes int, class string) ([]LogEntry, error) {
	cfg := s.config.LoggingConfig()
	workspaceID := cfg.AzureLogAnalyticsWorkspaceID
	if workspaceID == "" {
		return nil, fmt.Errorf("azure-log-analytics-workspace-id is required to query Kubernetes audit logs but is not set in config")
	}
	cluster := strings.TrimSpace(resourceID)
	if cluster == "" {
		cluster = s.config.Get("azure-aks-name", "kubernetes-cluster-name", "resource")
	}
	verbFilter := ""
	switch class {
	case "write":
		verbFilter = `| where verb in ("create","update","patch","delete")`
	case "read":
		verbFilter = `| where verb in ("get","list","watch")`
	}
	table := cfg.AzureKubernetesAuditTable
	if table == "" {
		table = "AKSAudit"
	}
	kql := fmt.Sprintf(`%s
| where TimeGenerated >= ago(%dm)
| where _ResourceId contains '%s' or ClusterName == '%s' or ResourceId contains '%s'
%s
| extend result = iff(toint(ResponseStatus.code) >= 400 or ResultType == "Failed", "Failed", "Succeeded")
| project TimeGenerated, verb, user, result, _ResourceId
| order by TimeGenerated desc`, table, lookbackMinutes, cluster, cluster, cluster, verbFilter)

	entries, err := s.runKQL(workspaceID, kql)
	if err != nil && table == "AKSAudit" && cfg.AzureKubernetesAuditTable == "" {
		fallback := fmt.Sprintf(`AzureDiagnostics
| where TimeGenerated >= ago(%dm)
| where Category in ("kube-audit","kube-audit-admin")
| where ResourceId contains '%s'
| extend result = iff(ResultType == "Failed" or ResultType == "Error", "Failed", "Succeeded")
| project TimeGenerated, OperationName, result, ResourceId
| order by TimeGenerated desc`, lookbackMinutes, cluster)
		entries, err = s.runKQL(workspaceID, fallback)
	}
	if err != nil {
		return nil, err
	}
	for i := range entries {
		if entries[i].Result == "" {
			if value := entries[i].Fields["result"]; value != "" {
				entries[i].Result = normalizeAzureResult(value, "")
			} else {
				entries[i].Result = "Succeeded"
			}
		} else {
			entries[i].Result = normalizeAzureResult(entries[i].Result, "")
		}
		if entries[i].Action == "" {
			entries[i].Action = firstNonEmpty(entries[i].Fields["verb"], entries[i].Fields["OperationName"])
		}
		if entries[i].Resource == "" {
			entries[i].Resource = firstNonEmpty(entries[i].Fields["_ResourceId"], entries[i].Fields["ResourceId"], cluster)
		}
	}
	return entries, nil
}

func normalizeAzureResult(localized, value string) string {
	raw := strings.TrimSpace(localized)
	if raw == "" {
		raw = strings.TrimSpace(value)
	}
	switch strings.ToLower(raw) {
	case "success", "succeeded", "ok":
		return "Succeeded"
	case "fail", "failed", "error", "failure":
		return "Failed"
	default:
		return raw
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
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

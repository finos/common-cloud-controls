package logging

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/logging/logadmin"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"google.golang.org/api/iterator"
)

// Compile-time assertion that GCPLoggingService satisfies the Service contract.
var _ Service = (*GCPLoggingService)(nil)

// GCPLoggingService implements Service for GCP Cloud Logging. All four log
// types funnel into Cloud Logging — only the logName filter differs.
type GCPLoggingService struct {
	logAdminClient *logadmin.Client
	ctx            context.Context
	config         types.Config
	projectID      string
}

// NewGCPLoggingService creates a new GCP logging service
func NewGCPLoggingService(ctx context.Context, config types.Config) (*GCPLoggingService, error) {
	projectID := config.CloudParams().GcpProjectId
	if projectID == "" {
		return nil, fmt.Errorf("gcp-project-id is required for GCP logging service")
	}
	client, err := logadmin.NewClient(ctx, projectID)
	if err != nil {
		return nil, err
	}

	return &GCPLoggingService{
		logAdminClient: client,
		ctx:            ctx,
		config:         config,
		projectID:      projectID,
	}, nil
}

// GetOrProvisionTestableResources returns testable resources for the logging service
func (s *GCPLoggingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resourceName := "cloud-audit-logs"
	return []types.TestParams{
		{
			ServiceType:         "logging",
			ProviderServiceType: "cloud-audit-logs",
			CatalogTypes:        []string{"CCC.Core"},
			TagFilter:           []string{"@logging", "@PerService"},
			ResourceName:        resourceName,
			UID:                 resourceName,
			ReportFile:          "cloud-audit-logs",
			ReportTitle:         "Cloud Audit Logs",
			Config:              s.config,
		},
	}, nil
}

func (s *GCPLoggingService) CheckUserProvisioned() error       { return nil }
func (s *GCPLoggingService) ElevateAccessForInspection() error { return nil }
func (s *GCPLoggingService) ResetAccess() error                { return nil }
func (s *GCPLoggingService) UpdateResourcePolicy() error       { return nil }
func (s *GCPLoggingService) TriggerDataWrite(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *GCPLoggingService) TriggerDataRead(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *GCPLoggingService) GetResourceRegion(_ string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}
func (s *GCPLoggingService) IsDataReplicatedToSeparateLocation(_ string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}
func (s *GCPLoggingService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for logging service")
}

// TearDown closes the underlying logging client. Distinct from prior
// implementations that exposed Close() separately.
func (s *GCPLoggingService) TearDown() error {
	if s.logAdminClient != nil {
		return s.logAdminClient.Close()
	}
	return nil
}

// QueryLogs dispatches on logType by selecting the appropriate logName filter
// against Cloud Logging. resourceID, when present, is added as a
// protoPayload.resourceName substring filter (best-effort across log types).
func (s *GCPLoggingService) QueryLogs(resourceID, logType string, lookbackMinutes int) ([]LogEntry, error) {
	logName, err := s.logNameForType(logType)
	if err != nil {
		return nil, err
	}

	since := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute).UTC().Format(time.RFC3339)

	filter := fmt.Sprintf(`logName="projects/%s/logs/%s" AND timestamp >= %q`,
		s.projectID, logName, since)
	if resourceID != "" {
		// protoPayload.resourceName is the canonical identifier on audit log
		// entries; for flow logs we fall back to a raw-text search.
		if logType == LogTypeFlow {
			filter += fmt.Sprintf(` AND "%s"`, resourceID)
		} else {
			filter += fmt.Sprintf(` AND protoPayload.resourceName:%q`, resourceID)
		}
	}

	entries := make([]LogEntry, 0)
	it := s.logAdminClient.Entries(s.ctx, logadmin.Filter(filter))
	for {
		e, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("Cloud Logging entries iterator (%s): %w", logType, err)
		}
		entry := LogEntry{
			Timestamp: e.Timestamp,
			Fields:    map[string]string{},
		}
		if e.Resource != nil {
			entry.Resource = e.Resource.Type
			for k, v := range e.Resource.Labels {
				entry.Fields["resource."+k] = v
			}
		}
		if payload, ok := e.Payload.(map[string]interface{}); ok {
			if v, ok := payload["methodName"].(string); ok {
				entry.Action = v
			}
			if v, ok := payload["authenticationInfo"].(map[string]interface{}); ok {
				if email, ok := v["principalEmail"].(string); ok {
					entry.Identity = email
				}
			}
			if v, ok := payload["resourceName"].(string); ok && entry.Resource == "" {
				entry.Resource = v
			}
		}
		// Severity gives us a coarse result indicator; presence of an error
		// payload would be more precise but is logType-dependent.
		if e.Severity.String() != "" {
			entry.Result = e.Severity.String()
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// logNameForType maps a logType discriminator to the GCP Cloud Logging logName
// segment. Flow logs allow an explicit override via gcp-flow-log-name.
func (s *GCPLoggingService) logNameForType(logType string) (string, error) {
	switch logType {
	case LogTypeAdmin:
		return "cloudaudit.googleapis.com%2Factivity", nil
	case LogTypeDataWrite, LogTypeDataRead:
		// DATA_READ vs DATA_WRITE are both inside data_access; callers can
		// filter further via methodName if needed.
		return "cloudaudit.googleapis.com%2Fdata_access", nil
	case LogTypeFlow:
		override := strings.TrimSpace(s.config.LoggingConfig().GCPFlowLogName)
		if override != "" {
			return override, nil
		}
		return "compute.googleapis.com%2Fvpc_flows", nil
	default:
		return "", fmt.Errorf("GCP logging service does not support log type %q", logType)
	}
}

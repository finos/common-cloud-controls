package logging

import (
	"context"
	"fmt"

	"cloud.google.com/go/logging/logadmin"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// GCPLoggingService implements Service for GCP Cloud Audit Logs
type GCPLoggingService struct {
	logAdminClient *logadmin.Client
	ctx            context.Context
	instance       types.InstanceConfig
}

// NewGCPLoggingService creates a new GCP logging service
func NewGCPLoggingService(ctx context.Context, instance *types.InstanceConfig) (*GCPLoggingService, error) {
	client, err := logadmin.NewClient(ctx, instance.CloudParams().GcpProjectId)
	if err != nil {
		return nil, err
	}

	return &GCPLoggingService{
		logAdminClient: client,
		ctx:            ctx,
		instance:       *instance,
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
			Instance:            s.instance,
		},
	}, nil
}

// CheckUserProvisioned validates that the service's identity is properly provisioned
func (s *GCPLoggingService) CheckUserProvisioned() error {
	return nil
}

// ElevateAccessForInspection temporarily elevates access permissions
func (s *GCPLoggingService) ElevateAccessForInspection() error {
	return nil
}

// ResetAccess restores the original access permissions
func (s *GCPLoggingService) ResetAccess() error {
	return nil
}

// UpdateResourcePolicy is not applicable for logging service
func (s *GCPLoggingService) UpdateResourcePolicy() error {
	return nil
}

// TriggerDataWrite is not applicable for logging service
func (s *GCPLoggingService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not supported for logging service")
}

// GetResourceRegion is not applicable for logging service
func (s *GCPLoggingService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}

// IsDataReplicatedToSeparateLocation is not applicable for logging service
func (s *GCPLoggingService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}

// GetReplicationStatus is not applicable for logging service
func (s *GCPLoggingService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for logging service")
}

// TearDown is a no-op for logging service (does not create resources)
func (s *GCPLoggingService) TearDown() error {
	return nil
}

// QueryAdminLogs queries Cloud Audit Logs for admin activity events
func (s *GCPLoggingService) QueryAdminLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	// TODO: Implement actual GCP Cloud Audit Logs querying
	// Admin Activity audit logs are enabled by default in GCP
	return []LogEntry{}, nil
}

// QueryDataWriteLogs queries Cloud Audit Logs for data write events
func (s *GCPLoggingService) QueryDataWriteLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	// TODO: Implement actual GCP Cloud Audit Logs querying
	// DATA_WRITE audit logs must be explicitly enabled in IAM policy
	return []LogEntry{}, nil
}

// QueryDataReadLogs queries Cloud Audit Logs for data read events
func (s *GCPLoggingService) QueryDataReadLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	// TODO: Implement actual GCP Cloud Audit Logs querying
	// DATA_READ audit logs must be explicitly enabled in IAM policy
	return []LogEntry{}, nil
}

// Close releases resources
func (s *GCPLoggingService) Close() error {
	if s.logAdminClient != nil {
		return s.logAdminClient.Close()
	}
	return nil
}

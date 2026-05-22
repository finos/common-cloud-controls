package logging

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudtrail"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AWSLoggingService implements Service for AWS CloudTrail
type AWSLoggingService struct {
	cloudTrailClient *cloudtrail.Client
	ctx              context.Context
	instance         types.InstanceConfig
	cloudTrailName   string
	cloudTrailCached bool
}

// NewAWSLoggingService creates a new AWS logging service using default credential chain
func NewAWSLoggingService(ctx context.Context, instance *types.InstanceConfig) (*AWSLoggingService, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(instance.CloudParams().Region))
	if err != nil {
		return nil, err
	}

	return &AWSLoggingService{
		cloudTrailClient: cloudtrail.NewFromConfig(cfg),
		ctx:              ctx,
		instance:         *instance,
	}, nil
}

// DiscoverCloudTrailName finds the CloudTrail trail name for the account
// Priority:
// 1. AWS_CLOUDTRAIL_NAME environment variable (allows override)
// 2. First multi-region trail found via CloudTrail API
// 3. First trail found via CloudTrail API
// Returns empty string if no trail is found
func (s *AWSLoggingService) DiscoverCloudTrailName() string {
	if s.cloudTrailCached {
		return s.cloudTrailName
	}
	s.cloudTrailCached = true

	if trailName := os.Getenv("AWS_CLOUDTRAIL_NAME"); trailName != "" {
		s.cloudTrailName = trailName
		return s.cloudTrailName
	}

	cfg, err := config.LoadDefaultConfig(s.ctx)
	if err != nil {
		fmt.Printf("⚠️  Warning: Failed to load AWS config for CloudTrail discovery: %v\n", err)
		return ""
	}

	client := cloudtrail.NewFromConfig(cfg)
	result, err := client.DescribeTrails(s.ctx, &cloudtrail.DescribeTrailsInput{})
	if err != nil {
		fmt.Printf("⚠️  Warning: Failed to describe CloudTrail trails: %v\n", err)
		return ""
	}

	if len(result.TrailList) == 0 {
		fmt.Printf("⚠️  Warning: No CloudTrail trails found in account\n")
		return ""
	}

	for _, trail := range result.TrailList {
		if trail.IsMultiRegionTrail != nil && *trail.IsMultiRegionTrail && trail.Name != nil {
			s.cloudTrailName = *trail.Name
			fmt.Printf("✅ Discovered multi-region CloudTrail: %s\n", s.cloudTrailName)
			return s.cloudTrailName
		}
	}

	if result.TrailList[0].Name != nil {
		s.cloudTrailName = *result.TrailList[0].Name
		fmt.Printf("✅ Discovered CloudTrail: %s\n", s.cloudTrailName)
	}

	return s.cloudTrailName
}

// GetOrProvisionTestableResources returns testable resources for the logging service
func (s *AWSLoggingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	trailName := s.DiscoverCloudTrailName()

	return []types.TestParams{
		{
			ServiceType:         "logging",
			ProviderServiceType: "cloudtrail",
			CatalogTypes:        []string{"CCC.Core"},
			TagFilter:           []string{"@logging", "@PerService"},
			ResourceName:        trailName,
			UID:                 trailName,
			ReportFile:          "cloudtrail-" + trailName,
			ReportTitle:         "CloudTrail: " + trailName,
			Instance:            s.instance,
			Props:               map[string]interface{}{"AWSCloudTrailName": trailName},
		},
	}, nil
}

// CheckUserProvisioned validates that the service's identity is properly provisioned
func (s *AWSLoggingService) CheckUserProvisioned() error {
	return nil
}

// ElevateAccessForInspection temporarily elevates access permissions
func (s *AWSLoggingService) ElevateAccessForInspection() error {
	return nil
}

// ResetAccess restores the original access permissions
func (s *AWSLoggingService) ResetAccess() error {
	return nil
}

// UpdateResourcePolicy is not applicable for logging service
func (s *AWSLoggingService) UpdateResourcePolicy() error {
	return nil
}

// TriggerDataWrite is not applicable for logging service
func (s *AWSLoggingService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not supported for logging service")
}

// GetResourceRegion is not applicable for logging service
func (s *AWSLoggingService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}

// IsDataReplicatedToSeparateLocation is not applicable for logging service
func (s *AWSLoggingService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}

// GetReplicationStatus is not applicable for logging service
func (s *AWSLoggingService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not supported for logging service")
}

// TearDown is a no-op for logging service (does not create resources)
func (s *AWSLoggingService) TearDown() error {
	return nil
}

// QueryAdminLogs queries CloudTrail for admin/management events
func (s *AWSLoggingService) QueryAdminLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return s.queryCloudTrailLogs(resourceID, lookbackMinutes, "management")
}

// QueryDataWriteLogs queries CloudTrail for data write events
func (s *AWSLoggingService) QueryDataWriteLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return s.queryCloudTrailLogs(resourceID, lookbackMinutes, "data-write")
}

// QueryDataReadLogs queries CloudTrail for data read events
func (s *AWSLoggingService) QueryDataReadLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	return s.queryCloudTrailLogs(resourceID, lookbackMinutes, "data-read")
}

func (s *AWSLoggingService) queryCloudTrailLogs(resourceID string, lookbackMinutes int, eventType string) ([]LogEntry, error) {
	startTime := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute)
	endTime := time.Now()

	input := &cloudtrail.LookupEventsInput{
		StartTime: &startTime,
		EndTime:   &endTime,
	}

	result, err := s.cloudTrailClient.LookupEvents(s.ctx, input)
	if err != nil {
		return nil, err
	}

	var entries []LogEntry
	for _, event := range result.Events {
		entry := LogEntry{
			Timestamp: *event.EventTime,
			Action:    getString(event.EventName),
			Resource:  getString(event.EventSource),
		}
		if event.Username != nil {
			entry.Identity = *event.Username
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

func getString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

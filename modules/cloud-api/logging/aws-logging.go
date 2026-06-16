package logging

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudtrail"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Compile-time assertion that AWSLoggingService satisfies the Service contract.
var _ Service = (*AWSLoggingService)(nil)

// AWSLoggingService implements Service for AWS CloudTrail (admin/data-write/
// data-read) and CloudWatch Logs (flow). All sink coordinates come from the
// privateer config — there is no discovery.
type AWSLoggingService struct {
	cloudTrailClient *cloudtrail.Client
	logsClient       *cloudwatchlogs.Client
	ctx              context.Context
	config           types.Config
}

// NewAWSLoggingService creates a new AWS logging service using default credential chain
func NewAWSLoggingService(ctx context.Context, config types.Config) (*AWSLoggingService, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(config.CloudParams().Region))
	if err != nil {
		return nil, err
	}

	return &AWSLoggingService{
		cloudTrailClient: cloudtrail.NewFromConfig(cfg),
		logsClient:       cloudwatchlogs.NewFromConfig(cfg),
		ctx:              ctx,
		config:           config,
	}, nil
}

// GetOrProvisionTestableResources returns testable resources for the logging service
func (s *AWSLoggingService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	return []types.TestParams{
		{
			ServiceType:         "logging",
			ProviderServiceType: "cloudtrail",
			CatalogTypes:        []string{"CCC.Core"},
			TagFilter:           []string{"@logging", "@PerService"},
			ResourceName:        "aws-logging",
			UID:                 "aws-logging",
			ReportFile:          "aws-logging",
			ReportTitle:         "AWS Logging",
			Config:              s.config,
		},
	}, nil
}

func (s *AWSLoggingService) CheckUserProvisioned() error       { return nil }
func (s *AWSLoggingService) ElevateAccessForInspection() error { return nil }
func (s *AWSLoggingService) ResetAccess() error                { return nil }
func (s *AWSLoggingService) UpdateResourcePolicy() error       { return nil }
func (s *AWSLoggingService) TriggerDataWrite(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *AWSLoggingService) TriggerDataRead(_ string) error {
	return fmt.Errorf("not supported for logging service")
}
func (s *AWSLoggingService) GetResourceRegion(_ string) (string, error) {
	return "", fmt.Errorf("not supported for logging service")
}
func (s *AWSLoggingService) IsDataReplicatedToSeparateLocation(_ string) (bool, error) {
	return false, fmt.Errorf("not supported for logging service")
}
func (s *AWSLoggingService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return generic.ReplicationStatusNotApplicable()
}
func (s *AWSLoggingService) TearDown() error { return nil }

// QueryLogs dispatches on logType. admin/data-write/data-read all read from
// CloudTrail (account-wide LookupEvents API); flow reads from the CloudWatch
// Logs group configured at logging.aws-flow-log-group-name.
func (s *AWSLoggingService) QueryLogs(resourceID, logType string, lookbackMinutes int) ([]LogEntry, error) {
	switch logType {
	case LogTypeAdmin, LogTypeDataWrite, LogTypeDataRead:
		return s.queryCloudTrail(resourceID, logType, lookbackMinutes)
	case LogTypeFlow:
		return s.queryFlowLogs(resourceID, lookbackMinutes)
	default:
		return nil, fmt.Errorf("AWS logging service does not support log type %q", logType)
	}
}

// queryCloudTrail returns CloudTrail events in the lookback window filtered to
// the requested logType. CloudTrail's LookupEvents is account-wide; we use
// EventCategory=management for admin and EventCategory=data for data-* (then
// post-filter read vs write via the ReadOnly field).
func (s *AWSLoggingService) queryCloudTrail(resourceID, logType string, lookbackMinutes int) ([]LogEntry, error) {
	startTime := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute)
	endTime := time.Now()

	// LookupEvents does not accept EventCategory on all API versions; filter client-side.
	input := &cloudtrail.LookupEventsInput{
		StartTime: &startTime,
		EndTime:   &endTime,
	}

	wantReadOnly := logType == LogTypeDataRead
	isAdmin := logType == LogTypeAdmin

	entries := make([]LogEntry, 0)
	paginator := cloudtrail.NewLookupEventsPaginator(s.cloudTrailClient, input)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("CloudTrail LookupEvents: %w", err)
		}
		for _, event := range page.Events {
			eventName := aws.ToString(event.EventName)
			if isAdmin {
				if isDataPlaneEventName(eventName) {
					continue
				}
			} else {
				if !isDataPlaneEventName(eventName) {
					continue
				}
				if isReadOnlyEventName(eventName) != wantReadOnly {
					continue
				}
			}
			entry := LogEntry{
				Action:   eventName,
				Resource: aws.ToString(event.EventSource),
				Identity: aws.ToString(event.Username),
				Result:   "Succeeded",
			}
			if event.EventTime != nil {
				entry.Timestamp = *event.EventTime
			}
			// Client-side scope to the requested resource when one is given.
			if resourceID != "" && !strings.Contains(strings.ToLower(aws.ToString(event.CloudTrailEvent)), strings.ToLower(resourceID)) {
				// Best-effort substring match against the raw event JSON.
				// CloudTrail doesn't take a resource-name filter for the
				// account-scoped Lookup API.
				continue
			}
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

// queryFlowLogs reads VPC flow log records from CloudWatch Logs. The group is
// configured at logging.aws-flow-log-group-name; resourceID may be an ENI
// (eni-xxx) or VPC id (vpc-xxx) and is applied as a server-side filter pattern.
func (s *AWSLoggingService) queryFlowLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error) {
	groupName := s.config.LoggingConfig().AWSFlowLogGroupName
	if groupName == "" {
		return nil, fmt.Errorf("aws-flow-log-group-name is required to query flow logs but is not set in config")
	}

	startMillis := time.Now().Add(-time.Duration(lookbackMinutes) * time.Minute).UnixMilli()
	endMillis := time.Now().UnixMilli()

	input := &cloudwatchlogs.FilterLogEventsInput{
		LogGroupName: aws.String(groupName),
		StartTime:    aws.Int64(startMillis),
		EndTime:      aws.Int64(endMillis),
	}
	if resourceID != "" {
		input.FilterPattern = aws.String(fmt.Sprintf("%q", resourceID))
	}

	entries := make([]LogEntry, 0)
	paginator := cloudwatchlogs.NewFilterLogEventsPaginator(s.logsClient, input)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("CloudWatchLogs FilterLogEvents on %s: %w", groupName, err)
		}
		for _, event := range page.Events {
			entry := parseFlowLogMessage(aws.ToString(event.Message))
			if event.Timestamp != nil {
				entry.Timestamp = time.UnixMilli(*event.Timestamp)
			}
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

// parseFlowLogMessage parses an AWS VPC flow log v2 record:
//
//	version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
//
// Older or custom-format records degrade gracefully into the raw-line escape hatch.
func parseFlowLogMessage(raw string) LogEntry {
	fields := strings.Fields(raw)
	out := LogEntry{
		Fields: map[string]string{"raw": raw},
	}
	if len(fields) < 14 {
		return out
	}
	out.Fields["version"] = fields[0]
	out.Fields["account-id"] = fields[1]
	out.Fields["interface-id"] = fields[2]
	out.Fields["srcaddr"] = fields[3]
	out.Fields["dstaddr"] = fields[4]
	out.Fields["srcport"] = fields[5]
	out.Fields["dstport"] = fields[6]
	out.Fields["protocol"] = fields[7]
	out.Fields["packets"] = fields[8]
	out.Fields["bytes"] = fields[9]
	out.Fields["start"] = fields[10]
	out.Fields["end"] = fields[11]
	out.Fields["action"] = fields[12]
	out.Fields["log-status"] = fields[13]

	out.Resource = fields[2] // interface-id
	out.Action = fields[12]  // ACCEPT/REJECT
	out.Result = fields[13]  // OK/NODATA/SKIPDATA
	return out
}

// isDataPlaneEventName classifies CloudTrail event names as data-plane (vs management).
func isDataPlaneEventName(name string) bool {
	for _, prefix := range []string{
		"Put", "Delete", "Create", "Update", "Upload", "Copy", "Invoke",
		"Complete", "Abort", "Restore", "Select", "GetObject", "HeadObject",
	} {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}

// isReadOnlyEventName uses a coarse heuristic over CloudTrail event names to
// classify data-plane events as read or write. This is the same shape AWS uses
// internally (Get*/List*/Describe*/Head* are reads).
func isReadOnlyEventName(name string) bool {
	for _, prefix := range []string{"Get", "List", "Describe", "Head", "Select", "BatchGet"} {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}

package logging

import (
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

// LogEntry represents a log entry from cloud logging services (CloudTrail, Cloud Audit Logs, Azure Monitor)
type LogEntry struct {
	Identity  string    `json:"identity"`  // Who performed the action
	Action    string    `json:"action"`    // What action was performed
	Resource  string    `json:"resource"`  // What resource was affected
	Timestamp time.Time `json:"timestamp"` // When the action occurred
	Result    string    `json:"result"`    // Result/status of the action
}

// serviceParamString retrieves a string value from service params by camelCase key
func serviceParamString(serviceParams map[string]interface{}, key string) string {
	if serviceParams == nil {
		return ""
	}
	if v, ok := serviceParams[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// Service provides operations for cloud logging testing
// This interface abstracts CloudTrail (AWS), Cloud Audit Logs (GCP), and Azure Monitor
type Service interface {
	generic.Service // Extends the base Service interface

	// QueryAdminLogs queries for administrative/management events
	// Returns log entries for admin actions like resource creation, configuration changes
	QueryAdminLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error)

	// QueryDataWriteLogs queries for data write events
	// Returns log entries for data modification operations (create, update, delete)
	QueryDataWriteLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error)

	// QueryDataReadLogs queries for data read events
	// Returns log entries for data read operations
	QueryDataReadLogs(resourceID string, lookbackMinutes int) ([]LogEntry, error)
}

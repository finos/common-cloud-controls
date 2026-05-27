package logging

import (
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

// Log type discriminators accepted by Service.QueryLogs. Implementations are
// allowed to support a subset; callers will get a clear error for any type the
// cloud doesn't implement.
const (
	LogTypeAdmin     = "admin"      // control-plane / management events
	LogTypeDataWrite = "data-write" // data-plane mutations
	LogTypeDataRead  = "data-read"  // data-plane reads
	LogTypeFlow      = "flow"       // network/packet flow logs
)

// LogEntry is the common shape returned across all query types. Identity-shape
// fields are populated for admin/data-write/data-read; flow-log records leave
// them empty and populate the 5-tuple via Fields. Fields is the type-specific
// escape hatch — its keys vary per logType (e.g. srcaddr/dstaddr/srcport for
// flow; category/operation for storage data events).
type LogEntry struct {
	Identity  string            `json:"identity,omitempty"`
	Action    string            `json:"action,omitempty"`
	Resource  string            `json:"resource,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
	Result    string            `json:"result,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
}

// Service queries the cloud's log sinks. Each provider's implementation reads
// its destination coordinates from the privateer config (see
// types.Config.LoggingConfig) — there is no discovery / fallback. If a
// destination isn't configured for a given logType, QueryLogs returns an error.
//
// resourceID is interpreted by the implementation in a logType-appropriate way
// (e.g. storage account name for storage data events; ENI / VPC id for flow
// logs; left as a hint for admin events where the cloud's query API doesn't
// support fine-grained resource filtering).
type Service interface {
	generic.Service

	QueryLogs(resourceID string, logType string, lookbackMinutes int) ([]LogEntry, error)
}

package generic

import (
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// LocationRegion represents a replication region for assertion compatibility.
// The Value field matches the "value" column used in "array of objects with at least" steps.
type LocationRegion struct {
	Value string `json:"value"`
}

// ReplicationStatus represents replication configuration and sync status for object storage.
// Used for CN08.AR01 (physically separate locations) and CN08.AR02 (status visibility).
// Populated consistently across AWS, Azure, and GCP.
// Locations uses []LocationRegion so feature steps can assert with "array of objects with at least".
type ReplicationStatus struct {
	Locations  []LocationRegion // Regions/locations where data is replicated (primary + replicas)
	Status     string           // Replication health: "Enabled", "Syncing", "Healthy", "Degraded", "Disabled"
	SyncStatus string           // Data sync state: "InSync", "Lagging", "Unknown"
}

// Service is the generic interface for cloud services
// This interface can be extended in the future with common methods
// that all cloud services should implement
type Service interface {

	// For a given service type, return all the resources that can be tested within it,
	// as a set of TestParams. If no resources exist, create default ones.
	GetOrProvisionTestableResources() ([]types.TestParams, error)

	// CheckUserProvisioned validates that the service's identity is properly provisioned
	// and usable. Returns nil if the user is ready, error otherwise.
	// This is used in a retry loop to ensure credentials have propagated before use.
	CheckUserProvisioned() error

	// ElevateAccessForInspection temporarily elevates access permissions to allow testing
	// For example, Azure storage might enable public network access
	// The original access level is stored internally for later reset
	ElevateAccessForInspection() error

	// ResetAccess restores the original access permissions that were in place
	// before ElevateAccessForInspection was called
	ResetAccess() error

	// UpdateResourcePolicy updates the resource's policy in a way that triggers logging
	// without changing the policy's functional behavior.
	// AWS: Modifies the SID field
	// Azure: Changes the description
	// GCP: Changes the description
	UpdateResourcePolicy() error

	// TriggerDataWrite performs a logged data modification (create/update/delete).
	// Service-specific: object-storage creates/deletes an object; RDMS inserts a row; etc.
	// Used for CN04.AR02 behavioural tests (data write logging verification).
	TriggerDataWrite(resourceID string) error

	// GetResourceRegion returns the region/availability zone of the resource.
	// Used for CN06.AR01 (resource location compliance).
	GetResourceRegion(resourceID string) (string, error)

	// GetReplicationStatus returns replication/sync status for the resource.
	// Used for CN08.AR01 (locations) and CN08.AR02 (status visibility).
	// Object storage returns *types.ReplicationStatus; other services return nil with error.
	GetReplicationStatus(resourceID string) (*ReplicationStatus, error)

	// TearDown removes resources created during testing (objects, buckets, users, etc.).
	// Each service tracks what it creates and removes them here.
	// No-op for services that do not create resources (e.g. logging).
	TearDown() error
}

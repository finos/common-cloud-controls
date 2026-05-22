package iam

// AccessLevel defines the level of access for a service
type AccessLevel string

const (
	AccessLevelRead  AccessLevel = "read"
	AccessLevelWrite AccessLevel = "write"
	AccessLevelAdmin AccessLevel = "admin"
)

// IAMService provides identity and access management operations
type IAMService interface {
	// ProvisionUserWithAccess creates a new user/identity in the cloud provider and sets their access level
	// Includes propagation/retry logic to ensure credentials and permissions are active
	// level specifies the access level: "none", "read", "write", or "admin"
	ProvisionUserWithAccess(userName string, serviceID string, level string) (*Identity, error)

	// GetAccess retrieves the current access level for a user and service
	// Returns the access level ("none", "read", "write", "admin"), the policy document JSON, and any error
	GetAccess(identity *Identity, serviceID string) (string, string, error)

	// DestroyUser removes the identity and all associated access
	// does nothing if the user does not exist
	DestroyUser(identity *Identity) error
}

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

	// GetAccess retrieves the current access level for a user and service
	// Returns the access level ("none", "read", "write", "admin"), the policy document JSON, and any error
	GetAccess(userName string, serviceID string) (string, string, error)
}

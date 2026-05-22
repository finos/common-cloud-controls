package iam

// Identity represents the identity of a user or service principal
type Identity struct {
	UserName    string            // Username or principal name
	Provider    string            // Cloud provider (aws, azure, gcp)
	Credentials map[string]string // Provider-specific credentials
	Policy      string            // IAM policy document (JSON) for the current access level
}

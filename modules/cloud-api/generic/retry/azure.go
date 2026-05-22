package retry

import (
	"errors"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
)

// Default propagation retry parameters for Azure (RBAC and Graph API can take up to 5 min)
const (
	DefaultPropagationAttempts = 5
	DefaultPropagationDelay    = 60 * time.Second
)

// IsAzureRBACPropagationError returns true for transient 403s after granting data-plane RBAC.
//
//   - AuthorizationPermissionMismatch: ARM / management-plane (common while role assignment propagates).
//   - AuthorizationFailure: blob / queue / table data plane (azblob ListContainers, etc.) after
func IsAzureRBACPropagationError(err error) bool {
	if err == nil {
		return false
	}
	var respErr *azcore.ResponseError
	if errors.As(err, &respErr) {
		if respErr.StatusCode != 403 {
			return false
		}
		switch respErr.ErrorCode {
		case "AuthorizationPermissionMismatch", "AuthorizationFailure":
			return true
		default:
			return false
		}
	}
	// Wrapped or string-shaped errors (e.g. XML body in message)
	msg := err.Error()
	if !strings.Contains(msg, "403") {
		return false
	}
	return strings.Contains(msg, "AuthorizationPermissionMismatch") ||
		strings.Contains(msg, "AuthorizationFailure")
}

// IsAzureCredentialPropagationError returns true for AAD errors indicating
// the client secret has not yet propagated (typically within ~60s).
func IsAzureCredentialPropagationError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "AADSTS7000215") ||
		strings.Contains(msg, "invalid_client") ||
		strings.Contains(msg, "unauthorized_client")
}

// IsAzureGraphAuthorizationDeniedError returns true for Microsoft Graph API
// 403 Authorization_RequestDenied, which can occur when Graph API permissions
// have not yet propagated after being granted (similar to RBAC propagation).
func IsAzureGraphAuthorizationDeniedError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "403") && strings.Contains(msg, "Authorization_RequestDenied")
}

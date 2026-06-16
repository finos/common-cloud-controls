package login

import (
	"fmt"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Login refreshes cloud CLI / default credentials for a single provider when the current token
// is near expiry (JWT exp, Azure expires_on, AWS_CREDENTIAL_EXPIRATION), not a fixed wall-clock interval.
type Login interface {
	EnsureLoginToken() error
	// TokenExpiry returns the best-known expiry time for the current credential/session.
	// If ok is false, expiry is unknown (re-login may still be required via other heuristics).
	TokenExpiry() (exp time.Time, ok bool)
}

// Default logins used by ByProvider (one shared instance per cloud; Azure coordinates with RefreshAzureCLIForCleanup).
var (
	DefaultAWSLogin   *AWSLogin
	DefaultAzureLogin *AzureLogin
	DefaultGCPLogin   *GCPLogin
)

func init() {
	DefaultAWSLogin = &AWSLogin{}
	DefaultGCPLogin = &GCPLogin{}
	DefaultAzureLogin = &AzureLogin{}
}

// ByProvider returns the shared Login for that cloud.
func ByProvider(p types.CloudProvider) (Login, error) {
	switch p {
	case types.ProviderAWS:
		return DefaultAWSLogin, nil
	case types.ProviderAzure:
		return DefaultAzureLogin, nil
	case types.ProviderGCP:
		return DefaultGCPLogin, nil
	default:
		return nil, fmt.Errorf("login: unsupported provider %q", p)
	}
}

// EnsureForProvider runs EnsureLoginToken on the Login for p.
func EnsureForProvider(p types.CloudProvider) error {
	l, err := ByProvider(p)
	if err != nil {
		return err
	}
	return l.EnsureLoginToken()
}

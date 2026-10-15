package login

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
)

// GCPCloudPlatformScope is the default OAuth scope for identity-scoped GCP clients.
const GCPCloudPlatformScope = "https://www.googleapis.com/auth/cloud-platform"

// GCPIdentityKeyJSON returns the service-account key JSON from a test identity.
func GCPIdentityKeyJSON(identity types.Identity) ([]byte, error) {
	key := strings.TrimSpace(identity.Get("service_account_key"))
	if key == "" {
		return nil, fmt.Errorf("service_account_key not found for test identity %q", identity.UserName)
	}
	return []byte(key), nil
}

// GCPIdentityClientOptions returns google API client options authenticated as identity.
func GCPIdentityClientOptions(identity types.Identity) ([]option.ClientOption, error) {
	key, err := GCPIdentityKeyJSON(identity)
	if err != nil {
		return nil, err
	}
	return []option.ClientOption{option.WithCredentialsJSON(key)}, nil
}

// GCPIdentityCredentials parses identity's service-account key into google.Credentials.
// Default scope is GCPCloudPlatformScope when scopes is empty.
func GCPIdentityCredentials(ctx context.Context, identity types.Identity, scopes ...string) (*google.Credentials, error) {
	key, err := GCPIdentityKeyJSON(identity)
	if err != nil {
		return nil, err
	}
	if len(scopes) == 0 {
		scopes = []string{GCPCloudPlatformScope}
	}
	creds, err := google.CredentialsFromJSON(ctx, key, scopes...)
	if err != nil {
		return nil, fmt.Errorf("parse GCP service account key for %q: %w", identity.UserName, err)
	}
	return creds, nil
}

// GCPIdentityHTTPClient returns an HTTP client authenticated as identity.
func GCPIdentityHTTPClient(ctx context.Context, identity types.Identity, scopes ...string) (*http.Client, error) {
	creds, err := GCPIdentityCredentials(ctx, identity, scopes...)
	if err != nil {
		return nil, err
	}
	return oauth2.NewClient(ctx, creds.TokenSource), nil
}

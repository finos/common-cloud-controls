package types

import (
	"fmt"
	"strings"
)

// Identity is a pre-provisioned test principal from test-identities in Privateer vars.
// Provider-agnostic: Credentials holds whatever keys the YAML entry defines (e.g. Azure
// client_id/client_secret/object_id, AWS access_key_id/secret_access_key, GCP service_account_key).
// Resolved inside cloud-api; not returned to the test framework.
type Identity struct {
	UserName    string
	Credentials map[string]string
}

// Get returns the first non-empty credential for any of the given keys (supports kebab/snake/camel aliases).
func (i Identity) Get(keys ...string) string {
	for _, key := range keys {
		for _, k := range credentialKeyAliases(key) {
			if v := trimString(i.Credentials[k]); v != "" {
				return v
			}
		}
	}
	return ""
}

// ClientID returns an application/client identifier when present (Azure, OIDC, etc.).
func (i Identity) ClientID() string { return i.Get("client_id") }

// ClientSecret returns a client secret when present.
func (i Identity) ClientSecret() string { return i.Get("client_secret") }

// ObjectID returns a directory/principal object id when present (Azure service principal, etc.).
func (i Identity) ObjectID() string { return i.Get("object_id") }

// Identity resolves a named test principal from Config (e.g. "testUserRead").
func (c Config) Identity(key string) (Identity, error) {
	return resolveIdentity(c.vars, key)
}

func resolveIdentity(vars map[string]interface{}, key string) (Identity, error) {
	raw, ok := vars["test-identities"]
	if !ok || raw == nil {
		return Identity{}, fmt.Errorf("test-identities not configured")
	}
	identities, err := asStringMapMap(raw)
	if err != nil {
		return Identity{}, fmt.Errorf("test-identities: %w", err)
	}
	entry, ok := identities[key]
	if !ok {
		return Identity{}, fmt.Errorf("test identity %q not found in test-identities", key)
	}
	return identityFromMap(entry)
}

func identityFromMap(m map[string]string) (Identity, error) {
	userName := firstNonEmpty(m, "user-name", "userName", "username")
	if userName == "" {
		return Identity{}, fmt.Errorf("user-name is required in test-identities entry")
	}
	creds := make(map[string]string, len(m))
	for k, v := range m {
		if isUserNameKey(k) {
			continue
		}
		if s := trimString(v); s != "" {
			creds[normalizeCredentialKey(k)] = s
		}
	}
	return Identity{UserName: userName, Credentials: creds}, nil
}

func credentialKeyAliases(key string) []string {
	n := normalizeCredentialKey(key)
	switch n {
	case "client_id":
		return []string{"client_id", "client-id", "clientId"}
	case "client_secret":
		return []string{"client_secret", "client-secret", "clientSecret"}
	case "object_id":
		return []string{"object_id", "object-id", "objectId"}
	case "access_key_id":
		return []string{"access_key_id", "access-key-id", "accessKeyId"}
	case "secret_access_key":
		return []string{"secret_access_key", "secret-access-key", "secretAccessKey"}
	case "service_account_key":
		return []string{"service_account_key", "service-account-key", "serviceAccountKey"}
	default:
		return []string{n, key}
	}
}

func isUserNameKey(k string) bool {
	switch strings.ToLower(strings.ReplaceAll(k, "-", "")) {
	case "username", "principal", "displayname":
		return true
	default:
		return k == "userName" || k == "user-name"
	}
}

func normalizeCredentialKey(k string) string {
	k = strings.TrimSpace(k)
	if strings.Contains(k, "-") {
		return strings.ReplaceAll(k, "-", "_")
	}
	return k
}

func asStringMapMap(raw interface{}) (map[string]map[string]string, error) {
	switch v := raw.(type) {
	case map[string]map[string]string:
		return v, nil
	case map[string]interface{}:
		out := make(map[string]map[string]string, len(v))
		for k, val := range v {
			m, err := asStringMap(val)
			if err != nil {
				return nil, fmt.Errorf("%q: %w", k, err)
			}
			out[k] = m
		}
		return out, nil
	case map[interface{}]interface{}:
		out := make(map[string]map[string]string, len(v))
		for k, val := range v {
			m, err := asStringMap(val)
			if err != nil {
				return nil, fmt.Errorf("%v: %w", k, err)
			}
			out[fmt.Sprintf("%v", k)] = m
		}
		return out, nil
	default:
		return nil, fmt.Errorf("expected map, got %T", raw)
	}
}

func asStringMap(raw interface{}) (map[string]string, error) {
	switch v := raw.(type) {
	case map[string]string:
		return v, nil
	case map[string]interface{}:
		out := make(map[string]string, len(v))
		for k, val := range v {
			out[k] = fmt.Sprintf("%v", val)
		}
		return out, nil
	case map[interface{}]interface{}:
		out := make(map[string]string, len(v))
		for k, val := range v {
			out[fmt.Sprintf("%v", k)] = fmt.Sprintf("%v", val)
		}
		return out, nil
	default:
		return nil, fmt.Errorf("expected map, got %T", raw)
	}
}

func firstNonEmpty(m map[string]string, keys ...string) string {
	for _, k := range keys {
		if s := trimString(m[k]); s != "" {
			return s
		}
	}
	return ""
}

func trimString(s string) string {
	return strings.TrimSpace(fmt.Sprintf("%v", s))
}

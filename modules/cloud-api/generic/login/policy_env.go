package login

import (
	"os"
	"strings"
)

// EnvForPolicyQuery returns the environment for running a policy shell command.
// For Azure CLI it strips stale AZURE_FEDERATED_TOKEN* values so az uses the cache from the last login.
func EnvForPolicyQuery(query string) []string {
	s := strings.TrimSpace(strings.ReplaceAll(query, "\\\n", " "))
	if strings.HasPrefix(strings.ToLower(s), "az ") {
		return sanitizeAzureFedTokenEnv(os.Environ())
	}
	return os.Environ()
}

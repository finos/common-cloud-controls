package login

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// AzureLogin refreshes the Azure CLI session (federated OIDC on GitHub Actions, interactive or cached locally).
type AzureLogin struct {
	mu sync.Mutex
}

// NewAzureLogin returns the shared DefaultAzureLogin so RefreshAzureCLIForCleanup and EnsureLoginToken use the same mutex.
func NewAzureLogin() *AzureLogin {
	return DefaultAzureLogin
}

// TokenExpiry returns the Azure management-plane access token expiry from `az account get-access-token`.
func (l *AzureLogin) TokenExpiry() (time.Time, bool) {
	cmd := exec.Command("az", "account", "get-access-token",
		"--resource", "https://management.azure.com/",
		"-o", "json",
	)
	cmd.Env = sanitizeAzureFedTokenEnv(os.Environ())
	out, err := cmd.Output()
	if err != nil {
		return time.Time{}, false
	}
	var resp struct {
		AccessToken string `json:"accessToken"`
		ExpiresOn   int64  `json:"expires_on"`
	}
	if err := json.Unmarshal(out, &resp); err != nil {
		return time.Time{}, false
	}
	if resp.ExpiresOn > 0 {
		return time.Unix(resp.ExpiresOn, 0), true
	}
	return jwtExpiry(resp.AccessToken)
}

func (l *AzureLogin) tokenOK() bool {
	exp, ok := l.TokenExpiry()
	return tokenFreshEnough(exp, ok)
}

// EnsureLoginToken re-authenticates when the management-plane token is missing or close to expiration.
func (l *AzureLogin) EnsureLoginToken() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.tokenOK() {
		return nil
	}
	return refreshAzureCLIUnlocked()
}

// Azure login refresh for policy checks and the test runner.
//
// GitHub Actions (cfi-test.yml) authenticates with azure/login@v1 using only:
//   - client-id  → AZURE_CLIENT_ID
//   - tenant-id  → AZURE_TENANT_ID
//   - subscription-id → AZURE_SUBSCRIPTION_ID
// and permissions.id-token: write (ACTIONS_ID_TOKEN_REQUEST_*). subscription-id is also passed
// there and exported as AZURE_SUBSCRIPTION_ID; we run az account set when it is set.
// Mid-job we repeat the same federated az login so CLI tokens stay valid.
//
// Locally (not GHA), falls back to interactive az login and AZURE_SUBSCRIPTION_ID if set.

func inGitHubActionsWithAzureOIDC() bool {
	if os.Getenv("GITHUB_ACTIONS") != "true" {
		return false
	}
	if strings.TrimSpace(os.Getenv("ACTIONS_ID_TOKEN_REQUEST_URL")) == "" ||
		os.Getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN") == "" {
		return false
	}
	return os.Getenv("AZURE_CLIENT_ID") != "" && os.Getenv("AZURE_TENANT_ID") != ""
}

// runAzLoginWithFederatedToken matches azure/login@v1 OIDC: exchange GitHub ID token for az session.
func runAzLoginWithFederatedToken(ctx context.Context) error {
	reqURL := os.Getenv("ACTIONS_ID_TOKEN_REQUEST_URL")
	reqTok := os.Getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
	clientID := os.Getenv("AZURE_CLIENT_ID")
	tenantID := os.Getenv("AZURE_TENANT_ID")

	u, err := url.Parse(reqURL)
	if err != nil {
		return fmt.Errorf("parse ACTIONS_ID_TOKEN_REQUEST_URL: %w", err)
	}
	q := u.Query()
	// Default matches Entra federated identity for GitHub unless the workflow sets audience on azure/login.
	q.Set("audience", firstNonEmpty(os.Getenv("AZURE_GITHUB_OIDC_AUDIENCE"), "api://AzureADTokenExchange"))
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return fmt.Errorf("github oidc request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+reqTok)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("github oidc token: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read oidc response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("github oidc http %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Value string `json:"value"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || payload.Value == "" {
		return fmt.Errorf("parse oidc json: %w", err)
	}

	env := sanitizeAzureFedTokenEnv(os.Environ())
	login := exec.CommandContext(ctx, "az", "login", "--service-principal",
		"--username", clientID,
		"--tenant", tenantID,
		"--federated-token", payload.Value,
	)
	login.Env = env
	if out, err := login.CombinedOutput(); err != nil {
		return fmt.Errorf("az login (federated): %w: %s", err, string(out))
	}

	if sub := os.Getenv("AZURE_SUBSCRIPTION_ID"); sub != "" {
		set := exec.CommandContext(ctx, "az", "account", "set", "--subscription", sub)
		set.Env = env
		if out, err := set.CombinedOutput(); err != nil {
			return fmt.Errorf("az account set: %w: %s", err, string(out))
		}
	}

	// Drop short-lived GitHub OIDC JWT from the process env so azidentity's EnvironmentCredential
	// does not keep using an expired client assertion; subsequent SDK calls use the CLI session above.
	_ = os.Unsetenv("AZURE_FEDERATED_TOKEN")
	_ = os.Unsetenv("AZURE_FEDERATED_TOKEN_FILE")

	return nil
}

func runAzLoginInteractive() error {
	cmd := exec.Command("az", "login")
	cmd.Env = os.Environ()
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("az login: %w: %s", err, string(out))
	}
	if sub := os.Getenv("AZURE_SUBSCRIPTION_ID"); sub != "" {
		set := exec.Command("az", "account", "set", "--subscription", sub)
		set.Env = os.Environ()
		if out, err := set.CombinedOutput(); err != nil {
			return fmt.Errorf("az account set: %w: %s", err, string(out))
		}
	}
	return nil
}

func firstNonEmpty(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return b
}

func sanitizeAzureFedTokenEnv(environ []string) []string {
	out := make([]string, 0, len(environ))
	for _, e := range environ {
		if strings.HasPrefix(e, "AZURE_FEDERATED_TOKEN=") || strings.HasPrefix(e, "AZURE_FEDERATED_TOKEN_FILE=") {
			continue
		}
		out = append(out, e)
	}
	return out
}

// RefreshAzureCLIForCleanup re-authenticates Azure CLI before TearDown after long suites.
// On GitHub Actions OIDC it always exchanges a fresh GitHub ID token (EnsureLoginToken alone
// can skip refresh while management-plane checks still pass; federated assertion may already
// be expired — AADSTS700024). Locally it refreshes only when tokenOK is false.
// Serializes with DefaultAzureLogin.EnsureLoginToken via the same mutex.
func RefreshAzureCLIForCleanup() error {
	DefaultAzureLogin.mu.Lock()
	defer DefaultAzureLogin.mu.Unlock()

	if inGitHubActionsWithAzureOIDC() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		return runAzLoginWithFederatedToken(ctx)
	}
	if DefaultAzureLogin.tokenOK() {
		return nil
	}
	return refreshAzureCLIUnlocked()
}

func refreshAzureCLIUnlocked() error {
	if inGitHubActionsWithAzureOIDC() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		return runAzLoginWithFederatedToken(ctx)
	}
	return runAzLoginInteractive()
}

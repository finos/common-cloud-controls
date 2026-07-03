package login

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// AWSLogin refreshes / validates the AWS CLI session (STS) when the ambient credentials are near expiry.
type AWSLogin struct {
	mu sync.Mutex
}

// NewAWSLogin returns a new AWS login instance (for tests or custom wiring). For normal policy checks and
// the test runner, use DefaultAWSLogin or ByProvider(types.ProviderAWS).
func NewAWSLogin() *AWSLogin {
	return &AWSLogin{}
}

// TokenExpiry returns session expiry from AWS_CREDENTIAL_EXPIRATION when set (e.g. assumed roles).
// If not set, ok is false even when long-lived keys are valid—use EnsureLoginToken for a full check.
func (l *AWSLogin) TokenExpiry() (time.Time, bool) {
	raw := strings.TrimSpace(os.Getenv("AWS_CREDENTIAL_EXPIRATION"))
	if raw == "" {
		return time.Time{}, false
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, true
	}
	if t, err := time.Parse("2006-01-02T15:04:05Z0700", raw); err == nil {
		return t, true
	}
	return time.Time{}, false
}

func (l *AWSLogin) tokenOK() bool {
	if exp, ok := l.TokenExpiry(); ok {
		return tokenFreshEnough(exp, true)
	}
	cmd := exec.Command("aws", "sts", "get-caller-identity")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

// EnsureLoginToken re-validates AWS credentials when they are missing or close to expiration.
func (l *AWSLogin) EnsureLoginToken() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.tokenOK() {
		return nil
	}
	return refreshAWSCLI()
}

func refreshAWSCLI() error {
	cmd := exec.Command("aws", "sts", "get-caller-identity")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("aws sts get-caller-identity (refresh credentials / IAM role): %w: %s", err, string(out))
	}
	return nil
}

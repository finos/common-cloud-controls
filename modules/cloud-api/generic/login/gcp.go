package login

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// GCPLogin refreshes gcloud auth when the access token is near expiry.
type GCPLogin struct {
	mu sync.Mutex
}

// NewGCPLogin returns a new GCP login instance. For normal use, DefaultGCPLogin or ByProvider(types.ProviderGCP).
func NewGCPLogin() *GCPLogin {
	return &GCPLogin{}
}

// TokenExpiry parses exp from the current gcloud access token (JWT), when obtainable.
func (l *GCPLogin) TokenExpiry() (time.Time, bool) {
	cmd := exec.Command("gcloud", "auth", "print-access-token", "--quiet")
	out, err := cmd.Output()
	if err != nil {
		return time.Time{}, false
	}
	return jwtExpiry(strings.TrimSpace(string(out)))
}

func (l *GCPLogin) tokenOK() bool {
	exp, ok := l.TokenExpiry()
	if ok {
		return tokenFreshEnough(exp, true)
	}
	return false
}

// EnsureLoginToken activates or validates GCP credentials when they are missing or close to expiration.
func (l *GCPLogin) EnsureLoginToken() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.tokenOK() {
		return nil
	}
	return refreshGCPCLI()
}

func refreshGCPCLI() error {
	if keyFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); keyFile != "" {
		cmd := exec.Command("gcloud", "auth", "activate-service-account", "--key-file="+keyFile)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("gcloud auth activate-service-account: %w: %s", err, string(out))
		}
		return nil
	}

	cmd := exec.Command("gcloud", "auth", "print-access-token", "--quiet")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("gcloud auth print-access-token: %w: %s (set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth login locally)", err, string(out))
	}
	_ = out
	return nil
}

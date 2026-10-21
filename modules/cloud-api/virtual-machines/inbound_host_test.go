package virtualmachines

import (
	"fmt"
	"testing"
)

func TestResolveInboundHostPrefersLiveIP(t *testing.T) {
	host, err := resolveInboundHost("stale.example", func() (string, error) {
		return "203.0.113.10", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if host != "203.0.113.10" {
		t.Fatalf("got %q, want live IP", host)
	}
}

func TestResolveInboundHostFallsBackToConfigured(t *testing.T) {
	host, err := resolveInboundHost("configured.example", func() (string, error) {
		return "", fmt.Errorf("not ready")
	})
	if err != nil {
		t.Fatal(err)
	}
	if host != "configured.example" {
		t.Fatalf("got %q, want configured host", host)
	}
}

func TestResolveInboundHostErrorWhenNeither(t *testing.T) {
	_, err := resolveInboundHost("", func() (string, error) {
		return "", fmt.Errorf("not ready")
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

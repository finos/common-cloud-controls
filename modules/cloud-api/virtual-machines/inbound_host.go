package virtualmachines

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

// resolveInboundHost prefers a live discovered public IP (ephemeral addresses change
// across stop/start) and falls back to configured host-name when discovery fails.
func resolveInboundHost(configured string, discover func() (string, error)) (string, error) {
	if discover != nil {
		if ip, err := discover(); err == nil {
			if host := strings.TrimSpace(ip); host != "" {
				return host, nil
			}
		}
	}
	if host := strings.TrimSpace(configured); host != "" {
		return host, nil
	}
	return "", fmt.Errorf("could not discover a live public IP and host-name is unset")
}

func dialInbound(host string, port int) (*ConnectionAttemptResult, error) {
	if host == "" {
		return nil, fmt.Errorf("host is required for inbound connection checks")
	}
	if port <= 0 {
		port = 22
	}
	address := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", address, 3*time.Second)
	if err != nil {
		return &ConnectionAttemptResult{
			Connected: false,
			Error:     err.Error(),
		}, nil
	}
	remote := conn.RemoteAddr().String()
	_ = conn.Close()
	return &ConnectionAttemptResult{
		Connected:  true,
		RemoteAddr: remote,
	}, nil
}

func waitUntil(ctx context.Context, timeout time.Duration, description string, ready func() (bool, error)) error {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for time.Now().Before(deadline) {
		ok, err := ready()
		if err != nil {
			lastErr = err
		} else if ok {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
	if lastErr != nil {
		return fmt.Errorf("timed out waiting for %s: %w", description, lastErr)
	}
	return fmt.Errorf("timed out waiting for %s", description)
}

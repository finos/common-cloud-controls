package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strconv"
	"testing"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/reachability"
)

var testSecret = []byte("01234567890123456789012345678901")

func TestAuthenticatedProbeAndReplayDefense(t *testing.T) {
	t.Parallel()
	now := time.Unix(1_800_000_000, 0)
	cfg := testConfig()
	s := newServer(cfg, discardLogger())
	s.now = func() time.Time { return now }
	s.probe = func(_ context.Context, _ reachability.Request) (reachability.Result, error) {
		return reachability.Result{Observer: cfg.observer, DNSResolved: true}, nil
	}
	body := marshalRequest(t, reachability.Request{Host: "api.example.com", Port: 443, Protocol: "tls"})

	first := signedRequest(t, body, now, "00112233445566778899aabbccddeeff")
	firstRecorder := httptest.NewRecorder()
	s.routes().ServeHTTP(firstRecorder, first)
	if firstRecorder.Code != http.StatusOK {
		t.Fatalf("first status = %d, want %d: %s", firstRecorder.Code, http.StatusOK, firstRecorder.Body.String())
	}

	replay := signedRequest(t, body, now, "00112233445566778899aabbccddeeff")
	replayRecorder := httptest.NewRecorder()
	s.routes().ServeHTTP(replayRecorder, replay)
	if replayRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("replay status = %d, want %d", replayRecorder.Code, http.StatusUnauthorized)
	}
}

func TestAuthenticationRejectsStaleAndTamperedRequests(t *testing.T) {
	t.Parallel()
	now := time.Unix(1_800_000_000, 0)
	cfg := testConfig()
	s := newServer(cfg, discardLogger())
	s.now = func() time.Time { return now }
	body := marshalRequest(t, reachability.Request{Host: "api.example.com", Port: 443, Protocol: "tls"})

	stale := signedRequest(t, body, now.Add(-cfg.maxClockSkew-time.Second), "11112222333344445555666677778888")
	if err := s.authenticate(stale.Header, body); err == nil {
		t.Fatal("stale request unexpectedly authenticated")
	}

	tampered := signedRequest(t, body, now, "9999aaaabbbbccccddddeeeeffff0000")
	body[0] ^= 1
	if err := s.authenticate(tampered.Header, body); err == nil {
		t.Fatal("tampered request unexpectedly authenticated")
	}
}

func TestTargetAndAddressPolicy(t *testing.T) {
	t.Parallel()
	s := newServer(testConfig(), discardLogger())
	if err := s.validateRequest(reachability.Request{Host: "api.example.com", Port: 443, Protocol: "https"}); err != nil {
		t.Fatalf("allowed target rejected: %v", err)
	}
	for _, request := range []reachability.Request{
		{Host: "example.net", Port: 443, Protocol: "https"},
		{Host: "api.example.com", Port: 22, Protocol: "tcp"},
		{Host: "api.example.com", Port: 443, Protocol: "udp"},
	} {
		if err := s.validateRequest(request); err == nil {
			t.Fatalf("request unexpectedly allowed: %#v", request)
		}
	}
	for _, raw := range []string{"127.0.0.1", "169.254.169.254", "10.0.0.1", "::1", "fd00:ec2::254"} {
		if err := s.validateAddress(netip.MustParseAddr(raw)); err == nil {
			t.Fatalf("address %s unexpectedly allowed", raw)
		}
	}
	s.config.allowedCIDRs = []netip.Prefix{netip.MustParsePrefix("10.10.0.0/16")}
	if err := s.validateAddress(netip.MustParseAddr("10.10.1.2")); err != nil {
		t.Fatalf("explicitly approved private address rejected: %v", err)
	}
}

func TestTCPProbeUsesValidatedAddress(t *testing.T) {
	t.Parallel()
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() {
		connection, acceptErr := listener.Accept()
		if acceptErr == nil {
			_ = connection.Close()
		}
	}()

	port := listener.Addr().(*net.TCPAddr).Port
	cfg := testConfig()
	prefix := netip.MustParsePrefix("127.0.0.1/32")
	cfg.allowedTargets = []targetRule{{prefix: &prefix}}
	cfg.allowedPorts = map[int]struct{}{port: {}}
	cfg.allowedCIDRs = []netip.Prefix{prefix}
	s := newServer(cfg, discardLogger())

	result, err := s.executeProbe(context.Background(), reachability.Request{
		Host: "127.0.0.1", Port: port, Protocol: "tcp", Timeout: time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !result.DNSResolved || !result.TCPConnected || result.Observer != cfg.observer {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestRateLimiter(t *testing.T) {
	t.Parallel()
	limiter := newRateLimiter(1)
	now := time.Now()
	if !limiter.allow("caller", now) || limiter.allow("caller", now) {
		t.Fatal("rate limiter did not enforce its limit")
	}
	if !limiter.allow("caller", now.Add(time.Minute)) {
		t.Fatal("rate limiter did not reset its window")
	}
}

func testConfig() config {
	return config{
		observer:          "test-observer",
		sharedSecret:      testSecret,
		allowedTargets:    []targetRule{{exact: "api.example.com"}},
		allowedPorts:      map[int]struct{}{443: {}},
		maxClockSkew:      5 * time.Minute,
		maxProbeTimeout:   5 * time.Second,
		requestsPerMinute: 60,
	}
}

func marshalRequest(t *testing.T, request reachability.Request) []byte {
	t.Helper()
	body, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	return body
}

func signedRequest(t *testing.T, body []byte, timestamp time.Time, nonce string) *http.Request {
	t.Helper()
	timestampText := strconv.FormatInt(timestamp.Unix(), 10)
	mac := hmac.New(sha256.New, testSecret)
	_, _ = mac.Write([]byte(timestampText + "\n" + nonce + "\n"))
	_, _ = mac.Write(body)
	request := httptest.NewRequest(http.MethodPost, "/v1/probes", bytes.NewReader(body))
	request.RemoteAddr = "192.0.2.10:12345"
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-CCC-Timestamp", timestampText)
	request.Header.Set("X-CCC-Nonce", nonce)
	request.Header.Set("X-CCC-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	return request
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

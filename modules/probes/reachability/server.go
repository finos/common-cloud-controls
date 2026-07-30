package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/reachability"
)

const maxBodyBytes = 16 << 10

type server struct {
	config  config
	logger  *slog.Logger
	now     func() time.Time
	replays *replayCache
	limits  *rateLimiter
	probe   func(context.Context, reachability.Request) (reachability.Result, error)
}

func newServer(cfg config, logger *slog.Logger) *server {
	s := &server{
		config:  cfg,
		logger:  logger,
		now:     time.Now,
		replays: newReplayCache(),
		limits:  newRateLimiter(cfg.requestsPerMinute),
	}
	s.probe = s.executeProbe
	return s
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/v1/probes", s.handleProbe)
	return mux
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, "ok\n")
}

func (s *server) handleProbe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	caller := remoteIP(r.RemoteAddr)
	if !s.limits.allow(caller, s.now()) {
		s.audit("rate_limited", caller, "", 0, "", nil)
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		s.audit("invalid_body", caller, "", 0, "", nil)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := s.authenticate(r.Header, body); err != nil {
		s.audit("authentication_failed", caller, "", 0, "", nil)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var request reachability.Request
	decoder := json.NewDecoder(strings.NewReader(string(body)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		s.audit("invalid_request", caller, "", 0, "", nil)
		http.Error(w, "invalid probe request", http.StatusBadRequest)
		return
	}
	if err := ensureJSONEOF(decoder); err != nil {
		http.Error(w, "invalid probe request", http.StatusBadRequest)
		return
	}
	if err := s.validateRequest(request); err != nil {
		s.audit("policy_rejected", caller, request.Host, request.Port, request.Protocol, nil)
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	result, err := s.probe(r.Context(), request)
	if err != nil {
		s.audit("probe_error", caller, request.Host, request.Port, request.Protocol, nil)
		http.Error(w, "probe failed", http.StatusBadGateway)
		return
	}
	s.audit("completed", caller, request.Host, request.Port, request.Protocol, &result)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		s.logger.Error("write probe response", "error", err)
	}
}

func (s *server) authenticate(header http.Header, body []byte) error {
	timestampText := header.Get("X-CCC-Timestamp")
	nonce := header.Get("X-CCC-Nonce")
	signatureText := header.Get("X-CCC-Signature")
	if timestampText == "" || nonce == "" || signatureText == "" {
		return errors.New("authentication headers are required")
	}
	timestamp, err := strconv.ParseInt(timestampText, 10, 64)
	if err != nil {
		return errors.New("invalid timestamp")
	}
	requestTime := time.Unix(timestamp, 0)
	if delta := s.now().Sub(requestTime); delta > s.config.maxClockSkew || delta < -s.config.maxClockSkew {
		return errors.New("stale timestamp")
	}
	if len(nonce) < 16 || len(nonce) > 128 || !isLowerHex(nonce) {
		return errors.New("invalid nonce")
	}
	const prefix = "sha256="
	if !strings.HasPrefix(signatureText, prefix) {
		return errors.New("invalid signature")
	}
	signature, err := hex.DecodeString(strings.TrimPrefix(signatureText, prefix))
	if err != nil || len(signature) != sha256.Size {
		return errors.New("invalid signature")
	}
	mac := hmac.New(sha256.New, s.config.sharedSecret)
	_, _ = mac.Write([]byte(timestampText + "\n" + nonce + "\n"))
	_, _ = mac.Write(body)
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return errors.New("invalid signature")
	}
	if !s.replays.use(nonce, s.now(), s.config.maxClockSkew) {
		return errors.New("replayed nonce")
	}
	return nil
}

func (s *server) audit(event, caller, host string, port int, protocol string, result *reachability.Result) {
	attributes := []any{
		"event", event,
		"caller_hash", shortHash(caller),
	}
	if host != "" {
		attributes = append(attributes,
			"target_hash", shortHash(strings.ToLower(host)),
			"port", port,
			"protocol", strings.ToLower(protocol),
		)
	}
	if result != nil {
		attributes = append(attributes,
			"dns_resolved", result.DNSResolved,
			"tcp_connected", result.TCPConnected,
			"tls_connected", result.TLSConnected,
			"http_status", result.HTTPStatus,
			"duration_ms", result.Duration.Milliseconds(),
		)
	}
	s.logger.Info("reachability probe audit", attributes...)
}

func shortHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:8])
}

func remoteIP(remoteAddress string) string {
	host, _, err := net.SplitHostPort(remoteAddress)
	if err == nil {
		return host
	}
	return remoteAddress
}

func isLowerHex(value string) bool {
	for _, character := range value {
		if (character < '0' || character > '9') && (character < 'a' || character > 'f') {
			return false
		}
	}
	return len(value)%2 == 0
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return fmt.Errorf("multiple JSON values")
		}
		return err
	}
	return nil
}

type replayCache struct {
	mu      sync.Mutex
	entries map[string]time.Time
}

func newReplayCache() *replayCache {
	return &replayCache{entries: make(map[string]time.Time)}
}

func (c *replayCache) use(nonce string, now time.Time, ttl time.Duration) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	for existing, expires := range c.entries {
		if !expires.After(now) {
			delete(c.entries, existing)
		}
	}
	if expires, found := c.entries[nonce]; found && expires.After(now) {
		return false
	}
	c.entries[nonce] = now.Add(2 * ttl)
	return true
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	callers map[string]rateWindow
}

type rateWindow struct {
	start time.Time
	count int
}

func newRateLimiter(limit int) *rateLimiter {
	return &rateLimiter{limit: limit, callers: make(map[string]rateWindow)}
}

func (l *rateLimiter) allow(caller string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	window := l.callers[caller]
	if window.start.IsZero() || now.Sub(window.start) >= time.Minute {
		window = rateWindow{start: now}
	}
	if window.count >= l.limit {
		return false
	}
	window.count++
	l.callers[caller] = window
	if len(l.callers) > 10000 {
		for key, value := range l.callers {
			if now.Sub(value.start) >= time.Minute {
				delete(l.callers, key)
			}
		}
	}
	return true
}

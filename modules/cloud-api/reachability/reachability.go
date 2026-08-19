package reachability

import (
	"bufio"
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Request describes a network observation. NetworkContext identifies the
// vantage point requested by the caller; it is not a claimed access decision.
type Request struct {
	Host           string        `json:"host"`
	Port           int           `json:"port"`
	Protocol       string        `json:"protocol"`
	ServerName     string        `json:"serverName,omitempty"`
	Timeout        time.Duration `json:"timeout"`
	NetworkContext string        `json:"networkContext,omitempty"`
}

type Result struct {
	Observer     string        `json:"observer"`
	DNSResolved  bool          `json:"dnsResolved"`
	TCPConnected bool          `json:"tcpConnected"`
	TLSConnected bool          `json:"tlsConnected"`
	HTTPStatus   int           `json:"httpStatus,omitempty"`
	RemoteAddr   string        `json:"remoteAddr,omitempty"`
	Failure      string        `json:"failure,omitempty"`
	Duration     time.Duration `json:"duration"`
}

type Prober interface {
	Probe(context.Context, Request) (Result, error)
}

type LocalProber struct {
	Observer string
}

func (p LocalProber) Probe(ctx context.Context, req Request) (result Result, err error) {
	started := time.Now()
	result.Observer = p.Observer
	if result.Observer == "" {
		result.Observer = "local"
	}
	defer func() { result.Duration = time.Since(started) }()
	if err := validateRequest(req); err != nil {
		return result, err
	}
	timeout := req.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	addrs, err := net.DefaultResolver.LookupHost(ctx, req.Host)
	if err != nil {
		result.Failure = fmt.Sprintf("DNS lookup failed: %v", err)
		return result, nil
	}
	result.DNSResolved = len(addrs) > 0
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(req.Host, strconv.Itoa(req.Port)))
	if err != nil {
		result.Failure = fmt.Sprintf("TCP connection failed: %v", err)
		return result, nil
	}
	result.TCPConnected = true
	result.RemoteAddr = conn.RemoteAddr().String()

	switch strings.ToLower(req.Protocol) {
	case "tcp":
		_ = conn.Close()
		return result, nil
	case "tls", "https":
		serverName := req.ServerName
		if serverName == "" {
			serverName = req.Host
		}
		tlsConn := tls.Client(conn, &tls.Config{ServerName: serverName, MinVersion: tls.VersionTLS12})
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			_ = conn.Close()
			result.Failure = fmt.Sprintf("TLS handshake failed: %v", err)
			return result, nil
		}
		result.TLSConnected = true
		if strings.EqualFold(req.Protocol, "https") {
			httpReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://"+net.JoinHostPort(req.Host, strconv.Itoa(req.Port))+"/", nil)
			httpReq.Host = serverName
			if err := httpReq.Write(tlsConn); err != nil {
				_ = tlsConn.Close()
				return result, fmt.Errorf("write HTTPS probe request: %w", err)
			}
			response, err := http.ReadResponse(bufio.NewReader(tlsConn), httpReq)
			if err != nil {
				_ = tlsConn.Close()
				result.Failure = fmt.Sprintf("HTTPS response failed: %v", err)
				return result, nil
			}
			result.HTTPStatus = response.StatusCode
			_ = response.Body.Close()
		}
		_ = tlsConn.Close()
		return result, nil
	default:
		_ = conn.Close()
		return result, fmt.Errorf("unsupported protocol %q (expected tcp, tls, or https)", req.Protocol)
	}
}

type RemoteProber struct {
	URL          string
	SharedSecret []byte
	Observer     string
	Client       *http.Client
}

func (p RemoteProber) Probe(ctx context.Context, req Request) (Result, error) {
	var result Result
	if err := validateRequest(req); err != nil {
		return result, err
	}
	endpoint, err := url.Parse(strings.TrimSpace(p.URL))
	if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
		return result, fmt.Errorf("reachability probe URL must be an absolute HTTPS URL")
	}
	if len(p.SharedSecret) == 0 {
		return result, fmt.Errorf("reachability probe shared secret is required")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return result, fmt.Errorf("marshal reachability request: %w", err)
	}
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return result, fmt.Errorf("create request nonce: %w", err)
	}
	timestamp := strconv.FormatInt(time.Now().UTC().Unix(), 10)
	nonce := hex.EncodeToString(nonceBytes)
	mac := hmac.New(sha256.New, p.SharedSecret)
	_, _ = mac.Write([]byte(timestamp + "\n" + nonce + "\n"))
	_, _ = mac.Write(body)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(p.URL, "/")+"/v1/probes", bytes.NewReader(body))
	if err != nil {
		return result, fmt.Errorf("create remote probe request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-CCC-Timestamp", timestamp)
	httpReq.Header.Set("X-CCC-Nonce", nonce)
	httpReq.Header.Set("X-CCC-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: requestTimeout(req)}
	}
	response, err := client.Do(httpReq)
	if err != nil {
		return result, fmt.Errorf("remote reachability probe failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		limited, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return result, fmt.Errorf("remote reachability probe returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(limited)))
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&result); err != nil {
		return result, fmt.Errorf("decode remote reachability result: %w", err)
	}
	if p.Observer != "" && result.Observer != p.Observer {
		return result, fmt.Errorf("remote probe observer mismatch: expected %q, got %q", p.Observer, result.Observer)
	}
	return result, nil
}

func validateRequest(req Request) error {
	if strings.TrimSpace(req.Host) == "" {
		return fmt.Errorf("probe host is required")
	}
	if req.Port < 1 || req.Port > 65535 {
		return fmt.Errorf("probe port must be between 1 and 65535")
	}
	return nil
}

func requestTimeout(req Request) time.Duration {
	if req.Timeout > 0 {
		return req.Timeout + time.Second
	}
	return 6 * time.Second
}

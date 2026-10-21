package main

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/reachability"
)

func (s *server) validateRequest(request reachability.Request) error {
	host := strings.ToLower(strings.TrimSuffix(strings.TrimSpace(request.Host), "."))
	if host == "" || strings.ContainsAny(host, "/:@[]% \t\r\n") {
		return fmt.Errorf("target is not allowed")
	}
	if !s.targetAllowed(host) {
		return fmt.Errorf("target is not allowed")
	}
	if _, allowed := s.config.allowedPorts[request.Port]; !allowed {
		return fmt.Errorf("port is not allowed")
	}
	switch strings.ToLower(request.Protocol) {
	case "tcp", "tls", "https":
	default:
		return fmt.Errorf("protocol is not allowed")
	}
	if request.Timeout < 0 || request.Timeout > s.config.maxProbeTimeout {
		return fmt.Errorf("timeout exceeds the configured maximum")
	}
	if request.ServerName != "" &&
		!strings.EqualFold(strings.TrimSuffix(request.ServerName, "."), host) {
		return fmt.Errorf("serverName must match host")
	}
	return nil
}

func (s *server) targetAllowed(host string) bool {
	if address, err := netip.ParseAddr(host); err == nil {
		address = address.Unmap()
		for _, rule := range s.config.allowedTargets {
			if rule.prefix != nil && rule.prefix.Contains(address) {
				return true
			}
		}
		return false
	}
	if !validHostname(host) {
		return false
	}
	for _, rule := range s.config.allowedTargets {
		if rule.exact == host {
			return true
		}
		if rule.suffix != "" && strings.HasSuffix(host, rule.suffix) &&
			len(host) > len(rule.suffix) {
			return true
		}
	}
	return false
}

func (s *server) executeProbe(parent context.Context, request reachability.Request) (result reachability.Result, err error) {
	started := time.Now()
	result.Observer = s.config.observer
	defer func() {
		result.Duration = time.Since(started)
	}()

	timeout := request.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	if timeout > s.config.maxProbeTimeout {
		timeout = s.config.maxProbeTimeout
	}
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()

	addresses, err := resolve(ctx, request.Host)
	if err != nil {
		result.Failure = "DNS lookup failed"
		return result, nil
	}
	result.DNSResolved = len(addresses) > 0
	for _, address := range addresses {
		if err := s.validateAddress(address); err != nil {
			return result, fmt.Errorf("resolved target rejected by address policy: %w", err)
		}
	}

	var connection net.Conn
	for _, address := range addresses {
		dialer := &net.Dialer{}
		connection, err = dialer.DialContext(ctx, "tcp", net.JoinHostPort(address.String(), strconv.Itoa(request.Port)))
		if err == nil {
			break
		}
	}
	if err != nil || connection == nil {
		result.Failure = "TCP connection failed"
		return result, nil
	}
	defer connection.Close()
	result.TCPConnected = true
	result.RemoteAddr = connection.RemoteAddr().String()

	protocol := strings.ToLower(request.Protocol)
	if protocol == "tcp" {
		return result, nil
	}
	serverName := request.ServerName
	if serverName == "" {
		serverName = request.Host
	}
	tlsConnection := tls.Client(connection, &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: serverName,
	})
	if deadline, ok := ctx.Deadline(); ok {
		_ = tlsConnection.SetDeadline(deadline)
	}
	if err := tlsConnection.HandshakeContext(ctx); err != nil {
		result.Failure = "TLS handshake failed"
		return result, nil
	}
	result.TLSConnected = true
	if protocol == "tls" {
		return result, nil
	}

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://"+net.JoinHostPort(request.Host, strconv.Itoa(request.Port))+"/", nil)
	if err != nil {
		return result, fmt.Errorf("create HTTPS request: %w", err)
	}
	httpRequest.Host = serverName
	httpRequest.Header.Set("User-Agent", "finos-ccc-reachability-probe/1")
	httpRequest.Close = true
	if err := httpRequest.Write(tlsConnection); err != nil {
		result.Failure = "HTTPS request failed"
		return result, nil
	}
	limited := io.LimitReader(tlsConnection, 64<<10)
	response, err := http.ReadResponse(bufio.NewReader(limited), httpRequest)
	if err != nil {
		result.Failure = "HTTPS response failed"
		return result, nil
	}
	result.HTTPStatus = response.StatusCode
	_ = response.Body.Close()
	return result, nil
}

func resolve(ctx context.Context, host string) ([]netip.Addr, error) {
	if address, err := netip.ParseAddr(host); err == nil {
		return []netip.Addr{address.Unmap()}, nil
	}
	dnsCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	addresses, err := net.DefaultResolver.LookupNetIP(dnsCtx, "ip", host)
	if err != nil {
		return nil, err
	}
	result := make([]netip.Addr, 0, len(addresses))
	for _, address := range addresses {
		result = append(result, address.Unmap())
	}
	return result, nil
}

func (s *server) validateAddress(address netip.Addr) error {
	address = address.Unmap()
	if !address.IsValid() {
		return fmt.Errorf("invalid address")
	}
	for _, prefix := range s.config.allowedCIDRs {
		if prefix.Contains(address) {
			return nil
		}
	}
	if !address.IsGlobalUnicast() || address.IsLoopback() || address.IsPrivate() || address.IsLinkLocalUnicast() ||
		address.IsLinkLocalMulticast() || address.IsMulticast() || address.IsUnspecified() ||
		isMetadataAddress(address) {
		return fmt.Errorf("non-public address")
	}
	return nil
}

func isMetadataAddress(address netip.Addr) bool {
	metadata := []netip.Prefix{
		netip.MustParsePrefix("169.254.169.254/32"),
		netip.MustParsePrefix("100.100.100.200/32"),
		netip.MustParsePrefix("fd00:ec2::254/128"),
	}
	for _, prefix := range metadata {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}

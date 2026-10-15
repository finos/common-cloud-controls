package main

import (
	"fmt"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

type config struct {
	listenAddress     string
	observer          string
	sharedSecret      []byte
	allowedTargets    []targetRule
	allowedPorts      map[int]struct{}
	allowedCIDRs      []netip.Prefix
	maxClockSkew      time.Duration
	maxProbeTimeout   time.Duration
	requestsPerMinute int
}

type targetRule struct {
	exact  string
	suffix string
	prefix *netip.Prefix
}

func loadConfig() (config, error) {
	cfg := config{
		listenAddress:     envOrDefault("LISTEN_ADDRESS", ":8080"),
		observer:          envOrDefault("OBSERVER_NAME", "finos-public-probe"),
		sharedSecret:      []byte(os.Getenv("SHARED_SECRET")),
		maxClockSkew:      5 * time.Minute,
		maxProbeTimeout:   10 * time.Second,
		requestsPerMinute: 60,
	}
	if len(cfg.sharedSecret) < 32 {
		return cfg, fmt.Errorf("SHARED_SECRET must contain at least 32 bytes")
	}

	var err error
	if cfg.allowedTargets, err = parseTargetRules(os.Getenv("TARGET_ALLOWLIST")); err != nil {
		return cfg, err
	}
	if len(cfg.allowedTargets) == 0 {
		return cfg, fmt.Errorf("TARGET_ALLOWLIST must contain at least one explicit host, wildcard suffix, IP, or CIDR")
	}
	if cfg.allowedPorts, err = parsePorts(os.Getenv("PORT_ALLOWLIST")); err != nil {
		return cfg, err
	}
	if len(cfg.allowedPorts) == 0 {
		return cfg, fmt.Errorf("PORT_ALLOWLIST must contain at least one port")
	}
	if cfg.allowedCIDRs, err = parsePrefixes(os.Getenv("ALLOW_PRIVATE_CIDRS")); err != nil {
		return cfg, fmt.Errorf("ALLOW_PRIVATE_CIDRS: %w", err)
	}
	if cfg.maxClockSkew, err = durationEnv("MAX_CLOCK_SKEW", cfg.maxClockSkew, time.Second, 15*time.Minute); err != nil {
		return cfg, err
	}
	if cfg.maxProbeTimeout, err = durationEnv("MAX_PROBE_TIMEOUT", cfg.maxProbeTimeout, time.Second, 30*time.Second); err != nil {
		return cfg, err
	}
	if raw := os.Getenv("REQUESTS_PER_MINUTE"); raw != "" {
		cfg.requestsPerMinute, err = strconv.Atoi(raw)
		if err != nil || cfg.requestsPerMinute < 1 || cfg.requestsPerMinute > 10000 {
			return cfg, fmt.Errorf("REQUESTS_PER_MINUTE must be between 1 and 10000")
		}
	}
	return cfg, nil
}

func parseTargetRules(raw string) ([]targetRule, error) {
	var rules []targetRule
	for _, item := range splitList(raw) {
		value := strings.ToLower(strings.TrimSuffix(item, "."))
		if prefix, err := netip.ParsePrefix(value); err == nil {
			prefix = prefix.Masked()
			rules = append(rules, targetRule{prefix: &prefix})
			continue
		}
		if address, err := netip.ParseAddr(value); err == nil {
			prefix := netip.PrefixFrom(address.Unmap(), address.Unmap().BitLen())
			rules = append(rules, targetRule{prefix: &prefix})
			continue
		}
		if strings.HasPrefix(value, "*.") && validHostname(value[2:]) {
			rules = append(rules, targetRule{suffix: value[1:]})
			continue
		}
		if !validHostname(value) {
			return nil, fmt.Errorf("TARGET_ALLOWLIST contains invalid target %q", item)
		}
		rules = append(rules, targetRule{exact: value})
	}
	return rules, nil
}

func parsePorts(raw string) (map[int]struct{}, error) {
	ports := make(map[int]struct{})
	for _, item := range splitList(raw) {
		port, err := strconv.Atoi(item)
		if err != nil || port < 1 || port > 65535 {
			return nil, fmt.Errorf("PORT_ALLOWLIST contains invalid port %q", item)
		}
		ports[port] = struct{}{}
	}
	return ports, nil
}

func parsePrefixes(raw string) ([]netip.Prefix, error) {
	var prefixes []netip.Prefix
	for _, item := range splitList(raw) {
		prefix, err := netip.ParsePrefix(item)
		if err != nil {
			address, addressErr := netip.ParseAddr(item)
			if addressErr != nil {
				return nil, fmt.Errorf("invalid CIDR or IP %q", item)
			}
			prefix = netip.PrefixFrom(address.Unmap(), address.Unmap().BitLen())
		}
		prefixes = append(prefixes, prefix.Masked())
	}
	return prefixes, nil
}

func splitList(raw string) []string {
	var result []string
	for _, item := range strings.Split(raw, ",") {
		if item = strings.TrimSpace(item); item != "" {
			result = append(result, item)
		}
	}
	return result
}

func validHostname(host string) bool {
	if len(host) == 0 || len(host) > 253 || strings.ContainsAny(host, "/:@[]% \t\r\n") {
		return false
	}
	for _, label := range strings.Split(host, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}
		for _, character := range label {
			if (character < 'a' || character > 'z') &&
				(character < '0' || character > '9') && character != '-' {
				return false
			}
		}
	}
	return true
}

func durationEnv(key string, fallback, minimum, maximum time.Duration) (time.Duration, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil || value < minimum || value > maximum {
		return 0, fmt.Errorf("%s must be a duration between %s and %s", key, minimum, maximum)
	}
	return value, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

package reachability

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Service exposes reachability probing as a factory service (id: "reachability").
type Service interface {
	generic.Service
	CheckProbeConfigured() error
	Probe(host string, port int, protocol, networkContext string) (Result, error)
}

var _ Service = (*service)(nil)

type service struct {
	ctx    context.Context
	config types.Config
	prober Prober
}

// NewService builds a reachability service from config (local or remote prober).
func NewService(ctx context.Context, cfg types.Config) (*service, error) {
	return &service{ctx: ctx, config: cfg, prober: ProberFromConfig(cfg)}, nil
}

// NewServiceWithIdentity is config-only; identity does not change the prober.
func NewServiceWithIdentity(ctx context.Context, cfg types.Config, _ types.Identity) (*service, error) {
	return NewService(ctx, cfg)
}

// ProberFromConfig selects LocalProber or RemoteProber from Privateer vars.
func ProberFromConfig(cfg types.Config) Prober {
	if strings.EqualFold(cfg.Get("reachability-probe-mode"), "remote") {
		return RemoteProber{
			URL:          cfg.Get("reachability-probe-url"),
			SharedSecret: []byte(cfg.Get("reachability-probe-shared-secret")),
			Observer:     cfg.Get("reachability-probe-observer"),
		}
	}
	observer := cfg.Get("reachability-probe-observer")
	if observer == "" {
		observer = "runner-local"
	}
	return LocalProber{Observer: observer}
}

// CheckProbeConfigured validates remote probe settings when mode is remote.
func (s *service) CheckProbeConfigured() error {
	if !strings.EqualFold(s.config.Get("reachability-probe-mode"), "remote") {
		return nil
	}
	url := strings.TrimSpace(s.config.Get("reachability-probe-url"))
	secret := strings.TrimSpace(s.config.Get("reachability-probe-shared-secret"))
	if url == "" {
		return fmt.Errorf("reachability-probe-url is required when reachability-probe-mode=remote")
	}
	if secret == "" {
		return fmt.Errorf("reachability-probe-shared-secret is required when reachability-probe-mode=remote")
	}
	if !strings.HasPrefix(strings.ToLower(url), "https://") {
		return fmt.Errorf("reachability-probe-url must be an absolute HTTPS URL")
	}
	return nil
}

// Probe runs a reachability observation via the configured prober.
func (s *service) Probe(host string, port int, protocol, networkContext string) (Result, error) {
	timeout := 5 * time.Second
	if raw := strings.TrimSpace(s.config.Get("reachability-probe-timeout-ms")); raw != "" {
		if ms, err := strconv.Atoi(raw); err == nil && ms > 0 {
			timeout = time.Duration(ms) * time.Millisecond
		}
	}
	return s.prober.Probe(s.ctx, Request{
		Host:           host,
		Port:           port,
		Protocol:       protocol,
		Timeout:        timeout,
		NetworkContext: networkContext,
	})
}

func (s *service) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	return []types.TestParams{{
		UID: "reachability", ResourceName: "reachability",
		ProviderServiceType: "reachability:probe", ServiceType: "reachability",
		CatalogTypes: []string{"CCC.Core"}, TagFilter: []string{"@Behavioural"}, Config: s.config,
	}}, nil
}

func (s *service) CheckUserProvisioned() error             { return s.CheckProbeConfigured() }
func (s *service) ElevateAccessForInspection() error       { return nil }
func (s *service) ResetAccess() error                      { return nil }
func (s *service) TearDown() error                         { return nil }
func (s *service) Start(string) error                      { return nil }
func (s *service) Stop(string) error                       { return nil }
func (s *service) StartedDetails() ([]generic.StartedResource, error) {
	return nil, nil
}
func (s *service) UpdateResourcePolicy() error {
	return fmt.Errorf("UpdateResourcePolicy is unsupported for reachability")
}
func (s *service) TriggerDataWrite(string) error {
	return fmt.Errorf("TriggerDataWrite is unsupported for reachability")
}
func (s *service) TriggerDataRead(string) error {
	return fmt.Errorf("TriggerDataRead is unsupported for reachability")
}
func (s *service) GetResourceRegion(string) (string, error) {
	return "", fmt.Errorf("GetResourceRegion is unsupported for reachability")
}
func (s *service) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("GetReplicationStatus is unsupported for reachability")
}

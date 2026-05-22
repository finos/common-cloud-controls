package main

import (
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// RunConfig is the configuration for running compliance tests
type RunConfig struct {
	ServiceName    string // e.g., "object-storage", "iam"
	Instance       types.InstanceConfig
	OutputDir      string
	Timeout        time.Duration
	ResourceFilter string
	Tags           []string // Tag filters to AND with service tags (e.g., ["@CCC.Core.CN01", "@Policy"])
}

// ServiceRunner is the interface for running a suite of compliance tests for a specific service
type ServiceRunner interface {
	Run() int

	GetConfig() RunConfig
}

package types

import (
	"fmt"
	"strings"
)

// Config is the Privateer services.*.vars map (expanded). Factories read settings and
// test-identities directly instead of marshalling into InstanceConfig.
type Config struct {
	vars map[string]interface{}
}

// NewConfig wraps Privateer vars (call runner.ExpandVars before passing).
func NewConfig(vars map[string]interface{}) Config {
	if vars == nil {
		vars = make(map[string]interface{})
	}
	return Config{vars: vars}
}

// Vars returns the underlying map (e.g. for Props / reporters).
func (c Config) Vars() map[string]interface{} {
	return c.vars
}

// Get returns a string var by kebab-case or camelCase key.
func (c Config) Get(keys ...string) string {
	for _, key := range keys {
		if v, ok := c.vars[key]; ok && v != nil {
			if s := strings.TrimSpace(fmt.Sprintf("%v", v)); s != "" && s != "<nil>" {
				return s
			}
		}
	}
	return ""
}

// Provider returns the cloud provider constant.
func (c Config) Provider() (CloudProvider, error) {
	switch strings.ToLower(c.Get("provider")) {
	case "aws":
		return ProviderAWS, nil
	case "azure":
		return ProviderAzure, nil
	case "gcp":
		return ProviderGCP, nil
	default:
		return "", fmt.Errorf("unsupported or missing provider in config: %q", c.Get("provider"))
	}
}

// CloudParams builds instance-level cloud settings from flat Privateer vars.
func (c Config) CloudParams() CloudParams {
	return CloudParams{
		Provider:            c.Get("provider"),
		Region:              c.Get("region"),
		AzureResourceGroup:  c.Get("azure-resource-group"),
		AzureSubscriptionID: c.Get("azure-subscription-id"),
		GcpProjectId:        c.Get("gcp-project-id"),
	}
}

// VpcServiceConfig returns typed VPC settings from flat Privateer vars.
func (c Config) VpcServiceConfig() VpcServiceConfig {
	return vpcConfigFromProps(c.vars)
}

// ConfigFromInstance builds Config from a legacy environment YAML instance.
func ConfigFromInstance(ic InstanceConfig) Config {
	vars := make(map[string]interface{})
	cp := ic.CloudParams()
	if cp.Provider != "" {
		vars["provider"] = cp.Provider
	}
	if cp.Region != "" {
		vars["region"] = cp.Region
	}
	if cp.AzureResourceGroup != "" {
		vars["azure-resource-group"] = cp.AzureResourceGroup
	}
	if cp.AzureSubscriptionID != "" {
		vars["azure-subscription-id"] = cp.AzureSubscriptionID
	}
	if cp.GcpProjectId != "" {
		vars["gcp-project-id"] = cp.GcpProjectId
	}
	for k, v := range ic.Rules {
		vars[k] = v
	}
	for _, svc := range ic.Services {
		for k, v := range svc.Properties {
			vars[k] = v
		}
	}
	return NewConfig(vars)
}

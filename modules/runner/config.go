package runner

import (
	"fmt"
	"os"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"gopkg.in/yaml.v3"
)

// EnvironmentConfig is the legacy top-level structure of environment YAML files.
type EnvironmentConfig struct {
	Instances []types.InstanceConfig `yaml:"instances"`
}

var cloudParamKeys = map[string]bool{
	"provider":              true,
	"region":                true,
	"azure-subscription-id": true,
	"azure-resource-group":  true,
	"gcp-project-id":        true,
}

var reservedVarKeys = map[string]bool{
	"service":         true,
	"tags":            true,
	"timeout":         true,
	"resource":        true,
	"instance":        true,
	"env-file":        true,
	"test-identities": true,
}

// InstanceFromVars builds an InstanceConfig from Privateer services.*.vars (flat map).
func InstanceFromVars(vars map[string]interface{}, serviceType, instanceID string) (types.InstanceConfig, error) {
	if serviceType == "" {
		return types.InstanceConfig{}, fmt.Errorf("service type is required in vars (e.g. object-storage)")
	}
	if instanceID == "" {
		instanceID = "default"
	}

	expanded := ExpandVars(vars)
	ic := types.InstanceConfig{
		ID:    instanceID,
		Rules: make(map[string]interface{}),
	}

	for k, v := range expanded {
		if reservedVarKeys[k] || strings.HasPrefix(k, "testUser") {
			continue
		}
		s := strings.TrimSpace(fmt.Sprintf("%v", v))
		if s == "" {
			continue
		}
		if cloudParamKeys[k] {
			setCloudParam(&ic.Properties, k, s)
			continue
		}
		if isRuleKey(k) {
			ic.Rules[k] = v
			continue
		}
	}

	svcProps := make(map[string]interface{})
	for k, v := range expanded {
		if reservedVarKeys[k] || strings.HasPrefix(k, "testUser") || cloudParamKeys[k] || isRuleKey(k) {
			continue
		}
		svcProps[k] = v
	}
	if raw, ok := expanded["test-identities"]; ok && raw != nil {
		svcProps["test-identities"] = raw
	}

	ic.Services = []types.ServiceConfig{{
		Type:       serviceType,
		Properties: svcProps,
	}}

	if ic.Properties.Provider == "" {
		return ic, fmt.Errorf("vars must include provider")
	}
	return ic, nil
}

func isRuleKey(k string) bool {
	switch k {
	case "permitted-regions", "permitted-destination-storage-accounts", "replication-locations":
		return true
	default:
		return strings.HasPrefix(k, "permitted-") || strings.HasPrefix(k, "replication-")
	}
}

func setCloudParam(cp *types.CloudParams, key, value string) {
	switch key {
	case "provider":
		cp.Provider = value
	case "region":
		cp.Region = value
	case "azure-subscription-id":
		cp.AzureSubscriptionID = value
	case "azure-resource-group":
		cp.AzureResourceGroup = value
	case "gcp-project-id":
		cp.GcpProjectId = value
	}
}

// ExpandVars substitutes ${VAR} / $VAR in Privateer vars using the process environment.
// Privateer does not expand YAML placeholders; the plugin must call this before use.
func ExpandVars(vars map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(vars))
	for k, v := range vars {
		out[k] = expandVarValue(v)
	}
	return out
}

func expandVarValue(v interface{}) interface{} {
	switch val := v.(type) {
	case string:
		return os.ExpandEnv(val)
	case map[string]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, inner := range val {
			out[k] = expandVarValue(inner)
		}
		return out
	case map[interface{}]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, inner := range val {
			out[fmt.Sprintf("%v", k)] = expandVarValue(inner)
		}
		return out
	default:
		return v
	}
}

// MergePrivateerVars copies Privateer vars into Props for Godog substitution (tags, resource, etc.).
// test-identities and testUser* keys are omitted (credentials stay in Config only).
func MergePrivateerVars(props map[string]interface{}, vars map[string]interface{}) {
	if props == nil || len(vars) == 0 {
		return
	}
	for k, v := range ExpandVars(vars) {
		if strings.HasPrefix(k, "testUser") {
			continue
		}
		props[k] = v
		if strings.Contains(k, "-") {
			props[kebabToTitleCase(k)] = v
		}
	}
}

// LoadEnvironment loads a legacy environment YAML file containing an instances: block.
func LoadEnvironment(path string) (*EnvironmentConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read environment file %s: %w", path, err)
	}
	expandedData := []byte(os.ExpandEnv(string(data)))

	var config EnvironmentConfig
	if err := yaml.Unmarshal(expandedData, &config); err != nil {
		return nil, fmt.Errorf("failed to parse environment file %s: %w", path, err)
	}
	return &config, nil
}

// FindInstance finds an instance by ID in a legacy environment file.
func FindInstance(config *EnvironmentConfig, id string) (*types.InstanceConfig, error) {
	for i, inst := range config.Instances {
		if inst.ID == id {
			return &config.Instances[i], nil
		}
	}
	ids := make([]string, len(config.Instances))
	for i, inst := range config.Instances {
		ids[i] = inst.ID
	}
	return nil, fmt.Errorf("instance '%s' not found (available: %s)", id, strings.Join(ids, ", "))
}

package runner

import (
	"fmt"
	"os"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"gopkg.in/yaml.v3"
)

// EnvironmentConfig is the top-level structure of an environment YAML file.
type EnvironmentConfig struct {
	Instances []types.InstanceConfig `yaml:"instances"`
}

// LoadEnvironment loads and parses an environment YAML file.
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

// FindInstance finds an instance by ID.
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

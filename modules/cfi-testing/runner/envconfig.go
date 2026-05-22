package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"gopkg.in/yaml.v3"
)

// LoadEnvironment loads and parses an environment.yaml file
func LoadEnvironment(path string) (*types.EnvironmentConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read environment file %s: %w", path, err)
	}
	
	// Native parameter substitution to handle variables like ${INSTANCE_ID}
	expandedData := []byte(os.ExpandEnv(string(data)))

	var config types.EnvironmentConfig
	if err := yaml.Unmarshal(expandedData, &config); err != nil {
		return nil, fmt.Errorf("failed to parse environment file %s: %w", path, err)
	}
	return &config, nil
}

// FindInstance finds an instance by ID - convenience wrapper on EnvironmentConfig
func FindInstance(config *types.EnvironmentConfig, id string) (*types.InstanceConfig, error) {
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

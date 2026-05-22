package runner

import (
	"fmt"
	"os"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"gopkg.in/yaml.v3"
)

// LoadPrivateerConfig reads services.<serviceID>.vars from a Privateer config YAML file.
// Uses yaml.Unmarshal so nested maps (e.g. test-identities) are preserved, then expands
// ${VAR}/$VAR placeholders via ExpandVars before wrapping as types.Config.
func LoadPrivateerConfig(path, serviceID string) (types.Config, error) {
	vars, err := loadPrivateerServiceVars(path, serviceID)
	if err != nil {
		return types.Config{}, err
	}
	return types.NewConfig(ExpandVars(vars)), nil
}

func loadPrivateerServiceVars(path, serviceID string) (map[string]interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read Privateer config %s: %w", path, err)
	}
	expanded := []byte(os.ExpandEnv(string(data)))

	var raw map[string]interface{}
	if err := yaml.Unmarshal(expanded, &raw); err != nil {
		return nil, fmt.Errorf("parse Privateer config %s: %w", path, err)
	}
	services, _ := raw["services"].(map[string]interface{})
	if services == nil {
		return nil, fmt.Errorf("no services block in %s", path)
	}
	svc, _ := services[serviceID].(map[string]interface{})
	if svc == nil {
		return nil, fmt.Errorf("service %q not found in %s", serviceID, path)
	}
	vars, _ := svc["vars"].(map[string]interface{})
	if vars == nil {
		return make(map[string]interface{}), nil
	}
	return vars, nil
}

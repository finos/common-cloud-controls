package discover

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Case is one service/cloud combination from a Privateer config under finos-integration/.
type Case struct {
	Name       string // stable id, e.g. aws-virtual-machines
	ConfigPath string // absolute path to YAML
	ServiceID  string // key under services: in the YAML
}

// Discover walks finos-integration privateer configs and returns test cases.
// Legacy duplicate dirs (serverless/, vms/) are skipped.
func Discover(configRoot string) ([]Case, error) {
	var cases []Case
	err := filepath.WalkDir(configRoot, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".yml") && !strings.HasSuffix(path, ".yaml") {
			return nil
		}
		rel, err := filepath.Rel(configRoot, path)
		if err != nil {
			return err
		}
		if skipConfig(rel) {
			return nil
		}
		serviceID, err := firstServiceID(path)
		if err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		cases = append(cases, Case{
			Name:       name,
			ConfigPath: path,
			ServiceID:  serviceID,
		})
		return nil
	})
	return cases, err
}

func skipConfig(rel string) bool {
	parts := strings.Split(rel, string(os.PathSeparator))
	if len(parts) == 0 {
		return false
	}
	switch parts[0] {
	case "serverless", "vms":
		return true
	default:
		return false
	}
}

func firstServiceID(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return "", err
	}
	services, _ := raw["services"].(map[string]interface{})
	if services == nil {
		return "", fmt.Errorf("no services block")
	}
	for id := range services {
		return id, nil
	}
	return "", fmt.Errorf("empty services block")
}

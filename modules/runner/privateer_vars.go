package runner

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"

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

// ResolvePrivateerCatalogPaths resolves services.<serviceID>.vars.catalog-locations
// from a Privateer config into absolute filesystem paths.
func ResolvePrivateerCatalogPaths(path, serviceID, repoRoot string) ([]string, error) {
	vars, err := loadPrivateerServiceVars(path, serviceID)
	if err != nil {
		return nil, err
	}

	rawCatalogs, ok := vars["catalog-locations"]
	if !ok || rawCatalogs == nil {
		return nil, fmt.Errorf("no vars.catalog-locations found for service %q in %s", serviceID, path)
	}

	catalogMap, ok := rawCatalogs.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("vars.catalog-locations must be a mapping in %s", path)
	}

	keys := make([]string, 0, len(catalogMap))
	for k := range catalogMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	resolved := make([]string, 0, len(keys))
	for _, key := range keys {
		raw := fmt.Sprintf("%v", catalogMap[key])
		if raw == "" {
			return nil, fmt.Errorf("vars.catalog-locations.%s is empty in %s", key, path)
		}
		if filepath.IsAbs(raw) {
			resolved = append(resolved, filepath.Clean(raw))
			continue
		}
		resolved = append(resolved, filepath.Clean(filepath.Join(repoRoot, raw)))
	}

	return resolved, nil
}

// SyncPrivateerCatalogs copies configured catalog files into destinationDir.
// Existing CCC*.yaml files in destinationDir are removed first.
func SyncPrivateerCatalogs(path, serviceID, repoRoot, destinationDir string) error {
	catalogPaths, err := ResolvePrivateerCatalogPaths(path, serviceID, repoRoot)
	if err != nil {
		return err
	}
	if len(catalogPaths) == 0 {
		return fmt.Errorf("no catalog paths resolved for service %q in %s", serviceID, path)
	}

	if err := os.MkdirAll(destinationDir, 0o755); err != nil {
		return fmt.Errorf("create destination dir %s: %w", destinationDir, err)
	}

	stale, err := filepath.Glob(filepath.Join(destinationDir, "CCC*.yaml"))
	if err != nil {
		return fmt.Errorf("list existing catalogs in %s: %w", destinationDir, err)
	}
	for _, oldPath := range stale {
		if err := os.Remove(oldPath); err != nil {
			return fmt.Errorf("remove existing catalog %s: %w", oldPath, err)
		}
	}

	for _, src := range catalogPaths {
		if err := copyFile(src, filepath.Join(destinationDir, filepath.Base(src))); err != nil {
			return err
		}
	}

	return nil
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open catalog %s: %w", src, err)
	}
	defer in.Close()

	info, err := in.Stat()
	if err != nil {
		return fmt.Errorf("stat catalog %s: %w", src, err)
	}
	if info.IsDir() {
		return fmt.Errorf("catalog path is a directory, expected file: %s", src)
	}

	out, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("create destination catalog %s: %w", dest, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return fmt.Errorf("copy catalog %s to %s: %w", src, dest, err)
	}
	return nil
}

func loadPrivateerServiceVars(path, serviceID string) (map[string]interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read Privateer config %s: %w", path, err)
	}

	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
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

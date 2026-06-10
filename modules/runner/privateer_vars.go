package runner

import (
	"fmt"
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

// ResolvePrivateerCatalogPaths resolves services.<serviceID>.vars.catalog-versions
// from a Privateer config into absolute filesystem paths.
func ResolvePrivateerCatalogPaths(path, serviceID, repoRoot string) ([]string, error) {
	vars, err := loadPrivateerServiceVars(path, serviceID)
	if err != nil {
		return nil, err
	}

	locations, err := ResolvePrivateerCatalogLocations(vars, repoRoot)
	if err != nil {
		return nil, fmt.Errorf("service %q in %s: %w", serviceID, path, err)
	}

	keys := make([]string, 0, len(locations))
	for catalogID := range locations {
		keys = append(keys, catalogID)
	}
	sort.Strings(keys)

	resolved := make([]string, 0, len(keys))
	for _, catalogID := range keys {
		resolved = append(resolved, locations[catalogID])
	}
	return resolved, nil
}

// SyncPrivateerCatalogs copies configured catalog files into destinationDir.
// Existing CCC*.yaml files in destinationDir are removed first.
// metadata.id in each controls artifact is rewritten to the catalog-versions key
// (e.g. CCC.SecMgmt) so privateer-sdk registers catalogs under policy.catalogs ids.
func SyncPrivateerCatalogs(path, serviceID, repoRoot, destinationDir string) error {
	locations, err := resolvePrivateerCatalogLocationsFromConfig(path, serviceID, repoRoot)
	if err != nil {
		return err
	}
	if len(locations) == 0 {
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

	for catalogID, src := range locations {
		dest := filepath.Join(destinationDir, filepath.Base(src))
		if err := copyCatalogControlsFile(src, dest, catalogID); err != nil {
			return err
		}
	}

	return nil
}

func resolvePrivateerCatalogLocationsFromConfig(path, serviceID, repoRoot string) (map[string]string, error) {
	vars, err := loadPrivateerServiceVars(path, serviceID)
	if err != nil {
		return nil, err
	}
	locations, err := ResolvePrivateerCatalogLocations(vars, repoRoot)
	if err != nil {
		return nil, fmt.Errorf("service %q in %s: %w", serviceID, path, err)
	}
	return locations, nil
}

func copyCatalogControlsFile(src, dest, catalogID string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("read catalog %s: %w", src, err)
	}
	patched, err := patchControlCatalogMetadataID(data, catalogID)
	if err != nil {
		return fmt.Errorf("catalog %s: %w", src, err)
	}
	if err := os.WriteFile(dest, patched, 0o644); err != nil {
		return fmt.Errorf("write destination catalog %s: %w", dest, err)
	}
	return nil
}

func patchControlCatalogMetadataID(data []byte, catalogID string) ([]byte, error) {
	var doc map[string]any
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parse catalog YAML: %w", err)
	}
	metadata, ok := doc["metadata"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("missing metadata block")
	}
	metadata["id"] = catalogID
	out, err := yaml.Marshal(doc)
	if err != nil {
		return nil, fmt.Errorf("marshal catalog YAML: %w", err)
	}
	return out, nil
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

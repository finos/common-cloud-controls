package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/runner"
	"github.com/spf13/viper"
)

// assessmentRequirementID matches Gemara assessment requirement ids (AR) in catalog YAML.
var assessmentRequirementID = regexp.MustCompile(`(?m)^\s+- id: (CCC\.[^\s]+\.AR\d+)\s*$`)

// websiteCatalogDir returns the canonical CCC release catalogs used by the website (temporary).
func websiteCatalogDir() string {
	if dir := os.Getenv("CCC_CATALOG_DIR"); dir != "" {
		return dir
	}
	return filepath.Join(runner.RepoRoot(), "website", "src", "data", "ccc-releases")
}

func catalogARsFromFile(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var arIDs []string
	for _, m := range assessmentRequirementID.FindAllStringSubmatch(string(data), -1) {
		arIDs = append(arIDs, m[1])
	}
	if len(arIDs) == 0 {
		return nil, fmt.Errorf("no assessment requirements found in %s", path)
	}
	return arIDs, nil
}

func findCatalogByIDInDir(dir, catalogID string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}
	var best string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasPrefix(name, catalogID) || !strings.HasSuffix(name, ".yaml") || strings.Contains(name, "release-details") {
			continue
		}
		if strings.Contains(name, "_DEV") {
			continue
		}
		path := filepath.Join(dir, name)
		if strings.Contains(name, "_v") {
			return path, nil
		}
		if best == "" {
			best = path
		}
	}
	if best != "" {
		return best, nil
	}
	return "", fmt.Errorf("no %s catalog YAML in %s", catalogID, dir)
}

func selectedCatalogIDs(privateerService string) []string {
	key := fmt.Sprintf("services.%s.policy.catalogs", privateerService)
	ids := viper.GetStringSlice(key)
	if len(ids) == 0 {
		ids = []string{"CCC.ObjStor"}
	}
	seen := map[string]struct{}{}
	var out []string
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func catalogLocationsFromVars(cfg types.Config) map[string]string {
	out := map[string]string{}
	raw := cfg.Vars()["catalog-locations"]
	if raw == nil {
		return out
	}
	switch m := raw.(type) {
	case map[string]string:
		for k, v := range m {
			out[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	case map[string]interface{}:
		for k, v := range m {
			out[strings.TrimSpace(k)] = strings.TrimSpace(fmt.Sprintf("%v", v))
		}
	case map[interface{}]interface{}:
		for k, v := range m {
			out[strings.TrimSpace(fmt.Sprintf("%v", k))] = strings.TrimSpace(fmt.Sprintf("%v", v))
		}
	}
	return out
}

func resolveCatalogPath(cfg types.Config, catalogID string) (string, error) {
	catalogID = strings.TrimSpace(catalogID)
	if catalogID == "" {
		return "", fmt.Errorf("catalog id is empty")
	}

	locations := catalogLocationsFromVars(cfg)
	if p := strings.TrimSpace(locations[catalogID]); p != "" {
		if filepath.IsAbs(p) {
			if _, err := os.Stat(p); err == nil {
				return p, nil
			}
			return "", fmt.Errorf("catalog path for %s does not exist: %s", catalogID, p)
		}
		candidates := []string{}
		if configPath := viper.ConfigFileUsed(); configPath != "" {
			candidates = append(candidates, filepath.Join(filepath.Dir(configPath), p))
		}
		candidates = append(candidates, filepath.Join(runner.RepoRoot(), p))
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				return c, nil
			}
		}
		return "", fmt.Errorf("catalog path for %s not found from %q (tried %v)", catalogID, p, candidates)
	}

	// Backward compatibility: if no explicit catalog-locations map is provided,
	// discover by prefix from CCC_CATALOG_DIR or website releases.
	dir := websiteCatalogDir()
	path, err := findCatalogByIDInDir(dir, catalogID)
	if err != nil {
		return "", err
	}
	return path, nil
}

func catalogARsForCatalog(cfg types.Config, catalogID string) ([]string, error) {
	path, err := resolveCatalogPath(cfg, catalogID)
	if err != nil {
		return nil, err
	}
	return catalogARsFromFile(path)
}

func allCatalogARs(cfg types.Config, catalogIDs []string) ([]string, error) {
	var out []string
	for _, catalogID := range catalogIDs {
		ars, err := catalogARsForCatalog(cfg, catalogID)
		if err != nil {
			return nil, fmt.Errorf("catalog %s: %w", catalogID, err)
		}
		out = append(out, ars...)
	}
	slices.Sort(out)
	return slices.Compact(out), nil
}

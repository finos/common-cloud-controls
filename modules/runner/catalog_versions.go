package runner

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const defaultCatalogReleasesDir = "website/src/data/ccc-releases"

// CatalogReleasesDir returns the directory containing compiled Gemara release YAMLs.
func CatalogReleasesDir(repoRoot string) string {
	if dir := os.Getenv("CCC_CATALOG_RELEASES_DIR"); dir != "" {
		return dir
	}
	return filepath.Join(repoRoot, defaultCatalogReleasesDir)
}

// ResolveCatalogControlPath resolves a catalog id and version to a local controls YAML.
// DEV catalogs are expected under website/src/data/ccc-releases after generate:catalogs.
// Other versions are resolved locally when present; otherwise a placeholder error is returned
// until published-release download is implemented.
func ResolveCatalogControlPath(catalogID, version, repoRoot string) (string, error) {
	catalogID = strings.TrimSpace(catalogID)
	version = strings.TrimSpace(version)
	if catalogID == "" {
		return "", fmt.Errorf("catalog id is required")
	}
	if version == "" {
		return "", fmt.Errorf("catalog version is required for %s", catalogID)
	}

	releasesDir := CatalogReleasesDir(repoRoot)
	path := filepath.Join(releasesDir, fmt.Sprintf("%s_%s-controls.yaml", catalogID, version))
	if _, err := os.Stat(path); err == nil {
		return path, nil
	}

	if strings.EqualFold(version, "DEV") {
		return "", fmt.Errorf(
			"DEV catalog %q not found under %s (run: npm run generate:catalogs --prefix website)",
			catalogID, releasesDir,
		)
	}

	// Placeholder for future download of published release artifacts.
	return "", fmt.Errorf(
		"release catalog %s@%s not found under %s; downloading published releases is not yet implemented",
		catalogID, version, releasesDir,
	)
}

func catalogVersionsFromVars(vars map[string]interface{}) (map[string]string, error) {
	raw, ok := vars["catalog-versions"]
	if !ok || raw == nil {
		return nil, fmt.Errorf("no vars.catalog-versions found")
	}

	versionMap, ok := raw.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("vars.catalog-versions must be a mapping")
	}

	out := make(map[string]string, len(versionMap))
	for key, value := range versionMap {
		catalogID := strings.TrimSpace(key)
		version := strings.TrimSpace(fmt.Sprintf("%v", value))
		if catalogID == "" {
			return nil, fmt.Errorf("vars.catalog-versions contains an empty catalog id")
		}
		if version == "" {
			return nil, fmt.Errorf("vars.catalog-versions.%s is empty", catalogID)
		}
		out[catalogID] = version
	}
	return out, nil
}

// ResolvePrivateerCatalogLocations resolves services vars catalog-versions to absolute paths.
func ResolvePrivateerCatalogLocations(vars map[string]interface{}, repoRoot string) (map[string]string, error) {
	versions, err := catalogVersionsFromVars(vars)
	if err != nil {
		return nil, err
	}

	keys := make([]string, 0, len(versions))
	for catalogID := range versions {
		keys = append(keys, catalogID)
	}
	sort.Strings(keys)

	out := make(map[string]string, len(keys))
	for _, catalogID := range keys {
		path, err := ResolveCatalogControlPath(catalogID, versions[catalogID], repoRoot)
		if err != nil {
			return nil, fmt.Errorf("catalog-versions.%s: %w", catalogID, err)
		}
		out[catalogID] = path
	}
	return out, nil
}

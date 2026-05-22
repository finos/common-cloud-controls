package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/finos/common-cloud-controls/runner"
)

// assessmentRequirementID matches Gemara assessment requirement ids (AR) in catalog YAML.
var assessmentRequirementID = regexp.MustCompile(`(?m)^\s+- id: (CCC\.[^\s]+\.AR\d+)\s*$`)

const objectStorageCatalogID = "CCC.ObjStor"

// websiteCatalogDir returns the canonical CCC release catalogs used by the website (temporary).
func websiteCatalogDir() string {
	if dir := os.Getenv("CCC_CATALOG_DIR"); dir != "" {
		return dir
	}
	return filepath.Join(runner.RepoRoot(), "website", "src", "data", "ccc-releases")
}

// objectStorageCatalogARs returns AR ids declared in the Object Storage release catalog.
func objectStorageCatalogARs() ([]string, error) {
	path, err := objectStorageCatalogPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var catalogARs []string
	for _, m := range assessmentRequirementID.FindAllStringSubmatch(string(data), -1) {
		catalogARs = append(catalogARs, m[1])
	}
	if len(catalogARs) == 0 {
		return nil, fmt.Errorf("no assessment requirements found in %s", path)
	}
	return catalogARs, nil
}

func objectStorageCatalogPath() (string, error) {
	dir := websiteCatalogDir()
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
		if !strings.HasPrefix(name, "CCC.ObjStor") || !strings.HasSuffix(name, ".yaml") || strings.Contains(name, "release-details") {
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
	return "", fmt.Errorf("no CCC.ObjStor catalog YAML in %s", dir)
}

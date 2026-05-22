package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/finos/common-cloud-controls/runner"
	"github.com/gemaraproj/go-gemara"
)

// assessmentRequirementID matches Gemara assessment requirement ids (AR/TR) in catalog YAML.
var assessmentRequirementID = regexp.MustCompile(`(?m)^\s+- id: (CCC\.[^\s]+\.(?:AR|TR)\d+)\s*$`)

const objectStorageCatalogID = "CCC.ObjStor"

// websiteCatalogDir returns the canonical CCC release catalogs used by the website (temporary).
func websiteCatalogDir() string {
	if dir := os.Getenv("CCC_CATALOG_DIR"); dir != "" {
		return dir
	}
	return filepath.Join(runner.RepoRoot(), "website", "src", "data", "ccc-releases")
}

// behaviouralStepsForObjStor builds assessment steps from the Object Storage catalog in website data.
func behaviouralStepsForObjStor() (map[string][]gemara.AssessmentStep, error) {
	path, err := objectStorageCatalogPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	step := runBehaviouralStep()
	steps := make(map[string][]gemara.AssessmentStep)
	for _, m := range assessmentRequirementID.FindAllStringSubmatch(string(data), -1) {
		steps[m[1]] = []gemara.AssessmentStep{step}
	}
	if len(steps) == 0 {
		return nil, fmt.Errorf("no assessment requirements found in %s", path)
	}
	return steps, nil
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

package main

import (
	"embed"
	"fmt"
	"path"
	"regexp"
	"strings"

	"github.com/privateerproj/privateer-sdk/pluginkit"
)

var controlsFilenamePattern = regexp.MustCompile(`^(CCC\.[A-Za-z0-9]+)_.+-controls\.ya?ml$`)

// releaseCatalogIDFromControlsFilename extracts the CCC release catalog id from a
// compiled controls filename such as CCC.SecMgmt_DEV-controls.yaml or
// CCC.Core_v2025.10-controls.yaml.
func releaseCatalogIDFromControlsFilename(filename string) (string, error) {
	base := strings.TrimSpace(filename)
	if i := strings.LastIndex(base, "/"); i >= 0 {
		base = base[i+1:]
	}
	m := controlsFilenamePattern.FindStringSubmatch(base)
	if len(m) != 2 {
		return "", fmt.Errorf("not a compiled controls filename: %q", filename)
	}
	return m[1], nil
}

func loadEmbeddedReferenceCatalogs(orchestrator *pluginkit.EvaluationOrchestrator, files embed.FS) error {
	entries, err := files.ReadDir("catalogs")
	if err != nil {
		return fmt.Errorf("read embedded catalogs: %w", err)
	}

	loaded := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".yaml") && !strings.HasSuffix(name, ".yml") {
			continue
		}

		releaseID, err := releaseCatalogIDFromControlsFilename(name)
		if err != nil {
			return fmt.Errorf("catalogs/%s: %w", name, err)
		}

		data, err := files.ReadFile(path.Join("catalogs", name))
		if err != nil {
			return fmt.Errorf("read catalogs/%s: %w", name, err)
		}

		if err := orchestrator.AddReferenceCatalogFromBytes(releaseID, data, name); err != nil {
			return fmt.Errorf("catalogs/%s: %w", name, err)
		}
		loaded++
	}

	if loaded == 0 {
		return fmt.Errorf("no control catalog YAML files found in embedded catalogs/")
	}
	return nil
}

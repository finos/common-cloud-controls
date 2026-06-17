package main

import (
	"fmt"
	"os"
	"regexp"
	"slices"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/runner"
	"github.com/spf13/viper"
)

// assessmentRequirementID matches Gemara assessment requirement ids (AR) in catalog YAML.
var assessmentRequirementID = regexp.MustCompile(`(?m)^\s+- id: (CCC\.[^\s]+\.AR\d+)\s*$`)

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

func resolveCatalogPath(cfg types.Config, catalogID string) (string, error) {
	catalogID = strings.TrimSpace(catalogID)
	if catalogID == "" {
		return "", fmt.Errorf("catalog id is empty")
	}

	locations, err := runner.ResolvePrivateerCatalogLocations(cfg.Vars(), runner.RepoRoot())
	if err != nil {
		return "", err
	}
	if p, ok := locations[catalogID]; ok {
		return p, nil
	}
	return "", fmt.Errorf("catalog %q is not listed in catalog-versions", catalogID)
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

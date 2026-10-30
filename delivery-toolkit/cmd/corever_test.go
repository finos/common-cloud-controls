package cmd

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// fakeHub serves core with a final release sandwiched between two rcs (the
// newest push is an rc), core.threats with rcs only, and 404 for anything else.
func fakeHub(t *testing.T) *httptest.Server {
	t.Helper()
	withFinal := `{"releases":[
		{"version":"v2026.10-rc","pushed_at":"2026-10-30T02:09:07.186178Z"},
		{"version":"v2026.10","pushed_at":"2026-10-29T20:00:00Z"},
		{"version":"v2026.10-rc1","pushed_at":"2026-10-29T12:46:37Z"},
		{"version":"v2025.10","pushed_at":"2025-10-15T18:18:32Z"}]}`
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/catalogs/finos-ccc/ccc.core.capabilities",
			"/v1/catalogs/finos-ccc/ccc.core.threats",
			"/v1/catalogs/finos-ccc/ccc.core.controls":
			_, _ = w.Write([]byte(withFinal))
		case "/v1/catalogs/finos-ccc/ccc.rconly.threats":
			_, _ = w.Write([]byte(`{"latest_version":"v2026.10-rc","releases":[{"version":"v2026.10-rc","pushed_at":"2026-10-30T02:09:07Z"}]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(hub.Close)
	return hub
}

func TestLatestFinalVersion(t *testing.T) {
	hub := fakeHub(t)
	ctx := context.Background()

	got, err := latestFinalVersion(ctx, hub.URL, "CCC.Core.Controls")
	if err != nil || got != "v2026.10" {
		t.Fatalf("got %q, %v; want v2026.10 (newest final, rcs skipped)", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.RcOnly.Threats"); err == nil || !strings.Contains(err.Error(), "no final release") {
		t.Errorf("rc-only: got %q, %v; want a no-final-release error", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.Missing.Controls"); err == nil || !strings.Contains(err.Error(), "no published version") {
		t.Errorf("missing: got %q, %v; want a no-published-version error", got, err)
	}
}

// TestCompiledMappingReferences compiles real catalogs and fails if any catalog
// an artifact refers to (imports or entry mappings) is missing from
// metadata.mapping-references, or carries the wrong version.
func TestCompiledMappingReferences(t *testing.T) {
	const release = "v9.9.9"
	hub := fakeHub(t)
	catalogs := filepath.Join("..", "..", "catalogs")
	groupDefs, err := loadGroupDefs(catalogs)
	if err != nil {
		t.Fatal(err)
	}

	for _, target := range []string{"core/core", "storage/object", "networking/vpc"} {
		meta, err := loadCatalogMetadata(catalogs, target)
		if err != nil {
			t.Fatal(err)
		}
		// Expected framework versions, read straight from the YAML: the
		// target's own declaration wins over core's registry.
		declared := map[string]string{}
		for _, path := range []string{filepath.Join(catalogs, coreMetadataPath), filepath.Join(catalogs, target, "metadata.yaml")} {
			raw, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			var src struct {
				Metadata struct {
					Refs []struct{ Id, Version string } `yaml:"mapping-references"`
				} `yaml:"metadata"`
			}
			if err := yaml.Unmarshal(raw, &src); err != nil {
				t.Fatal(err)
			}
			for _, r := range src.Metadata.Refs {
				declared[r.Id] = r.Version
			}
		}
		service := serviceNameFromTitle(meta.title)

		for _, typ := range []string{"capabilities", "threats", "controls"} {
			t.Run(target+"/"+typ, func(t *testing.T) {
				src := filepath.Join(catalogs, target, typ+".yaml")
				var artifact any
				switch typ {
				case "capabilities":
					artifact, err = compileCapabilities(src, meta.id, service, release, groupDefs)
				case "threats":
					artifact, err = compileThreats(src, meta.id, service, release, groupDefs)
				case "controls":
					artifact, err = compileControls(src, meta.id, service, release, groupDefs)
				}
				if err != nil {
					t.Fatal(err)
				}
				if err := setMappingReferences(context.Background(), artifact, meta, service, release, hub.URL); err != nil {
					t.Fatal(err)
				}

				out, err := yaml.Marshal(artifact)
				if err != nil {
					t.Fatal(err)
				}
				var doc map[string]any
				if err := yaml.Unmarshal(out, &doc); err != nil {
					t.Fatal(err)
				}
				md := doc["metadata"].(map[string]any)
				own := md["id"].(string)
				refs := map[string]string{}
				if list, ok := md["mapping-references"].([]any); ok {
					for _, r := range list {
						m := r.(map[string]any)
						refs[m["id"].(string)], _ = m["version"].(string)
					}
				}

				for id := range referencedCatalogs(doc) {
					if id == own {
						continue
					}
					want := declared[id]
					switch {
					case strings.HasPrefix(id, meta.id+"."):
						want = release
					case strings.HasPrefix(id, "CCC."):
						want = "v2026.10"
					}
					got, ok := refs[id]
					if !ok {
						t.Errorf("%s refers to %s, which is missing from mapping-references", own, id)
					} else if got != want {
						t.Errorf("%s: mapping-reference %s has version %q, want %q", own, id, got, want)
					}
				}
			})
		}
	}
}

// referencedCatalogs collects the reference-id of every mapping group (a map
// carrying `entries`) anywhere in the document.
func referencedCatalogs(v any) map[string]bool {
	found := map[string]bool{}
	var walk func(any)
	walk = func(v any) {
		switch n := v.(type) {
		case map[string]any:
			if _, ok := n["entries"]; ok {
				if id, ok := n["reference-id"].(string); ok {
					found[id] = true
				}
			}
			for _, c := range n {
				walk(c)
			}
		case []any:
			for _, c := range n {
				walk(c)
			}
		}
	}
	walk(v)
	return found
}

package cmd

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	gemara "github.com/gemaraproj/go-gemara"
	"gopkg.in/yaml.v3"
)

// fakeHub serves every CCC catalog with a final release sandwiched between two
// rcs, under a newer yanked final; ccc.rconly.threats with rcs only; and 404
// for ccc.missing.* and anything outside finos-ccc.
func fakeHub(t *testing.T) *httptest.Server {
	t.Helper()
	withFinal := `{"releases":[
		{"version":"v2026.11","pushed_at":"2026-10-30T03:00:00Z","tombstoned_at":"2026-10-30T04:00:00Z"},
		{"version":"v2026.10-rc","pushed_at":"2026-10-30T02:09:07.186178Z"},
		{"version":"v2026.10","pushed_at":"2026-10-29T20:00:00Z"},
		{"version":"v2026.10-rc1","pushed_at":"2026-10-29T12:46:37Z"},
		{"version":"v2025.10","pushed_at":"2025-10-15T18:18:32Z"}]}`
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		switch {
		case p == "/v1/catalogs/finos-ccc/ccc.rconly.threats":
			_, _ = w.Write([]byte(`{"releases":[{"version":"v2026.10-rc","pushed_at":"2026-10-30T02:09:07Z"}]}`))
		case strings.HasPrefix(p, "/v1/catalogs/finos-ccc/ccc.") && !strings.HasPrefix(p, "/v1/catalogs/finos-ccc/ccc.missing."):
			_, _ = w.Write([]byte(withFinal))
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

	got, err := latestFinalVersion(ctx, hub.URL, "CCC.Core.Controls", false)
	if err != nil || got != "v2026.10" {
		t.Fatalf("got %q, %v; want v2026.10 (newest live final; rcs and yanked skipped)", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.Core.Controls", true); err != nil || got != "v2026.10-rc" {
		t.Errorf("rc release: got %q, %v; want v2026.10-rc (newest live, rc allowed, yanked skipped)", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.RcOnly.Threats", false); err == nil || !strings.Contains(err.Error(), "no final release") {
		t.Errorf("rc-only: got %q, %v; want a no-final-release error", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.RcOnly.Threats", true); err != nil || got != "v2026.10-rc" {
		t.Errorf("rc-only, rc release: got %q, %v; want v2026.10-rc", got, err)
	}
	if got, err := latestFinalVersion(ctx, hub.URL, "CCC.Missing.Controls", false); err == nil || !strings.Contains(err.Error(), "no published version") {
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

	// Controls that cite an external framework with no ratified version yet, so
	// compile refuses them. Remove an entry once its metadata.yaml declares one.
	undeclared := map[string]bool{}

	metas, err := filepath.Glob(filepath.Join(catalogs, "*", "*", "metadata.yaml"))
	if err != nil || len(metas) == 0 {
		t.Fatalf("no catalogs found under %s: %v", catalogs, err)
	}
	for _, m := range metas {
		target, _ := filepath.Rel(catalogs, filepath.Dir(m))
		target = filepath.ToSlash(target)
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
				if _, err := os.Stat(src); err != nil {
					t.Skipf("no %s", src)
				}
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
				err = setMappingReferences(context.Background(), artifact, meta, service, release, hub.URL, nil)
				switch {
				case undeclared[target+"/"+typ] && err != nil && strings.Contains(err.Error(), "neither its metadata.yaml"):
					t.Skipf("known undeclared framework: %v", err)
				case undeclared[target+"/"+typ]:
					t.Fatalf("%s/%s now compiles: remove it from the undeclared list", target, typ)
				case err != nil:
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
				refs, urls := map[string]string{}, map[string]string{}
				if list, ok := md["mapping-references"].([]any); ok {
					for _, r := range list {
						m := r.(map[string]any)
						refs[m["id"].(string)], _ = m["version"].(string)
						urls[m["id"].(string)], _ = m["url"].(string)
					}
				}

				for id := range referencedCatalogs(doc) {
					if id == own {
						continue
					}
					// Siblings included: none is assumed to ship in this release.
					want := declared[id]
					if strings.HasPrefix(id, "CCC.") {
						want = "v2026.10"
					}
					got, ok := refs[id]
					if !ok {
						t.Errorf("%s refers to %s, which is missing from mapping-references", own, id)
					} else if got != want {
						t.Errorf("%s: mapping-reference %s has version %q, want %q", own, id, got, want)
					}
					if wantURL := "https://grc.store/finos-ccc/" + strings.ToLower(id); strings.HasPrefix(id, "CCC.") && urls[id] != wantURL {
						t.Errorf("%s: mapping-reference %s has url %q, want %q", own, id, urls[id], wantURL)
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

func TestCIBuildSkipsHub(t *testing.T) {
	// The hub URL is unreachable: a CI build must pin itself without asking it.
	tc := &gemara.ThreatCatalog{Imports: []gemara.MultiEntryMapping{{ReferenceId: "CCC.Core.Threats"}}}
	tc.Metadata.Id = "CCC.ObjStor.Threats"
	meta := sourceMeta{id: "CCC.ObjStor"}
	if err := setMappingReferences(context.Background(), tc, meta, "Object Storage", ciVersion, "http://127.0.0.1:1", nil); err != nil {
		t.Fatal(err)
	}
	if refs := tc.Metadata.MappingReferences; len(refs) != 1 || refs[0].Version != ciVersion {
		t.Fatalf("got %+v; want CCC.Core.Threats pinned to %s", refs, ciVersion)
	}
}

// TestSiblingPins checks a sibling that grc.store has never seen: a live run
// fails, and a dry run fails in the same place unless it built that sibling.
func TestSiblingPins(t *testing.T) {
	hub := fakeHub(t)
	compile := func(dryRunBuilt []string) (*gemara.ThreatCatalog, error) {
		tc := &gemara.ThreatCatalog{Imports: []gemara.MultiEntryMapping{{ReferenceId: "CCC.Missing.Capabilities"}, {ReferenceId: "CCC.Core.Threats"}}}
		tc.Metadata.Id = "CCC.Missing.Threats"
		return tc, setMappingReferences(context.Background(), tc, sourceMeta{id: "CCC.Missing"}, "Missing", "v9.9.9", hub.URL, dryRunBuilt)
	}
	for _, built := range [][]string{nil, {"controls"}} {
		if _, err := compile(built); err == nil || !strings.Contains(err.Error(), "release it first") {
			t.Errorf("dry-run-built %v: got %v; want a release-it-first error", built, err)
		}
	}
	tc, err := compile([]string{"capabilities"})
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	for _, r := range tc.Metadata.MappingReferences {
		got[r.Id] = r.Version
	}
	if got["CCC.Missing.Capabilities"] != "v9.9.9" || got["CCC.Core.Threats"] != "v2026.10" {
		t.Errorf("got %v; want the built sibling at v9.9.9 and core from the hub", got)
	}
}

func TestCompiledMappingDocuments(t *testing.T) {
	catalogs := filepath.Join("..", "..", "catalogs")
	const target = "compute/virtual-machines"
	meta, err := loadCatalogMetadata(catalogs, target)
	if err != nil {
		t.Fatal(err)
	}
	out := t.TempDir()
	if err := compileMappings(filepath.Join(catalogs, target), meta, "v9.9.9", out, target); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(out, target, "mappings", "threats-mitre-attack.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	var doc gemara.MappingDocument
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	for _, r := range doc.Metadata.MappingReferences {
		if r.Id == "CCC.VM.Threats" {
			if r.Version != "v9.9.9" || r.Url != "https://grc.store/finos-ccc/ccc.vm.threats" {
				t.Errorf("threats reference: got %+v", r)
			}
			return
		}
	}
	t.Errorf("no CCC.VM.Threats reference in %+v", doc.Metadata.MappingReferences)
}

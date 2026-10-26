package cmd

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	gemara "github.com/gemaraproj/go-gemara"
)

func TestArtifactCatalogID(t *testing.T) {
	tests := []struct {
		id, assetType, want string
	}{
		{"CCC.ObjStor", "capabilities", "CCC.ObjStor.Capabilities"},
		{"CCC.ObjStor", "threats", "CCC.ObjStor.Threats"},
		{"CCC.ObjStor", "controls", "CCC.ObjStor.Controls"},
		{" CCC.ObjStor ", "threats", "CCC.ObjStor.Threats"},
		{"CCC.ObjStor.Threats", "threats", "CCC.ObjStor.Threats"},
		{"CCC.ObjStor", "mappings", "CCC.ObjStor"},
	}
	for _, tt := range tests {
		if got := artifactCatalogID(tt.id, tt.assetType); got != tt.want {
			t.Errorf("artifactCatalogID(%q, %q) = %q, want %q", tt.id, tt.assetType, got, tt.want)
		}
	}
}

const testMappingDoc = `title: CCC Test Threats to MITRE ATT&CK
metadata:
  id: CCC.Test.Threats.threats-to-mitre-attack
  type: MappingDocument
  gemara-version: 1.2.0
  version: dev
  description: Maps CCC Test threats to MITRE ATT&CK.
  author:
    id: FINOS-CCC
    name: FINOS Common Cloud Controls
    type: Human
  mapping-references:
  - id: CCC.Test.Threats
    title: CCC Test Threats
    version: dev
  - id: MITRE-ATT&CK
    title: MITRE ATT&CK
    version: v16
source-reference:
  reference-id: CCC.Test.Threats
  entry-type: Threat
target-reference:
  reference-id: MITRE-ATT&CK
  entry-type: Vector
mappings:
- id: CCC.Test.TH01-mitre-attack
  source: CCC.Test.TH01
  relationship: relates-to
  targets:
  - entry-id: T1078
`

func TestCompileMappingsPinsThreatsCatalogVersion(t *testing.T) {
	src, out := t.TempDir(), t.TempDir()
	if err := os.MkdirAll(filepath.Join(src, "mappings"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(src, "mappings", "threats-mitre-attack.yaml"), []byte(testMappingDoc), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := compileMappings(src, sourceMeta{id: "CCC.Test"}, "v2026.10", out, "test"); err != nil {
		t.Fatal(err)
	}

	doc, err := gemara.Load[gemara.MappingDocument](context.Background(), fileFetcher{},
		filepath.Join(out, "test", "mappings", "threats-mitre-attack.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if doc.Metadata.Version != "v2026.10" {
		t.Errorf("metadata.version = %q, want v2026.10", doc.Metadata.Version)
	}
	versions := map[string]string{}
	for _, r := range doc.Metadata.MappingReferences {
		versions[r.Id] = r.Version
	}
	if versions["CCC.Test.Threats"] != "v2026.10" {
		t.Errorf("CCC.Test.Threats reference version = %q, want v2026.10", versions["CCC.Test.Threats"])
	}
	if versions["MITRE-ATT&CK"] != "v16" {
		t.Errorf("MITRE-ATT&CK reference version = %q, want v16 (unchanged)", versions["MITRE-ATT&CK"])
	}
}

// Every authored mapping document must name its threats catalog by the
// published ID; a stale <id>.TH would compile unpinned and dangle.
func TestSourceMappingsReferencePublishedThreatsCatalogID(t *testing.T) {
	docs, err := filepath.Glob(filepath.Join("..", "..", "catalogs", "*", "*", "mappings", "*.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if len(docs) == 0 {
		t.Fatal("no mapping documents found under catalogs/")
	}
	for _, path := range docs {
		svcDir := filepath.Dir(filepath.Dir(path))
		meta, err := loadSourceMetadata(filepath.Join(svcDir, "metadata.yaml"))
		if err != nil {
			t.Fatal(err)
		}
		doc, err := gemara.Load[gemara.MappingDocument](context.Background(), fileFetcher{}, path)
		if err != nil {
			t.Fatalf("loading %s: %v", path, err)
		}
		want := artifactCatalogID(meta.id, "threats")
		if doc.SourceReference.ReferenceId != want {
			t.Errorf("%s: source-reference.reference-id = %q, want %q", path, doc.SourceReference.ReferenceId, want)
		}
	}
}

package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	gemara "github.com/gemaraproj/go-gemara"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

// Compile turns the human-authored source files for one catalog asset into a
// single self-describing Gemara artifact that grcli can validate and publish.
// grcli does not compile; this is the bridge between ergonomic source
// (split metadata, imports-by-reference, no boilerplate) and a publishable,
// CUE-valid typed catalog.
var Compile = &cobra.Command{
	Use:   "compile",
	Short: "Compile a source catalog asset into one self-describing Gemara artifact (for grcli)",
	RunE:  runCompile,
}

func init() {
	Compile.Flags().String("type", "", "Asset type: capabilities | threats | controls")
	Compile.Flags().String("version", "", "Release version stamped into the artifact (e.g. v2026.04)")
}

var trailingDigits = regexp.MustCompile(`\d+$`)

// entryRef matches a CCC entry id like CCC.ObjStor.CP08 or CCC.Core.TH01,
// capturing the namespace (ObjStor / Core) and the type abbreviation (CP/CN/TH).
var entryRef = regexp.MustCompile(`^CCC\.([A-Za-z0-9]+)\.(CP|CN|TH)\d+$`)

var abbrToWord = map[string]string{"CP": "Capabilities", "CN": "Controls", "TH": "Threats"}

// groupDefsPath is the single source of truth for group definitions, relative
// to the catalogs directory. Entries reference these groups by id.
var groupDefsPath = filepath.Join("core", "ccc", "groups.yaml")

// defaultCoreVersion is used when a source catalog doesn't declare the CCC.Core
// mapping-reference version.
const defaultCoreVersion = "v2025.10"

// gemaraSpecVersion is the Gemara CUE spec version compiled artifacts target.
// Pinned locally because gemaraproj/go-gemara v0.5.0 still hardcodes
// SchemaVersion="v1.0.0"; bump here when go-gemara catches up.
const gemaraSpecVersion = "v1.2.0"

// coreImportName maps an asset type to the import/mapping-reference id used for
// the shared CCC Core catalog of that type.
var coreImportName = map[string]string{
	"capabilities": "CCC.Core.Capabilities",
	"threats":      "CCC.Core.Threats",
	"controls":     "CCC.Core.Controls",
}

var coreImportTitle = map[string]string{
	"CCC.Core.Capabilities": "CCC Core Capabilities",
	"CCC.Core.Threats":      "CCC Core Threats",
	"CCC.Core.Controls":     "CCC Core Controls",
}

func runCompile(cmd *cobra.Command, args []string) error {
	assetType, _ := cmd.Flags().GetString("type")
	version, _ := cmd.Flags().GetString("version")
	buildTarget := viper.GetString("build-target")
	catalogsDir := viper.GetString("catalogs-dir")
	outputDir := viper.GetString("output-dir")

	if buildTarget == "" || assetType == "" || version == "" {
		return fmt.Errorf("--build-target, --type and --version are all required")
	}
	if _, ok := coreImportName[assetType]; !ok {
		return fmt.Errorf("unknown --type %q (want: capabilities | threats | controls)", assetType)
	}

	groupDefs, err := loadGroupDefs(catalogsDir)
	if err != nil {
		return err
	}

	srcDir := filepath.Join(catalogsDir, buildTarget)
	meta, err := loadSourceMetadata(filepath.Join(srcDir, "metadata.yaml"))
	if err != nil {
		return err
	}
	service := serviceNameFromTitle(meta.title)

	var artifact any
	switch assetType {
	case "capabilities":
		artifact, err = compileCapabilities(filepath.Join(srcDir, "capabilities.yaml"), service, version, meta.coreVersion, groupDefs)
	case "threats":
		artifact, err = compileThreats(filepath.Join(srcDir, "threats.yaml"), service, version, meta.coreVersion, groupDefs)
	case "controls":
		artifact, err = compileControls(filepath.Join(srcDir, "controls.yaml"), service, version, meta.coreVersion, groupDefs)
	}
	if err != nil {
		return err
	}

	outPath := filepath.Join(outputDir, buildTarget, assetType+".yaml")
	if err := writeYAML(outPath, artifact); err != nil {
		return err
	}
	fmt.Printf("compiled %s/%s -> %s\n", buildTarget, assetType, outPath)
	return nil
}

type sourceMeta struct {
	id          string
	title       string
	coreVersion string // version of CCC.Core this catalog maps against
}

func loadSourceMetadata(path string) (sourceMeta, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return sourceMeta{}, fmt.Errorf("reading %s: %w", path, err)
	}
	var doc struct {
		Metadata struct {
			Id                string `yaml:"id"`
			Title             string `yaml:"title"`
			MappingReferences []struct {
				Id      string `yaml:"id"`
				Version string `yaml:"version"`
			} `yaml:"mapping-references"`
		} `yaml:"metadata"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return sourceMeta{}, fmt.Errorf("parsing %s: %w", path, err)
	}
	if doc.Metadata.Id == "" || doc.Metadata.Title == "" {
		return sourceMeta{}, fmt.Errorf("%s: metadata.id and metadata.title are required", path)
	}
	core := defaultCoreVersion
	for _, r := range doc.Metadata.MappingReferences {
		if r.Id == "CCC.Core" && r.Version != "" {
			core = r.Version
		}
	}
	return sourceMeta{id: doc.Metadata.Id, title: doc.Metadata.Title, coreVersion: core}, nil
}

// loadGroupDefs reads the canonical group definitions (the single source of
// truth) into a lookup keyed by group id.
func loadGroupDefs(catalogsDir string) (map[string]gemara.Group, error) {
	path := filepath.Join(catalogsDir, groupDefsPath)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading group definitions %s: %w", path, err)
	}
	var doc struct {
		Groups []gemara.Group `yaml:"groups"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	defs := make(map[string]gemara.Group, len(doc.Groups))
	for _, g := range doc.Groups {
		defs[g.Id] = g
	}
	if len(defs) == 0 {
		return nil, fmt.Errorf("%s defines no groups", path)
	}
	return defs, nil
}

// serviceNameFromTitle turns "FINOS CCC Object Storage" into "Object Storage".
func serviceNameFromTitle(title string) string {
	for _, p := range []string{"FINOS CCC ", "CCC "} {
		if after, found := strings.CutPrefix(title, p); found {
			return after
		}
	}
	return title
}

func compileCapabilities(path, service, version, coreVersion string, groupDefs map[string]gemara.Group) (*gemara.CapabilityCatalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	var src struct {
		Imported     []gemara.MultiEntryMapping `yaml:"imports"`
		Capabilities []gemara.Capability        `yaml:"capabilities"`
	}
	if err := yaml.Unmarshal(data, &src); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	if len(src.Capabilities) == 0 {
		return nil, fmt.Errorf("%s: no native capabilities to compile", path)
	}

	groups, err := resolveGroups(capabilityGroups(src.Capabilities), groupDefs)
	if err != nil {
		return nil, err
	}
	imports, refs := reshapeImports(src.Imported, "capabilities", coreVersion)

	return &gemara.CapabilityCatalog{
		Title: fmt.Sprintf("CCC %s Capabilities", service),
		Metadata: newMetadata(inferID(src.Capabilities[0].Id), gemara.CapabilityCatalogArtifact,
			fmt.Sprintf("Capabilities for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
			version, refs),
		Capabilities: src.Capabilities,
		Groups:       groups,
		Imports:      imports,
	}, nil
}

func compileThreats(path, service, version, coreVersion string, groupDefs map[string]gemara.Group) (*gemara.ThreatCatalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	// external-mappings in source is intentionally dropped — the published
	// ThreatCatalog schema has no such field.
	var src struct {
		Imported []gemara.MultiEntryMapping `yaml:"imports"`
		Threats  []gemara.Threat            `yaml:"threats"`
	}
	if err := yaml.Unmarshal(data, &src); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	if len(src.Threats) == 0 {
		return nil, fmt.Errorf("%s: no native threats to compile", path)
	}
	// Rewrite each threat's capability mappings from the source "CCC" shorthand
	// to the real per-catalog reference-ids (CCC.ObjStor.Capabilities / CCC.Core.Capabilities).
	for i := range src.Threats {
		src.Threats[i].Capabilities = regroupMappings(src.Threats[i].Capabilities)
	}
	groups, err := resolveGroups(threatGroups(src.Threats), groupDefs)
	if err != nil {
		return nil, err
	}
	imports, refs := reshapeImports(src.Imported, "threats", coreVersion)
	return &gemara.ThreatCatalog{
		Title: fmt.Sprintf("CCC %s Threats", service),
		Metadata: newMetadata(inferID(src.Threats[0].Id), gemara.ThreatCatalogArtifact,
			fmt.Sprintf("Threats for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
			version, refs),
		Threats: src.Threats,
		Groups:  groups,
		Imports: imports,
	}, nil
}

// sourceControl mirrors the source controls.yaml shape, which uses
// threats / guidelines keys that the published schema renames to
// threats / guidelines. State is not in source and defaults to Active.
type sourceControl struct {
	Id                     string                     `yaml:"id"`
	Title                  string                     `yaml:"title"`
	Objective              string                     `yaml:"objective"`
	Group                  string                     `yaml:"group"`
	AssessmentRequirements []sourceAR                 `yaml:"assessment-requirements"`
	ThreatMappings         []gemara.MultiEntryMapping `yaml:"threats"`
	GuidelineMappings      []gemara.MultiEntryMapping `yaml:"guidelines"`
}

type sourceAR struct {
	Id             string   `yaml:"id"`
	Text           string   `yaml:"text"`
	Applicability  []string `yaml:"applicability"`
	Recommendation string   `yaml:"recommendation"`
}

func compileControls(path, service, version, coreVersion string, groupDefs map[string]gemara.Group) (*gemara.ControlCatalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	var src struct {
		Imported []gemara.MultiEntryMapping `yaml:"imports"`
		Controls []sourceControl            `yaml:"controls"`
	}
	if err := yaml.Unmarshal(data, &src); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	if len(src.Controls) == 0 {
		return nil, fmt.Errorf("%s: no native controls to compile", path)
	}

	controls := make([]gemara.Control, len(src.Controls))
	entries := make([]entryGroup, len(src.Controls))
	appSeen := map[string]bool{}
	var appOrder []string
	for i, sc := range src.Controls {
		entries[i] = entryGroup{id: sc.Id, group: sc.Group}
		ars := make([]gemara.AssessmentRequirement, len(sc.AssessmentRequirements))
		for j, ar := range sc.AssessmentRequirements {
			ars[j] = gemara.AssessmentRequirement{
				Id:             ar.Id,
				Text:           ar.Text,
				Applicability:  ar.Applicability,
				Recommendation: ar.Recommendation,
				State:          gemara.LifecycleActive,
			}
			for _, a := range ar.Applicability {
				if !appSeen[a] {
					appSeen[a] = true
					appOrder = append(appOrder, a)
				}
			}
		}
		controls[i] = gemara.Control{
			Id:                     sc.Id,
			Title:                  sc.Title,
			Objective:              sc.Objective,
			Group:                  sc.Group,
			State:                  gemara.LifecycleActive,
			AssessmentRequirements: ars,
			// Rewrite per-control mappings to real catalog reference-ids; external
			// guideline frameworks (e.g. CCM) don't match and pass through unchanged.
			Threats:    regroupMappings(sc.ThreatMappings),
			Guidelines: regroupMappings(sc.GuidelineMappings),
		}
	}

	groups, err := resolveGroups(entries, groupDefs)
	if err != nil {
		return nil, err
	}
	imports, refs := reshapeImports(src.Imported, "controls", coreVersion)
	md := newMetadata(inferID(src.Controls[0].Id), gemara.ControlCatalogArtifact,
		fmt.Sprintf("Controls for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
		version, refs)
	// ControlCatalog requires applicability-groups that cover every assessment
	// requirement's applicability value; build them from what's referenced.
	md.ApplicabilityGroups = applicabilityGroups(appOrder)

	return &gemara.ControlCatalog{
		Title:    fmt.Sprintf("CCC %s Controls", service),
		Metadata: md,
		Controls: controls,
		Groups:   groups,
		Imports:  imports,
	}, nil
}

// entryGroup pairs an entry id with its referenced group id, for strict validation.
type entryGroup struct{ id, group string }

func capabilityGroups(caps []gemara.Capability) []entryGroup {
	out := make([]entryGroup, len(caps))
	for i, c := range caps {
		out[i] = entryGroup{id: c.Id, group: c.Group}
	}
	return out
}

func threatGroups(ts []gemara.Threat) []entryGroup {
	out := make([]entryGroup, len(ts))
	for i, t := range ts {
		out[i] = entryGroup{id: t.Id, group: t.Group}
	}
	return out
}

// resolveGroups enforces that every entry references a defined group and returns
// the definitions to inject, in order of first reference. Missing or unknown
// group ids are hard errors so grouping stays consistent across catalogs.
func resolveGroups(entries []entryGroup, defs map[string]gemara.Group) ([]gemara.Group, error) {
	var order []string
	seen := map[string]bool{}
	for _, e := range entries {
		id := strings.TrimSpace(e.group)
		if id == "" {
			return nil, fmt.Errorf("%s has no group; assign one of the groups defined in catalogs/%s", e.id, groupDefsPath)
		}
		if _, ok := defs[id]; !ok {
			return nil, fmt.Errorf("%s references undefined group %q; add it to catalogs/%s", e.id, id, groupDefsPath)
		}
		if !seen[id] {
			seen[id] = true
			order = append(order, id)
		}
	}
	out := make([]gemara.Group, 0, len(order))
	for _, id := range order {
		out = append(out, defs[id])
	}
	return out, nil
}

// regroupMappings re-buckets entry mappings by the catalog each entry actually
// references, deriving "CCC.<ns>.<Word>" from each entry id (e.g.
// CCC.ObjStor.CP08 -> CCC.ObjStor.Capabilities, CCC.Core.TH01 -> CCC.Core.Threats).
// Entries that don't match the CCC entry shape (external frameworks, guidelines)
// stay under their original group reference-id.
func regroupMappings(in []gemara.MultiEntryMapping) []gemara.MultiEntryMapping {
	if len(in) == 0 {
		return in
	}
	var order []string
	buckets := map[string][]gemara.ArtifactMapping{}
	for _, m := range in {
		for _, e := range m.Entries {
			ref := m.ReferenceId
			if g := entryRef.FindStringSubmatch(e.ReferenceId); g != nil {
				ref = "CCC." + g[1] + "." + abbrToWord[g[2]]
			}
			if _, ok := buckets[ref]; !ok {
				order = append(order, ref)
			}
			buckets[ref] = append(buckets[ref], e)
		}
	}
	out := make([]gemara.MultiEntryMapping, 0, len(order))
	for _, ref := range order {
		out = append(out, gemara.MultiEntryMapping{ReferenceId: ref, Entries: buckets[ref]})
	}
	return out
}

func newMetadata(id string, t gemara.ArtifactType, desc, version string, refs []gemara.MappingReference) gemara.Metadata {
	return gemara.Metadata{
		Id:                id,
		Type:              t,
		GemaraVersion:     gemaraSpecVersion,
		Version:           version,
		Description:       desc,
		Author:            gemara.Actor{Id: "FINOS-CCC", Name: "FINOS Common Cloud Controls", Type: gemara.Human},
		MappingReferences: refs,
	}
}

// inferID derives the per-type catalog id from the first native entry id by
// stripping its trailing number, e.g. "CCC.ObjStor.CP01" -> "CCC.ObjStor.CP".
func inferID(firstEntryID string) string {
	return trailingDigits.ReplaceAllString(firstEntryID, "")
}

// reshapeImports rewrites source imported-* sections (reference-id "CCC") into
// the published `imports` form (reference-id "CCC.Core.<Type>") and derives the
// matching mapping-references, versioned by the referenced catalog (coreVersion),
// not the artifact being compiled.
func reshapeImports(in []gemara.MultiEntryMapping, assetType, coreVersion string) ([]gemara.MultiEntryMapping, []gemara.MappingReference) {
	core := coreImportName[assetType]
	var out []gemara.MultiEntryMapping
	var refs []gemara.MappingReference
	seen := map[string]bool{}
	for _, m := range in {
		ref := m.ReferenceId
		if ref == "CCC" || ref == "" {
			ref = core
		}
		out = append(out, gemara.MultiEntryMapping{ReferenceId: ref, Entries: m.Entries, Remarks: m.Remarks})
		if !seen[ref] {
			seen[ref] = true
			refs = append(refs, gemara.MappingReference{Id: ref, Title: titleForRef(ref), Version: coreVersion})
		}
	}
	return out, refs
}

func titleForRef(ref string) string {
	if t, ok := coreImportTitle[ref]; ok {
		return t
	}
	return ref
}

func applicabilityGroups(ids []string) []gemara.Group {
	out := make([]gemara.Group, 0, len(ids))
	for _, id := range ids {
		title, desc := tlpMeta(id)
		out = append(out, gemara.Group{Id: id, Title: title, Description: desc})
	}
	return out
}

var tlpTitles = map[string]string{
	"tlp-red":   "TLP:RED",
	"tlp-amber": "TLP:AMBER",
	"tlp-green": "TLP:GREEN",
	"tlp-clear": "TLP:CLEAR",
}

func tlpMeta(id string) (string, string) {
	if t, ok := tlpTitles[id]; ok {
		return t, "Traffic Light Protocol sharing boundary " + t + "."
	}
	return id, "Applicability group " + id + "."
}

func writeYAML(path string, v any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("creating output dir: %w", err)
	}
	out, err := yaml.Marshal(v)
	if err != nil {
		return fmt.Errorf("marshaling YAML: %w", err)
	}
	if err := os.WriteFile(path, out, 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", path, err)
	}
	return nil
}

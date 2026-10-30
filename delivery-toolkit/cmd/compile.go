package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"

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
	Compile.Flags().String("type", "", "Asset type: capabilities | threats | controls | mappings")
	Compile.Flags().String("version", "", "Release version stamped into the artifact (e.g. v2026.04)")
	Compile.Flags().String("hub-url", defaultHubURL, "grc.store hub API used to look up the latest final release of each referenced CCC catalog")
}

var entryRef = regexp.MustCompile(`^CCC\.([A-Za-z0-9]+)\.(CP|CN|TH)\d+$`)

var abbrToWord = map[string]string{"CP": "Capabilities", "CN": "Controls", "TH": "Threats"}

// groupDefsPath is the single source of truth for group definitions, relative
// to the catalogs directory. Entries reference these groups by id.
var groupDefsPath = filepath.Join("core", "core", "groups.yaml")

// coreMetadataPath is core's metadata, relative to the catalogs directory. Its
// mapping-references are the registry of external frameworks (CCM, NIST, ...)
// that every catalog falls back to when it doesn't declare a framework itself.
var coreMetadataPath = filepath.Join("core", "core", "metadata.yaml")

// defaultHubURL is the grc.store hub API (the same default grcli uses).
const defaultHubURL = "https://hub.grc.store"

// ciVersion is the version gemara_check.yml compiles PRs with. Such a build is
// never published, so it pins other CCC catalogs to itself instead of asking
// the hub, and a hub outage cannot fail an unrelated PR.
const ciVersion = "v0.0.0-ci"

// hubNamespace is the grc.store namespace CCC catalogs publish under
// (the lowercased metadata.author.id stamped by newMetadata).
const hubNamespace = "finos-ccc"

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
	if _, ok := coreImportName[assetType]; !ok && assetType != "mappings" {
		return fmt.Errorf("unknown --type %q (want: capabilities | threats | controls | mappings)", assetType)
	}

	srcDir := filepath.Join(catalogsDir, buildTarget)
	meta, err := loadCatalogMetadata(catalogsDir, buildTarget)
	if err != nil {
		return err
	}
	service := serviceNameFromTitle(meta.title)

	// Mapping documents are already authored in canonical Gemara form (no
	// imports/shorthand to reshape), and a catalog may have several of them.
	// Compile them as a group, separate from the single-artifact asset types.
	if assetType == "mappings" {
		return compileMappings(srcDir, meta, version, outputDir, buildTarget)
	}

	groupDefs, err := loadGroupDefs(catalogsDir)
	if err != nil {
		return err
	}

	var artifact any
	switch assetType {
	case "capabilities":
		artifact, err = compileCapabilities(filepath.Join(srcDir, "capabilities.yaml"), meta.id, service, version, groupDefs)
	case "threats":
		artifact, err = compileThreats(filepath.Join(srcDir, "threats.yaml"), meta.id, service, version, groupDefs)
	case "controls":
		artifact, err = compileControls(filepath.Join(srcDir, "controls.yaml"), meta.id, service, version, groupDefs)
	}
	if err != nil {
		return err
	}
	hubURL, _ := cmd.Flags().GetString("hub-url")
	if err := setMappingReferences(cmd.Context(), artifact, meta, service, version, hubURL); err != nil {
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
	id    string
	title string
	refs  []gemara.MappingReference // declared external frameworks (CCM, NIST, ...)
}

func loadSourceMetadata(path string) (sourceMeta, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return sourceMeta{}, fmt.Errorf("reading %s: %w", path, err)
	}
	var doc struct {
		Metadata struct {
			Id                string                    `yaml:"id"`
			Title             string                    `yaml:"title"`
			MappingReferences []gemara.MappingReference `yaml:"mapping-references"`
		} `yaml:"metadata"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return sourceMeta{}, fmt.Errorf("parsing %s: %w", path, err)
	}
	if doc.Metadata.Id == "" || doc.Metadata.Title == "" {
		return sourceMeta{}, fmt.Errorf("%s: metadata.id and metadata.title are required", path)
	}
	meta := sourceMeta{id: doc.Metadata.Id, title: doc.Metadata.Title}
	for _, r := range doc.Metadata.MappingReferences {
		// CCC catalogs always resolve from the release or the hub, so a stale
		// source pin (e.g. CCC.Core at v2025.10) can never win.
		if !strings.HasPrefix(r.Id, "CCC.") {
			meta.refs = append(meta.refs, r)
		}
	}
	return meta, nil
}

// loadCatalogMetadata loads a build target's metadata and appends core's
// framework declarations after its own, so the target's declarations win.
func loadCatalogMetadata(catalogsDir, buildTarget string) (sourceMeta, error) {
	meta, err := loadSourceMetadata(filepath.Join(catalogsDir, buildTarget, "metadata.yaml"))
	if err != nil || meta.id == "CCC.Core" {
		return meta, err
	}
	core, err := loadSourceMetadata(filepath.Join(catalogsDir, coreMetadataPath))
	if err != nil {
		return sourceMeta{}, err
	}
	meta.refs = append(meta.refs, core.refs...)
	return meta, nil
}

// setMappingReferences declares every catalog the artifact refers to (imports
// and entry mappings) in metadata.mapping-references, each with its version:
//   - a sibling of this catalog (CCC.ObjStor.Threats -> CCC.ObjStor.Capabilities,
//     or core's own chain) ships in the same release, so it gets `version`;
//   - any other CCC catalog pins the latest final release on grc.store, or for
//     an rc release the newest live release, rc or final (a ciVersion build
//     pins `version` without asking the hub);
//   - anything else must be declared in the target's or core's metadata.yaml,
//     and is copied as declared.
func setMappingReferences(ctx context.Context, artifact any, meta sourceMeta, service, version, hubURL string) error {
	var md *gemara.Metadata
	var used []gemara.MultiEntryMapping
	switch a := artifact.(type) {
	case *gemara.CapabilityCatalog:
		md, used = &a.Metadata, a.Imports
	case *gemara.ThreatCatalog:
		md, used = &a.Metadata, a.Imports
		for _, t := range a.Threats {
			used = append(used, t.Capabilities...)
			used = append(used, t.Vectors...)
		}
	case *gemara.ControlCatalog:
		md, used = &a.Metadata, a.Imports
		for _, c := range a.Controls {
			used = append(used, c.Threats...)
			used = append(used, c.Guidelines...)
		}
	default:
		return fmt.Errorf("unsupported artifact %T", artifact)
	}

	seen := map[string]bool{md.Id: true}
	var refs []gemara.MappingReference
	var undeclared []string
	for _, m := range used {
		id := m.ReferenceId
		if seen[id] {
			continue
		}
		seen[id] = true
		switch {
		case strings.HasPrefix(id, meta.id+"."):
			word := strings.TrimPrefix(id, meta.id+".")
			refs = append(refs, gemara.MappingReference{Id: id, Title: fmt.Sprintf("CCC %s %s", service, word), Version: version})
		case strings.HasPrefix(id, "CCC."):
			v := version
			if version != ciVersion {
				var err error
				if v, err = latestFinalVersion(ctx, hubURL, id, strings.Contains(version, "-")); err != nil {
					return err
				}
			}
			refs = append(refs, gemara.MappingReference{Id: id, Title: titleForRef(id), Version: v})
		default:
			i := slices.IndexFunc(meta.refs, func(r gemara.MappingReference) bool { return r.Id == id && r.Version != "" })
			if i < 0 {
				undeclared = append(undeclared, id)
				continue
			}
			refs = append(refs, meta.refs[i])
		}
	}
	if len(undeclared) > 0 {
		return fmt.Errorf("%s refers to %s, which neither its metadata.yaml nor %s declares with a version in mapping-references", md.Id, strings.Join(undeclared, ", "), filepath.Join("catalogs", coreMetadataPath))
	}
	md.MappingReferences = refs
	return nil
}

// latestFinalVersion asks the grc.store hub for the latest final release of a
// CCC catalog (e.g. CCC.Core.Controls -> finos-ccc/ccc.core.controls). Release
// candidates (any version with a pre-release suffix, e.g. -rc1) are pinned only
// when allowRC is set, i.e. the release being compiled is itself an rc; yanked
// releases (tombstoned_at set; the hub still lists them) are never pinned. It
// fails rather than guessing when nothing qualifies.
func latestFinalVersion(ctx context.Context, hubURL, id string, allowRC bool) (string, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	url := fmt.Sprintf("%s/v1/catalogs/%s/%s", strings.TrimRight(hubURL, "/"), hubNamespace, strings.ToLower(id))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return "", fmt.Errorf("looking up latest %s version: %w", id, err)
	}
	defer resp.Body.Close() //nolint:errcheck
	if resp.StatusCode == http.StatusNotFound {
		return "", fmt.Errorf("%s has no published version on grc.store (%s returned 404): release it first", id, url)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("looking up latest %s version: %s returned %d", id, url, resp.StatusCode)
	}
	var body struct {
		Releases []struct {
			Version      string     `json:"version"`
			PushedAt     time.Time  `json:"pushed_at"`
			TombstonedAt *time.Time `json:"tombstoned_at"`
		} `json:"releases"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&body); err != nil {
		return "", fmt.Errorf("decoding %s: %w", url, err)
	}
	latest, at := "", time.Time{}
	for _, r := range body.Releases {
		if r.Version != "" && (allowRC || !strings.Contains(r.Version, "-")) && r.TombstonedAt == nil && r.PushedAt.After(at) {
			latest, at = r.Version, r.PushedAt
		}
	}
	if latest == "" && allowRC {
		return "", fmt.Errorf("%s has no live release on grc.store (%s lists only yanked releases or nothing): release %s first", id, url, id)
	}
	if latest == "" {
		return "", fmt.Errorf("%s has no final release on grc.store (%s lists only release candidates or nothing): release a final %s first; a final release never pins a release candidate", id, url, id)
	}
	return latest, nil
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

func compileCapabilities(path, catalogID, service, version string, groupDefs map[string]gemara.Group) (*gemara.CapabilityCatalog, error) {
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
	if len(src.Capabilities) == 0 && len(src.Imported) == 0 {
		return nil, fmt.Errorf("%s: no capabilities to compile", path)
	}

	groups, err := resolveGroups(capabilityGroups(src.Capabilities), groupDefs)
	if err != nil {
		return nil, err
	}
	imports := reshapeImports(src.Imported, "capabilities")

	return &gemara.CapabilityCatalog{
		Title: fmt.Sprintf("CCC %s Capabilities", service),
		Metadata: newMetadata(artifactCatalogID(catalogID, "capabilities"), gemara.CapabilityCatalogArtifact,
			fmt.Sprintf("Capabilities for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
			version),
		Capabilities: src.Capabilities,
		Groups:       groups,
		Imports:      imports,
	}, nil
}

func compileThreats(path, catalogID, service, version string, groupDefs map[string]gemara.Group) (*gemara.ThreatCatalog, error) {
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
	if len(src.Threats) == 0 && len(src.Imported) == 0 {
		return nil, fmt.Errorf("%s: no threats to compile", path)
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
	imports := reshapeImports(src.Imported, "threats")

	return &gemara.ThreatCatalog{
		Title: fmt.Sprintf("CCC %s Threats", service),
		Metadata: newMetadata(artifactCatalogID(catalogID, "threats"), gemara.ThreatCatalogArtifact,
			fmt.Sprintf("Threats for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
			version),
		Threats: src.Threats,
		Groups:  groups,
		Imports: imports,
	}, nil
}

// fileFetcher is a minimal gemara.Fetcher that reads from the local filesystem,
// letting us reuse go-gemara's codec (and its enum (un)marshalers) to decode
// MappingDocuments — gopkg.in/yaml.v3 cannot, since the enum UnmarshalYAML
// methods use the goccy/go-yaml signature.
type fileFetcher struct{}

func (fileFetcher) Fetch(_ context.Context, source string) (io.ReadCloser, error) {
	return os.Open(source)
}

// compileMappings compiles every MappingDocument under <srcDir>/mappings into
// the published output, restamping the spec version and aligning the source
// catalog's mapping-reference version to the release being built. Catalogs
// without a mappings directory are a no-op.
func compileMappings(srcDir string, meta sourceMeta, version, outputDir, buildTarget string) error {
	mapDir := filepath.Join(srcDir, "mappings")
	entries, err := os.ReadDir(mapDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("reading %s: %w", mapDir, err)
	}

	threatsCatalogID := artifactCatalogID(meta.id, "threats")
	legacyThreatsCatalogID := strings.TrimSpace(meta.id) + ".TH"
	ctx := context.Background()
	count := 0
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !(strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml")) {
			continue
		}
		src := filepath.Join(mapDir, name)
		doc, err := gemara.Load[gemara.MappingDocument](ctx, fileFetcher{}, src)
		if err != nil {
			return fmt.Errorf("loading mapping document %s: %w", src, err)
		}

		doc.Metadata.GemaraVersion = gemara.SchemaVersion
		doc.Metadata.Version = version
		// The source authors the threats catalog mapping-reference at "dev";
		// pin it to the release version actually being compiled and align any
		// legacy <id>.TH reference to the spelled-out <id>.Threats catalog ID.
		for i := range doc.Metadata.MappingReferences {
			if doc.Metadata.MappingReferences[i].Id == threatsCatalogID || doc.Metadata.MappingReferences[i].Id == legacyThreatsCatalogID {
				doc.Metadata.MappingReferences[i].Id = threatsCatalogID
				doc.Metadata.MappingReferences[i].Version = version
			}
		}
		if doc.SourceReference.ReferenceId == legacyThreatsCatalogID {
			doc.SourceReference.ReferenceId = threatsCatalogID
		}

		out := filepath.Join(outputDir, buildTarget, "mappings", name)
		if err := writeYAML(out, doc); err != nil {
			return err
		}
		count++
	}
	fmt.Printf("compiled %s mappings (%d document(s)) -> %s\n",
		buildTarget, count, filepath.Join(outputDir, buildTarget, "mappings"))
	return nil
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

func compileControls(path, catalogID, service, version string, groupDefs map[string]gemara.Group) (*gemara.ControlCatalog, error) {
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
	if len(src.Controls) == 0 && len(src.Imported) == 0 {
		return nil, fmt.Errorf("%s: no controls to compile", path)
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
	imports := reshapeImports(src.Imported, "controls")

	md := newMetadata(artifactCatalogID(catalogID, "controls"), gemara.ControlCatalogArtifact,
		fmt.Sprintf("Controls for %s technologies, as defined by the FINOS Common Cloud Controls project.", service),
		version)
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

func newMetadata(id string, t gemara.ArtifactType, desc, version string) gemara.Metadata {
	return gemara.Metadata{
		Id:            id,
		Type:          t,
		GemaraVersion: gemara.SchemaVersion,
		Version:       version,
		Description:   desc,
		Author:        gemara.Actor{Id: "FINOS-CCC", Name: "FINOS Common Cloud Controls", Type: gemara.Human},
	}
}

// artifactCatalogID derives the published per-type catalog id from metadata.id.
// Uses spelled-out type suffixes (.Capabilities, .Threats, .Controls) consistent
// with coreImportName and regroupMappings so lowercased catalog IDs never collide
// with country-code TLDs (.cn, .th).
func artifactCatalogID(catalogID, assetType string) string {
	base := strings.TrimSpace(catalogID)
	suffix := map[string]string{
		"capabilities": ".Capabilities",
		"threats":      ".Threats",
		"controls":     ".Controls",
	}[assetType]
	if suffix == "" || strings.HasSuffix(base, suffix) {
		return base
	}
	return base + suffix
}

// reshapeImports rewrites source imported-* sections (reference-id "CCC") into
// the published `imports` form (reference-id "CCC.Core.<Type>"). Their
// mapping-references are added by setMappingReferences.
func reshapeImports(in []gemara.MultiEntryMapping, assetType string) []gemara.MultiEntryMapping {
	core := coreImportName[assetType]
	var out []gemara.MultiEntryMapping
	for _, m := range in {
		ref := m.ReferenceId
		if ref == "CCC" || ref == "" {
			ref = core
		}
		out = append(out, gemara.MultiEntryMapping{ReferenceId: ref, Entries: m.Entries, Remarks: m.Remarks})
	}
	return out
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

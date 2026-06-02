package runner

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/reporters"
)

// Options configures a full compliance test run (CLI or Privateer plugin).
type Options struct {
	Config         types.Config
	Vars           map[string]interface{}
	InstanceID     string
	Service        string
	OutputDir      string
	Timeout        time.Duration
	ResourceFilter string
	Tags           []string
	CleanOutput    bool
}

// DefaultOptions returns options with sensible defaults for OutputDir and Timeout.
func DefaultOptions(testingDir string) Options {
	return Options{
		OutputDir:   filepath.Join(testingDir, "output"),
		Timeout:     30 * time.Minute,
		CleanOutput: true,
	}
}

// Run executes compliance tests for all matching services on the instance.
// Returns 0 on success, 1 on test failures or fatal configuration errors.
func Run(opts Options) int {
	if opts.InstanceID == "" {
		if len(opts.Config.Vars()) > 0 {
			if r := opts.Config.Get("resource"); r != "" {
				opts.InstanceID = r
			}
		} else if opts.Vars != nil {
			if r, _ := ExpandVars(opts.Vars)["resource"].(string); strings.TrimSpace(r) != "" {
				opts.InstanceID = strings.TrimSpace(r)
			}
		}
	}
	if opts.InstanceID == "" {
		opts.InstanceID = opts.Service
	}
	if opts.InstanceID == "" {
		log.Fatal("Error: set vars.resource in Privateer config")
	}
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Minute
	}

	var cfg types.Config
	if len(opts.Config.Vars()) > 0 {
		cfg = opts.Config
	} else if opts.Vars != nil {
		cfg = types.NewConfig(ExpandVars(opts.Vars))
	} else {
		log.Fatal("Error: Config or Vars is required (load from Privateer services.*.vars)")
	}

	cp := cfg.CloudParams()
	log.Printf("🚀 Starting CCC CFI Compliance Tests")
	log.Printf("   Instance: %s (%s)", opts.InstanceID, cp.Provider)
	log.Println()

	if opts.CleanOutput {
		log.Printf("🧹 Cleaning output directory: %s", opts.OutputDir)
		// Preserve non-runner artifacts in the root output directory (e.g. Privateer
		// files) and only clean runner-managed subdirectories.
		for _, subDir := range []string{"html", "ocsf"} {
			target := filepath.Join(opts.OutputDir, subDir)
			if err := os.RemoveAll(target); err != nil && !os.IsNotExist(err) {
				log.Printf("⚠️  Warning: Failed to clean %s: %v", target, err)
			}
		}
	}
	if err := os.MkdirAll(opts.OutputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}
	log.Printf("✅ Output directory ready")
	log.Println()

	if opts.Service == "" {
		log.Fatal("Error: service is required (Privateer vars.service)")
	}
	validService := false
	for _, st := range types.ServiceTypes {
		if st == opts.Service {
			validService = true
			break
		}
	}
	if !validService {
		log.Fatalf("Error: invalid service %q. Valid services are: %s", opts.Service, strings.Join(types.ServiceTypes, ", "))
	}
	log.Printf("   Service: %s", opts.Service)
	log.Println()

	runners := []ServiceRunner{
		NewBasicServiceRunner(RunConfig{
			ServiceName:    opts.Service,
			Config:         cfg,
			OutputDir:      opts.OutputDir,
			Timeout:        opts.Timeout,
			ResourceFilter: opts.ResourceFilter,
			Tags:           opts.Tags,
		}),
	}

	log.Printf("📋 Running %d service runner(s)", len(runners))
	log.Println()

	totalFailed := 0
	totalPassed := 0

	for i, r := range runners {
		log.Printf("🔧 Running service runner %d/%d", i+1, len(runners))
		exitCode := r.Run()
		if exitCode == 0 {
			totalPassed++
		} else {
			totalFailed++
		}
	}

	log.Println("\n🔗 Combining OCSF output files...")
	if err := combineOCSFFiles(opts.OutputDir); err != nil {
		log.Printf("⚠️  Warning: Failed to combine OCSF files: %v", err)
	} else {
		log.Printf("   ✅ Combined OCSF file created: %s", filepath.Join(opts.OutputDir, "ocsf", "combined.ocsf.json"))
	}

	log.Println("\n📋 Generating summary report...")
	htmlDir := filepath.Join(opts.OutputDir, "html")
	if err := reporters.GenerateSummaryReport(htmlDir); err != nil {
		log.Printf("⚠️  Warning: Failed to generate summary report: %v", err)
	} else {
		log.Printf("   ✅ Summary report created: %s", filepath.Join(htmlDir, "summary.html"))
	}

	log.Println("\n" + strings.Repeat("=", 60))
	log.Printf("📊 Overall Summary")
	log.Printf("   Total Runners: %d", len(runners))
	log.Printf("   Passed: %d", totalPassed)
	log.Printf("   Failed: %d", totalFailed)
	log.Println(strings.Repeat("=", 60))

	if totalFailed > 0 {
		log.Println("❌ Some runners had test failures")
		return 1
	}
	if len(runners) == 0 {
		log.Println("⚠️  No runners were executed")
		return 1
	}
	if totalPassed == 0 {
		log.Println("⚠️  No runners executed any tests")
		return 0
	}
	log.Println("✅ All runners passed")
	return 0
}

func combineOCSFFiles(outputDir string) error {
	ocsfDir := filepath.Join(outputDir, "ocsf")
	pattern := filepath.Join(ocsfDir, "*.ocsf.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("failed to find OCSF files: %w", err)
	}

	if len(files) == 0 {
		log.Printf("   No OCSF files found to combine")
		return nil
	}

	log.Printf("   Found %d OCSF file(s) to combine", len(files))

	var combined []interface{}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			log.Printf("   ⚠️  Warning: Failed to read %s: %v", filepath.Base(file), err)
			continue
		}
		var items []interface{}
		if err := json.Unmarshal(data, &items); err != nil {
			log.Printf("   ⚠️  Warning: Failed to parse %s: %v", filepath.Base(file), err)
			continue
		}
		combined = append(combined, items...)
		log.Printf("   Added %d item(s) from %s", len(items), filepath.Base(file))
	}

	combinedPath := filepath.Join(ocsfDir, "combined.ocsf.json")
	combinedData, err := json.MarshalIndent(combined, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal combined data: %w", err)
	}

	if err := os.WriteFile(combinedPath, combinedData, 0644); err != nil {
		return fmt.Errorf("failed to write combined file: %w", err)
	}

	log.Printf("   Total items in combined file: %d", len(combined))
	return nil
}

// ParseTags parses a space-separated tags string into Cucumber tag filters.
func ParseTags(tagsStr string) []string {
	if tagsStr == "" {
		return nil
	}
	parts := strings.Fields(tagsStr)
	tags := make([]string, 0, len(parts))
	for _, tag := range parts {
		if !strings.HasPrefix(tag, "@") && !strings.HasPrefix(tag, "~") {
			tag = "@" + tag
		}
		tags = append(tags, tag)
	}
	return tags
}

// RepoRoot returns the common-cloud-controls repository root.
func RepoRoot() string {
	_, filename, _, _ := runtime.Caller(0)
	// .../modules/runner/<file>.go -> repo root
	return filepath.Dir(filepath.Dir(filepath.Dir(filename)))
}

// TestingDir returns modules/cfi-testing (config, scripts, default output).
func TestingDir() string {
	return filepath.Join(RepoRoot(), "modules", "cfi-testing")
}

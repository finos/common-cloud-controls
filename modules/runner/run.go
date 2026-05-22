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
	Config         types.Config          // set from Privateer Vars (preferred)
	Instance       *types.InstanceConfig // legacy env-file path only
	Vars           map[string]interface{}
	InstanceID     string
	EnvFile        string
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
		log.Fatal("Error: instance ID is required")
	}
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Minute
	}

	var cfg types.Config
	var inst *types.InstanceConfig
	if len(opts.Config.Vars()) > 0 {
		cfg = opts.Config
	} else if opts.Vars != nil {
		cfg = types.NewConfig(ExpandVars(opts.Vars))
	} else if opts.Instance != nil {
		inst = opts.Instance
		cfg = types.ConfigFromInstance(*inst)
	} else {
		if opts.EnvFile == "" {
			log.Fatal("Error: env file path is required (or pass Config/Vars via Privateer)")
		}
		envConfig, err := LoadEnvironment(opts.EnvFile)
		if err != nil {
			log.Fatalf("Error loading environment file: %v", err)
		}
		inst, err = FindInstance(envConfig, opts.InstanceID)
		if err != nil {
			log.Fatalf("Error: %v", err)
		}
		cfg = types.ConfigFromInstance(*inst)
	}

	cp := cfg.CloudParams()
	log.Printf("🚀 Starting CCC CFI Compliance Tests")
	if inst != nil {
		log.Printf("   Instance: %s (%s)", inst.ID, cp.Provider)
	} else {
		log.Printf("   Instance: %s (%s)", opts.InstanceID, cp.Provider)
	}
	log.Println()

	if opts.CleanOutput {
		log.Printf("🧹 Cleaning output directory: %s", opts.OutputDir)
		if err := os.RemoveAll(opts.OutputDir); err != nil && !os.IsNotExist(err) {
			log.Printf("⚠️  Warning: Failed to clean output directory: %v", err)
		}
	}
	if err := os.MkdirAll(opts.OutputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}
	log.Printf("✅ Output directory ready")
	log.Println()

	servicesToRun := []types.ServiceConfig{{Type: opts.Service}}
	if inst != nil {
		servicesToRun = inst.Services
	}
	if opts.Service != "" {
		validService := false
		for _, st := range types.ServiceTypes {
			if st == opts.Service {
				validService = true
				break
			}
		}
		if !validService {
			log.Fatalf("Error: invalid service '%s'. Valid services are: %s", opts.Service, strings.Join(types.ServiceTypes, ", "))
		}
		if inst != nil {
			var filtered []types.ServiceConfig
			for _, svc := range inst.Services {
				if svc.Type == opts.Service {
					filtered = append(filtered, svc)
				}
			}
			if len(filtered) == 0 {
				log.Fatalf("Error: service '%s' is not defined in instance '%s'", opts.Service, inst.ID)
			}
			servicesToRun = filtered
		} else {
			servicesToRun = []types.ServiceConfig{{Type: opts.Service}}
		}
		log.Printf("   Service: %s", opts.Service)
		log.Println()
	}

	var runners []ServiceRunner
	for i := range servicesToRun {
		runners = append(runners, NewBasicServiceRunner(RunConfig{
			ServiceName:    servicesToRun[i].Type,
			Config:         cfg,
			OutputDir:      opts.OutputDir,
			Timeout:        opts.Timeout,
			ResourceFilter: opts.ResourceFilter,
			Tags:           opts.Tags,
		}))
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
		log.Printf("   ✅ Combined OCSF file created: %s", filepath.Join(opts.OutputDir, "combined.ocsf.json"))
	}

	log.Println("\n📋 Generating summary report...")
	if err := reporters.GenerateSummaryReport(opts.OutputDir); err != nil {
		log.Printf("⚠️  Warning: Failed to generate summary report: %v", err)
	} else {
		log.Printf("   ✅ Summary report created: %s", filepath.Join(opts.OutputDir, "summary.html"))
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
	pattern := filepath.Join(outputDir, "*ocsf.json")
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

	combinedPath := filepath.Join(outputDir, "combined.ocsf.json")
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

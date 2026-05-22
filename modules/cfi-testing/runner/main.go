package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/reporters"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var (
	instance       = flag.String("instance", "", "Instance ID from environment.yaml (e.g. main-aws, main-azure)")
	envFile        = flag.String("env-file", "", "Path to environment.yaml (default: environment.yaml in testing directory)")
	service        = flag.String("service", "", "Service type to test (object-storage, logging, block-storage, relational-database, iam, load-balancer, security-group, vpc). If not specified, tests all services defined in the instance.")
	outputDir      = flag.String("output", "", "Output directory for test reports (default: testing/output)")
	timeout        = flag.Duration("timeout", 30*time.Minute, "Timeout for all tests")
	resourceFilter = flag.String("resource", "", "Filter tests to a specific resource name")
	tags           = flag.String("tags", "", "Space-separated tag filters ANDed with service tags (e.g., '@CCC.Core.CN01 @Policy')")
)

func main() {
	flag.Parse()

	// Resolve the testing directory relative to this source file
	_, filename, _, _ := runtime.Caller(0)
	runnerDir := filepath.Dir(filename)
	testingDir := filepath.Dir(runnerDir)

	// Set default output directory
	if *outputDir == "" {
		*outputDir = filepath.Join(testingDir, "output")
	}

	// Set default env file path
	envFilePath := *envFile
	if envFilePath == "" {
		envFilePath = filepath.Join(testingDir, "environment.yaml")
	}

	// Validate required flags
	if *instance == "" {
		log.Fatal("Error: -instance flag is required (e.g. main-aws, main-azure, main-gcp)")
	}

	// Load types.yaml
	envConfig, err := LoadEnvironment(envFilePath)
	if err != nil {
		log.Fatalf("Error loading environment file: %v", err)
	}

	// Find the requested instance
	inst, err := FindInstance(envConfig, *instance)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}

	log.Printf("🚀 Starting CCC CFI Compliance Tests")
	log.Printf("   Instance: %s (%s)", inst.ID, inst.Properties.Provider)
	log.Println()

	// Prepare output directory
	log.Printf("🧹 Cleaning output directory: %s", *outputDir)
	if err := os.RemoveAll(*outputDir); err != nil && !os.IsNotExist(err) {
		log.Printf("⚠️  Warning: Failed to clean output directory: %v", err)
	}
	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}
	log.Printf("✅ Output directory ready")
	log.Println()

	// Determine which services to run from the instance definition
	servicesToRun := inst.Services
	if *service != "" {
		// Validate and filter to the requested service type
		validService := false
		for _, st := range types.ServiceTypes {
			if st == *service {
				validService = true
				break
			}
		}
		if !validService {
			log.Fatalf("Error: invalid service '%s'. Valid services are: %s", *service, strings.Join(types.ServiceTypes, ", "))
		}
		var filtered []types.ServiceConfig
		for _, svc := range inst.Services {
			if svc.Type == *service {
				filtered = append(filtered, svc)
			}
		}
		if len(filtered) == 0 {
			log.Fatalf("Error: service '%s' is not defined in instance '%s'", *service, inst.ID)
		}
		servicesToRun = filtered
		log.Printf("   Service: %s", *service)
		log.Println()
	}

	// Build one runner per service
	var runners []ServiceRunner
	for i := range servicesToRun {
		runners = append(runners, NewBasicServiceRunner(RunConfig{
			ServiceName:    servicesToRun[i].Type,
			Instance:       *inst,
			OutputDir:      *outputDir,
			Timeout:        *timeout,
			ResourceFilter: *resourceFilter,
			Tags:           parseTags(*tags),
		}))
	}

	log.Printf("📋 Running %d service runner(s)", len(runners))
	log.Println()

	// Run all service runners
	totalFailed := 0
	totalPassed := 0

	for i, runner := range runners {
		log.Printf("🔧 Running service runner %d/%d", i+1, len(runners))
		exitCode := runner.Run()

		if exitCode == 0 {
			totalPassed++
		} else {
			totalFailed++
		}
	}

	// Combine all OCSF files into a single file
	log.Println("\n🔗 Combining OCSF output files...")
	if err := combineOCSFFiles(*outputDir); err != nil {
		log.Printf("⚠️  Warning: Failed to combine OCSF files: %v", err)
	} else {
		log.Printf("   ✅ Combined OCSF file created: %s", filepath.Join(*outputDir, "combined.ocsf.json"))
	}

	// Generate summary report (summary.html + console)
	log.Println("\n📋 Generating summary report...")
	if err := reporters.GenerateSummaryReport(*outputDir); err != nil {
		log.Printf("⚠️  Warning: Failed to generate summary report: %v", err)
	} else {
		log.Printf("   ✅ Summary report created: %s", filepath.Join(*outputDir, "summary.html"))
	}

	// Print summary
	log.Println("\n" + strings.Repeat("=", 60))
	log.Printf("📊 Overall Summary")
	log.Printf("   Total Runners: %d", len(runners))
	log.Printf("   Passed: %d", totalPassed)
	log.Printf("   Failed: %d", totalFailed)
	log.Println(strings.Repeat("=", 60))

	if totalFailed > 0 {
		log.Println("❌ Some runners had test failures")
		os.Exit(1)
	} else if len(runners) == 0 {
		log.Println("⚠️  No runners were executed")
		os.Exit(1)
	} else if totalPassed == 0 {
		log.Println("⚠️  No runners executed any tests")
		os.Exit(0)
	} else {
		log.Println("✅ All runners passed")
		os.Exit(0)
	}
}

// combineOCSFFiles combines all *ocsf.json files in the output directory into a single combined_ocsf.json file
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

// parseTags parses a space-separated tags string into a slice of tags
func parseTags(tagsStr string) []string {
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

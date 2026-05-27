package runner

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"time"

	"github.com/cucumber/godog"
	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/generic/login"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/cloud-testing-dsl"
	"github.com/finos/common-cloud-controls/reporters"
	generic "github.com/robmoffat/standard-cucumber-steps/go"
)

// TestSuite for running cloud tests
type TestSuite struct {
	*cloud.CloudWorld
}

// NewTestSuite creates a new test suite
func NewTestSuite() *TestSuite {
	world := cloud.NewCloudWorld()
	return &TestSuite{
		CloudWorld: world,
	}
}

// setupServiceParams populates Props from a struct (using field names) or a map (using raw keys).
func (suite *TestSuite) setupServiceParams(params any) {
	v := reflect.ValueOf(params)

	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	switch v.Kind() {
	case reflect.Struct:
		t := v.Type()
		for i := 0; i < v.NumField(); i++ {
			field := t.Field(i)
			value := v.Field(i)
			suite.Props[field.Name] = value.Interface()
		}
	case reflect.Map:
		for _, key := range v.MapKeys() {
			suite.Props[fmt.Sprintf("%v", key.Interface())] = v.MapIndex(key).Interface()
		}
	}
}

// InitializeServiceScenario initializes the scenario context for service testing
func (suite *TestSuite) InitializeServiceScenario(sc *godog.ScenarioContext, params types.TestParams) {
	// Setup before each scenario
	sc.Before(func(ctx context.Context, s *godog.Scenario) (context.Context, error) {
		suite.Props = make(map[string]interface{})
		suite.AsyncManager = generic.NewAsyncTaskManager()
		suite.ClearAttachments()
		// Populate from top-level TestParams fields (UID, ResourceName, etc.)
		suite.setupServiceParams(params)
		// Populate Props (already enriched with CloudParams, service props, and rules)
		suite.setupServiceParams(params.Props)
		// Expose config so the factory can be created in cloud_steps.go
		suite.Props["Config"] = params.Config
		// Timestamp (ms since Unix epoch) for unique object names in immutable storage scenarios
		suite.Props["Timestamp"] = time.Now().UnixMilli()
		return ctx, nil
	})

	// Register all cloud steps (which includes generic steps)
	suite.RegisterSteps(sc)
}

// kebabToTitleCase converts a kebab-case string to TitleCase.
// e.g. "azure-storage-account" → "AzureStorageAccount"
func kebabToTitleCase(s string) string {
	parts := strings.Split(s, "-")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, "")
}

// enrichParamsProps populates params.Props with all instance-level properties so they are
// visible in the HTML report. Props are also used for step template substitution at runtime.
func enrichParamsProps(params types.TestParams) types.TestParams {
	if params.Props == nil {
		params.Props = make(map[string]interface{})
	}
	// CloudParams struct fields already use Go field names (TitleCase)
	cp := params.Config.CloudParams()
	cpVal := reflect.ValueOf(cp)
	cpType := cpVal.Type()
	for i := 0; i < cpVal.NumField(); i++ {
		s := fmt.Sprintf("%v", cpVal.Field(i).Interface())
		if s != "" {
			params.Props[cpType.Field(i).Name] = s
		}
	}
	// Alias Azure names to policy-standard names (CCC.ObjStor uses AccountName, ResourceGroup, SubscriptionId)
	if v, ok := params.Props["AzureStorageAccount"]; ok {
		params.Props["AccountName"] = v
	}
	if v, ok := params.Props["AzureResourceGroup"]; ok {
		params.Props["ResourceGroup"] = v
	}
	if v, ok := params.Props["AzureSubscriptionID"]; ok {
		params.Props["SubscriptionId"] = v
	}
	// Flat vars and rules (kebab-case) — convert to TitleCase for report/step substitution
	skipKeys := map[string]bool{
		"provider": true, "region": true,
		"azure-subscription-id": true, "azure-resource-group": true, "gcp-project-id": true,
		"test-identities": true,
	}
	for k, v := range params.Config.Vars() {
		if skipKeys[k] {
			continue
		}
		params.Props[kebabToTitleCase(k)] = v
	}
	return params
}

// BasicServiceRunner provides functionality for running service-specific compliance tests
type BasicServiceRunner struct {
	Config RunConfig
}

// NewBasicServiceRunner creates a new basic service runner
func NewBasicServiceRunner(config RunConfig) *BasicServiceRunner {
	return &BasicServiceRunner{
		Config: config,
	}
}

// GetConfig returns the run configuration
func (r *BasicServiceRunner) GetConfig() RunConfig {
	return r.Config
}

// Run executes the compliance tests (implements ServiceRunner interface)
func (r *BasicServiceRunner) Run() int {
	config := r.Config

	log.Printf("🚀 Starting CCC Compliance Tests")
	log.Printf("   Service: %s", config.ServiceName)
	cp := config.Config.CloudParams()
	log.Printf("   Provider: %s", cp.Provider)
	log.Println()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), config.Timeout)
	defer cancel()

	provider, err := config.Config.Provider()
	if err != nil {
		log.Fatalf("Failed to resolve provider: %v", err)
	}
	cloudFactory, err := factory.NewFactory(provider, config.Config)
	if err != nil {
		log.Fatalf("Failed to create factory: %v", err)
	}
	defer func() {
		log.Println("🧹 Running TearDown to remove test-created resources...")
		if strings.EqualFold(cp.Provider, "azure") {
			if err := login.RefreshAzureCLIForCleanup(); err != nil {
				log.Printf("   ⚠️  Azure re-login before TearDown: %v", err)
			}
		}
		if err := cloudFactory.TearDown(); err != nil {
			log.Printf("   ⚠️  TearDown completed with errors: %v", err)
		} else {
			log.Println("   ✅ TearDown complete")
		}
	}()

	// Get the service from the factory
	log.Printf("🔧 Getting service: %s", config.ServiceName)
	service, err := cloudFactory.GetServiceAPI(config.ServiceName)
	if err != nil {
		log.Fatalf("Failed to get service '%s': %v", config.ServiceName, err)
	}

	// Discover resources using GetOrProvisionTestableResources
	log.Println("🔍 Discovering testable resources...")
	resources, err := service.GetOrProvisionTestableResources()
	if err != nil {
		log.Fatalf("Failed to discover resources: %v", err)
	}

	if len(resources) > 0 {
		if resourcesJSON, err := json.MarshalIndent(resources, "   ", "  "); err == nil {
			log.Printf("   Resources:\n   %s", string(resourcesJSON))
		}
	}
	log.Println()

	featuresPaths, err := r.discoverFeaturePaths()
	if err != nil {
		log.Fatalf("Failed to discover feature paths: %v", err)
	}

	log.Printf("📂 Features Paths: %s", strings.Join(featuresPaths, ", "))
	log.Println()

	// Run tests for each resource
	stats := r.runTests(ctx, resources, featuresPaths)

	// Print summary
	r.printSummary(stats)

	// Return exit code
	// Note: Having no tests to run (Total == 0) is not a failure
	if stats.Failed > 0 {
		return 1
	}
	return 0
}

// TestStats tracks test execution statistics
type TestStats struct {
	Total   int
	Passed  int
	Failed  int
	Skipped int
}

// runTests executes tests for all resources
func (r *BasicServiceRunner) runTests(ctx context.Context, resources []types.TestParams, featuresPaths []string) TestStats {
	stats := TestStats{}

	for i, resource := range resources {
		// Skip resources that don't match the filter
		if r.Config.ResourceFilter != "" && resource.ResourceName != r.Config.ResourceFilter {
			continue
		}

		// Combine user-provided tags with service's tag filter using AND
		// This allows narrowing down tests (e.g., "--tags '@CCC.Core.CN01 @Policy'")
		if len(r.Config.Tags) > 0 {
			resource.TagFilter = append(resource.TagFilter, r.Config.Tags...)
		} else {
			// Default run: exclude @NEGATIVE and @OPT_IN scenarios so only @MAIN and
			// @Behavioural scenarios run unless the caller explicitly requests them via --tags.
			resource.TagFilter = append(resource.TagFilter, "~@NEGATIVE", "~@OPT_IN")
		}

		log.Printf("\n🔬 Running tests for resource %d/%d:", i+1, len(resources))
		if resourceJSON, err := json.MarshalIndent(resource, "   ", "  "); err == nil {
			log.Printf("   Resource: %s", string(resourceJSON))
		} else {
			log.Printf("   Resource: %+v", resource)
		}

		stats.Total++
		result := r.runResourceTest(ctx, resource, featuresPaths, resource.CatalogTypes)

		switch result {
		case "passed":
			stats.Passed++
			log.Printf("   ✅ PASSED")
		case "failed":
			stats.Failed++
			log.Printf("   ❌ FAILED")
		case "skipped":
			stats.Skipped++
			log.Printf("   ⏭️  SKIPPED")
		}
	}

	return stats
}

// runResourceTest runs tests for a single resource
func (r *BasicServiceRunner) runResourceTest(ctx context.Context, params types.TestParams, featuresPaths []string, catalogTypes []string) string {
	// Create a safe filename from ReportFile or fall back to ResourceName
	baseName := params.ReportFile
	if baseName == "" {
		baseName = params.ResourceName
	}
	filename := sanitizeFilename(baseName)
	reportPath := filepath.Join(r.Config.OutputDir, filename)

	// Create output directory if it doesn't exist
	outputDir := filepath.Dir(reportPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("Failed to create output directory: %v", err)
		return "failed"
	}

	// Run the godog tests
	suite := NewTestSuite()

	// Create HTML and OCSF output files
	htmlReportPath := reportPath + ".html"
	ocsfReportPath := reportPath + ".ocsf.json"

	// Enrich params.Props with instance/service/rules properties before creating the formatter
	// so they appear in the HTML report and are available for step template substitution.
	params = enrichParamsProps(params)

	// Create formatter factory
	formatterFactory := reporters.NewFormatterFactory(params, suite.CloudWorld)

	// Generate unique format names
	htmlFormat := fmt.Sprintf("html-%s", filename)
	ocsfFormat := fmt.Sprintf("ocsf-%s", filename)
	summaryFormat := "summary"
	privateerFormat := fmt.Sprintf("privateer-%s", filename)

	godog.Format(htmlFormat, "HTML report", formatterFactory.GetHTMLFormatterFunc())
	godog.Format(ocsfFormat, "OCSF report", formatterFactory.GetOCSFFormatterFunc())
	godog.Format(summaryFormat, "Summary report", formatterFactory.GetSummaryFormatterFunc())
	godog.Format(privateerFormat, "Privateer results", formatterFactory.GetPrivateerFormatterFunc())

	// Summary/privateer formatters collect to global; output path is unused (report generated at end of all runs)
	summaryOutputPath := filepath.Join(r.Config.OutputDir, "summary.html")

	// Log the tag filter (already set in runTests)
	tagFilterExpr := strings.Join(params.TagFilter, " && ")
	log.Printf("   Tag Filter: %s", tagFilterExpr)

	opts := godog.Options{
		Format:      fmt.Sprintf("%s:%s,%s:%s,%s:%s,%s:%s", htmlFormat, htmlReportPath, ocsfFormat, ocsfReportPath, summaryFormat, summaryOutputPath, privateerFormat, summaryOutputPath),
		Paths:       featuresPaths,
		Tags:        tagFilterExpr,
		Concurrency: 1,
		Strict:      true,
		NoColors:    false,
	}

	status := godog.TestSuite{
		Name: fmt.Sprintf("%s Test: %s", strings.Join(catalogTypes, "/"), params.ResourceName),
		ScenarioInitializer: func(sc *godog.ScenarioContext) {
			suite.InitializeServiceScenario(sc, params)
		},
		Options: &opts,
	}.Run()

	// Determine result
	if status == 0 {
		return "passed"
	} else if status == 2 {
		return "skipped"
	}
	return "failed"
}

// printSummary prints test execution summary
func (r *BasicServiceRunner) printSummary(stats TestStats) {
	log.Println("\n" + strings.Repeat("=", 60))
	log.Printf("📊 Test Summary")
	log.Printf("   Total Tests: %d", stats.Total)
	log.Printf("   Passed: %d", stats.Passed)
	log.Printf("   Failed: %d", stats.Failed)
	log.Printf("   Skipped: %d", stats.Skipped)
	log.Println(strings.Repeat("=", 60))

	if stats.Failed > 0 {
		log.Println("❌ Some tests failed")
	} else if stats.Total == 0 {
		log.Println("⚠️  No tests were run")
	} else {
		log.Println("✅ All tests passed")
	}
}

// discoverFeaturePaths returns Godog paths under modules/features/{service}/<catalog>/,
// always including modules/features/generic/ (shared CCC.Core scenarios).
// object-storage runs also include modules/features/port/ (PerPort TLS scenarios).
func (r *BasicServiceRunner) discoverFeaturePaths() ([]string, error) {
	return collectFeaturePaths(RepoRoot(), r.Config.ServiceName)
}

func collectFeaturePaths(repoRoot, serviceName string) ([]string, error) {
	featuresRoot := filepath.Join(repoRoot, "modules", "features")
	var paths []string

	appendCatalogDirs := func(serviceDir string) {
		entries, err := os.ReadDir(serviceDir)
		if err != nil {
			return
		}
		for _, entry := range entries {
			if entry.IsDir() {
				paths = append(paths, filepath.Join(serviceDir, entry.Name()))
			}
		}
	}

	serviceDir := filepath.Join(featuresRoot, serviceName)
	if info, err := os.Stat(serviceDir); err == nil && info.IsDir() {
		appendCatalogDirs(serviceDir)
	}

	appendCatalogDirs(filepath.Join(featuresRoot, "generic"))

	if serviceName == "object-storage" {
		appendCatalogDirs(filepath.Join(featuresRoot, "port"))
	}

	if len(paths) == 0 {
		return nil, fmt.Errorf("no feature directories under %s (service %q)", featuresRoot, serviceName)
	}
	return paths, nil
}

// sanitizeFilename removes characters that aren't safe for filenames
func sanitizeFilename(s string) string {
	result := ""
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			result += string(c)
		} else {
			result += "-"
		}
	}
	return result
}

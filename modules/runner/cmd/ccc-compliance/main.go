package main

import (
	"flag"
	"log"
	"os"
	"time"

	"github.com/finos/common-cloud-controls/runner"
)

var (
	privateerConfig  = flag.String("config", "", "Privateer config YAML (requires --privateer-service)")
	privateerService = flag.String("privateer-service", "", "Privateer services.<id> key (e.g. azureStorageBehavioural)")
	syncCatalogsDest = flag.String("sync-catalogs-dest", "", "Directory where resolved catalogs are copied")
	repoRoot         = flag.String("repo-root", "", "Repository root used to resolve relative catalog paths")
	syncCatalogsOnly = flag.Bool("sync-catalogs-only", false, "Resolve/sync catalogs and exit")
	service          = flag.String("service", "", "Override Privateer vars.service")
	outputDir        = flag.String("output", "", "Output directory for test reports")
	timeout          = flag.Duration("timeout", 30*time.Minute, "Timeout for all tests")
	resourceFilter   = flag.String("resource", "", "Filter tests to a specific resource name")
	tags             = flag.String("tags", "", "Space-separated tag filters ANDed with service tags")
)

func main() {
	flag.Parse()

	testingDir := runner.TestingDir()
	opts := runner.DefaultOptions(testingDir)
	opts.Timeout = *timeout
	opts.ResourceFilter = *resourceFilter
	opts.Tags = runner.ParseTags(*tags)

	if *outputDir != "" {
		opts.OutputDir = *outputDir
	}

	if *syncCatalogsDest != "" {
		if *privateerConfig == "" || *privateerService == "" {
			log.Fatal("Error: -config and -privateer-service are required with -sync-catalogs-dest")
		}
		effectiveRepoRoot := *repoRoot
		if effectiveRepoRoot == "" {
			effectiveRepoRoot = runner.RepoRoot()
		}
		if err := runner.SyncPrivateerCatalogs(*privateerConfig, *privateerService, effectiveRepoRoot, *syncCatalogsDest); err != nil {
			log.Fatalf("Error syncing catalogs: %v", err)
		}
		if *syncCatalogsOnly {
			return
		}
	}

	if *privateerConfig == "" || *privateerService == "" {
		log.Fatal("Error: -config and -privateer-service are required")
	}
	cfg, err := runner.LoadPrivateerConfig(*privateerConfig, *privateerService)
	if err != nil {
		log.Fatalf("Error loading Privateer config: %v", err)
	}
	vars := cfg.Vars()
	godogService := cfg.Get("service")
	if *service != "" {
		godogService = *service
	}
	if godogService == "" {
		log.Fatal("Error: vars.service is required in Privateer config")
	}
	runLabel := cfg.Get("resource")
	if runLabel == "" {
		runLabel = *privateerService
	}
	opts.Config = cfg
	opts.InstanceID = runLabel
	opts.Vars = vars
	opts.Service = godogService
	if t := cfg.Get("tags"); t != "" && *tags == "" {
		opts.Tags = runner.ParseTags(t)
	}

	os.Exit(runner.Run(opts))
}

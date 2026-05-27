package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/runner"
)

var (
	privateerConfig = flag.String("config", "", "Privateer config YAML (uses services.<name>.vars; requires --privateer-service)")
	privateerService  = flag.String("privateer-service", "", "Privateer services.<id> key (e.g. azureStorageBehavioural)")
	envFile           = flag.String("env-file", "", "Legacy environment YAML with instances: block")
	instance          = flag.String("instance", "", "Instance id (legacy env-file only)")
	service           = flag.String("service", "", "Service type (legacy env-file, or override Privateer vars.service)")
	outputDir         = flag.String("output", "", "Output directory for test reports")
	timeout           = flag.Duration("timeout", 30*time.Minute, "Timeout for all tests")
	resourceFilter    = flag.String("resource", "", "Filter tests to a specific resource name")
	tags              = flag.String("tags", "", "Space-separated tag filters ANDed with service tags")
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

	if *privateerConfig != "" {
		if *privateerService == "" {
			log.Fatal("Error: -privateer-service is required with -config (e.g. azureStorageBehavioural)")
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
	} else {
		opts.InstanceID = *instance
		if *envFile != "" {
			opts.EnvFile = *envFile
		} else {
			opts.EnvFile = filepath.Join(testingDir, "environment.yaml")
		}
		opts.Service = *service
		if opts.InstanceID == "" {
			log.Fatal("Error: -instance is required for legacy env-file mode, or use -config and -privateer-service")
		}
	}

	os.Exit(runner.Run(opts))
}

func stringVar(vars map[string]interface{}, key string) string {
	if v, ok := vars[key]; ok && v != nil {
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
	return ""
}

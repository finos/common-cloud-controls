package main

import (
	"flag"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/finos/common-cloud-controls/runner"
)

var (
	instance       = flag.String("instance", "", "Instance ID from environment.yaml (e.g. main-aws, main-azure)")
	envFile        = flag.String("env-file", "", "Path to environment.yaml (default: cfi-testing/environment.yaml)")
	service        = flag.String("service", "", "Service type to test; if empty, all services on the instance")
	outputDir      = flag.String("output", "", "Output directory for test reports")
	timeout        = flag.Duration("timeout", 30*time.Minute, "Timeout for all tests")
	resourceFilter = flag.String("resource", "", "Filter tests to a specific resource name")
	tags           = flag.String("tags", "", "Space-separated tag filters ANDed with service tags")
)

func main() {
	flag.Parse()

	testingDir := runner.TestingDir()
	opts := runner.DefaultOptions(testingDir)
	opts.InstanceID = *instance
	opts.Timeout = *timeout
	opts.ResourceFilter = *resourceFilter
	opts.Tags = runner.ParseTags(*tags)

	if *envFile != "" {
		opts.EnvFile = *envFile
	} else {
		opts.EnvFile = filepath.Join(testingDir, "environment.yaml")
	}
	if *outputDir != "" {
		opts.OutputDir = *outputDir
	}
	if *service != "" {
		opts.Service = *service
	}

	if opts.InstanceID == "" {
		log.Fatal("Error: -instance flag is required (e.g. main-aws, main-azure, main-gcp)")
	}

	os.Exit(runner.Run(opts))
}

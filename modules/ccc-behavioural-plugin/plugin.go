package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/reporters"
	"github.com/finos/common-cloud-controls/runner"
	"github.com/spf13/viper"
)

const pluginName = "ccc-behavioural-plugin"

var (
	behaviouralTestsOnce     sync.Once
	behaviouralTestsExitCode int
)

// ensureBehaviouralTestsRun executes the Godog suite once before the orchestrator evaluates.
// Godog may exit non-zero when scenarios fail; Mobilize still runs so Gemara YAML is written.
func ensureBehaviouralTestsRun() {
	behaviouralTestsOnce.Do(func() {
		reporters.ResetPrivateerCollector()
		behaviouralTestsExitCode = runBehavioural()
	})
}

func runBehavioural() int {
	privateerService := viper.GetString("service")
	if privateerService == "" {
		fmt.Fprintln(os.Stderr, "error: --service is required (must match a services.<id> entry in config)")
		return 1
	}

	cfg := loadPluginConfig(privateerService)
	vars := cfg.Vars()

	godogService := cfg.Get("service")
	if godogService == "" {
		fmt.Fprintln(os.Stderr, "error: services."+privateerService+".vars.service is required (e.g. object-storage)")
		return 1
	}

	runLabel := cfg.Get("resource")
	if runLabel == "" {
		runLabel = privateerService
	}

	writeDir := viper.GetString("write-directory")
	if writeDir == "" {
		writeDir = "evaluation_results"
	}
	if !filepath.IsAbs(writeDir) {
		if cwd, err := os.Getwd(); err == nil {
			writeDir = filepath.Join(cwd, writeDir)
		}
	}

	opts := runner.Options{
		Config:         cfg,
		InstanceID:     runLabel,
		Vars:           vars,
		Service:        godogService,
		OutputDir:      writeDir,
		Timeout:        30 * time.Minute,
		ResourceFilter: cfg.Get("resource"),
		Tags:           runner.ParseTags(cfg.Get("tags")),
		CleanOutput:    true,
	}

	if t := cfg.Get("timeout"); t != "" {
		if d, err := time.ParseDuration(t); err == nil {
			opts.Timeout = d
		}
	}
	if t := strings.TrimSpace(os.Getenv("CCC_RUNNER_TIMEOUT")); t != "" {
		if d, err := time.ParseDuration(t); err == nil {
			opts.Timeout = d
		}
	}
	if tags := strings.TrimSpace(os.Getenv("CCC_RUNNER_TAGS")); tags != "" {
		opts.Tags = runner.ParseTags(tags)
	}
	if r := strings.TrimSpace(os.Getenv("CCC_RUNNER_RESOURCE")); r != "" {
		opts.ResourceFilter = r
	}

	return runner.Run(opts)
}

func loadPluginConfig(privateerService string) types.Config {
	vars := make(map[string]interface{})

	if configFile := viper.ConfigFileUsed(); configFile != "" {
		if loaded, err := runner.LoadPrivateerConfig(configFile, privateerService); err == nil {
			for k, v := range loaded.Vars() {
				vars[k] = v
			}
		}
	}

	if len(vars) == 0 {
		varsKey := fmt.Sprintf("services.%s.vars", privateerService)
		var fromViper map[string]interface{}
		if err := viper.UnmarshalKey(varsKey, &fromViper); err == nil {
			for k, v := range fromViper {
				vars[k] = v
			}
		}
	}

	var globalVars map[string]interface{}
	if err := viper.UnmarshalKey("vars", &globalVars); err == nil {
		for k, v := range globalVars {
			if _, ok := vars[k]; !ok {
				vars[k] = v
			}
		}
	}
	return types.NewConfig(runner.ExpandVars(vars))
}

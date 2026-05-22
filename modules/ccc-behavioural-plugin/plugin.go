package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/runner"
	"github.com/privateerproj/privateer-sdk/shared"
	"github.com/spf13/viper"
)

const pluginName = "ccc-behavioural-plugin"

// BehaviouralPlugin runs CCC Godog behavioural checks via the runner library.
type BehaviouralPlugin struct{}

// Start is invoked by Privateer Core over go-plugin RPC.
func (p *BehaviouralPlugin) Start() (int, error) {
	code := runBehavioural()
	if code == 0 {
		return shared.TestPass, nil
	}
	return shared.TestFail, fmt.Errorf("behavioural compliance tests failed")
}

func runBehavioural() int {
	// Privateer --service names the services.<id> entry (e.g. azureStorageBehavioural).
	privateerService := viper.GetString("service")
	if privateerService == "" {
		fmt.Fprintln(os.Stderr, "error: --service is required (must match a services.<id> entry in config)")
		return 1
	}

	vars := viper.GetStringMap(fmt.Sprintf("services.%s.vars", privateerService))
	globalVars := viper.GetStringMap("vars")
	for k, v := range globalVars {
		if _, ok := vars[k]; !ok {
			vars[k] = v
		}
	}

	// Privateer passes YAML literals (e.g. cfi_test_${INSTANCE_ID}) without shell expansion.
	vars = runner.ExpandVars(vars)

	godogService := varString(vars, "service")
	if godogService == "" {
		fmt.Fprintln(os.Stderr, "error: services."+privateerService+".vars.service is required (e.g. object-storage)")
		return 1
	}

	// Prefer INSTANCE_ID from the shell (run-compliance-tests.sh); fall back to expanded instance-id.
	instanceID := strings.TrimSpace(os.Getenv("INSTANCE_ID"))
	if instanceID == "" {
		instanceID = varString(vars, "instance-id")
	}
	if instanceID == "" {
		instanceID = privateerService
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
		Config:         types.NewConfig(vars),
		InstanceID:     instanceID,
		Vars:           vars,
		Service:        godogService,
		OutputDir:      writeDir,
		Timeout:        30 * time.Minute,
		ResourceFilter: varString(vars, "resource"),
		Tags:           runner.ParseTags(varString(vars, "tags")),
		CleanOutput:    true,
	}

	if t := varString(vars, "timeout"); t != "" {
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

func varString(vars map[string]interface{}, key string) string {
	if v, ok := vars[key]; ok && v != nil {
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
	return ""
}

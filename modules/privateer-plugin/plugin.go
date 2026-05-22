package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/runner"
	"github.com/privateerproj/privateer-sdk/shared"
	"github.com/spf13/viper"
)

const pluginName = "privateer-plugin"

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
	serviceName := viper.GetString("service")
	if serviceName == "" {
		fmt.Fprintln(os.Stderr, "error: --service is required (must match a services.<id> entry in config)")
		return 1
	}

	vars := viper.GetStringMap(fmt.Sprintf("services.%s.vars", serviceName))
	globalVars := viper.GetStringMap("vars")
	for k, v := range globalVars {
		if _, ok := vars[k]; !ok {
			vars[k] = v
		}
	}

	instanceID := varString(vars, "instance")
	if instanceID == "" {
		fmt.Fprintln(os.Stderr, "error: services."+serviceName+".vars.instance is required")
		return 1
	}

	envFile := varString(vars, "env-file")
	if envFile == "" {
		envFile = filepath.Join(runner.TestingDir(), "environment.yaml")
	}
	if !filepath.IsAbs(envFile) {
		if cwd, err := os.Getwd(); err == nil {
			envFile = filepath.Join(cwd, envFile)
		}
	}

	if suffix := varString(vars, "instance-id"); suffix != "" {
		_ = os.Setenv("INSTANCE_ID", suffix)
	} else if strings.HasPrefix(instanceID, "cfi_test_") {
		_ = os.Setenv("INSTANCE_ID", strings.TrimPrefix(instanceID, "cfi_test_"))
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
		InstanceID:     instanceID,
		EnvFile:        envFile,
		Service:        varString(vars, "service"),
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

	return runner.Run(opts)
}

func varString(vars map[string]interface{}, key string) string {
	if v, ok := vars[key]; ok && v != nil {
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
	return ""
}

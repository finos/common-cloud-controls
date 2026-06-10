package main

import (
	"embed"
	"fmt"
	"os"

	"github.com/privateerproj/privateer-sdk/command"
	"github.com/privateerproj/privateer-sdk/pluginkit"
)

var (
	Version        = "0.0.0"
	VersionPostfix = "dev"
	GitCommitHash  = ""
	BuiltAt        = ""

	// RequiredVars must be present in services.*.vars (see Privateer config.NewConfig).
	RequiredVars = []string{"provider", "service"}
)

//go:embed catalogs
var embeddedCatalogs embed.FS

func main() {
	if VersionPostfix != "" {
		Version = fmt.Sprintf("%s-%s", Version, VersionPostfix)
	}

	orchestrator := pluginkit.EvaluationOrchestrator{
		PluginName:    pluginName,
		PluginVersion: Version,
		PluginUri:     "https://github.com/finos/common-cloud-controls",
	}
	orchestrator.AddRequiredVars(RequiredVars)

	// Load embedded plugin catalogs (registered under CCC release ids from filenames).
	if err := loadEmbeddedReferenceCatalogs(&orchestrator, embeddedCatalogs); err != nil {
		fmt.Fprintf(os.Stderr, "error loading catalog: %v\n", err)
		os.Exit(1)
	}

	// Evaluation suite is registered after Godog runs (see ensureBehaviouralEvaluationSuite).
	runCmd := command.NewPluginCommands(pluginName, Version, GitCommitHash, BuiltAt, &orchestrator)
	wrapBehaviouralCommands(runCmd)
	if err := runCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

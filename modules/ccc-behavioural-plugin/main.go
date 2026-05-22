package main

import (
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

	// Reference catalog: Object Storage release only (dir has many catalogs; loading all duplicates Core).
	catalogPath, err := objectStorageCatalogPath()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error resolving catalog: %v\n", err)
		os.Exit(1)
	}
	if err := orchestrator.AddReferenceCatalogFromFile(catalogPath); err != nil {
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

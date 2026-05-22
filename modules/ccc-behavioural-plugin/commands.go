package main

import (
	"github.com/privateerproj/privateer-sdk/command"
	"github.com/privateerproj/privateer-sdk/pluginkit"
	"github.com/privateerproj/privateer-sdk/shared"
	"github.com/spf13/cobra"
)

// BehaviouralPlugin runs Godog before Privateer evaluation.
type BehaviouralPlugin struct{}

func (p *BehaviouralPlugin) Start() (int, error) {
	err := mobilizeBehavioural()
	code := pluginkit.ExitCodeFor(command.ActiveEvaluationOrchestrator, nil)
	if err != nil {
		// Godog failures are reflected in the written Gemara suite; use TestFail not InternalError.
		if behaviouralTestsExitCode != 0 {
			return code, err
		}
		return pluginkit.ExitCodeFor(command.ActiveEvaluationOrchestrator, err), err
	}
	return code, nil
}

func wrapBehaviouralCommands(root *cobra.Command) {
	for _, cmd := range root.Commands() {
		if cmd.Use != "debug" {
			continue
		}
		cmd.Run = func(c *cobra.Command, args []string) {
			c.Print("Running in debug mode\n")
			if err := mobilizeBehavioural(); err != nil {
				c.Println(err)
			}
		}
	}

	root.Run = func(c *cobra.Command, args []string) {
		serveOpts := &shared.ServeOpts{Plugin: &BehaviouralPlugin{}}
		shared.Serve(pluginName, serveOpts)
	}
}

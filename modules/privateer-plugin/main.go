package main

import (
	"fmt"
	"os"

	"github.com/privateerproj/privateer-sdk/command"
	"github.com/privateerproj/privateer-sdk/shared"
	"github.com/spf13/cobra"
)

func main() {
	root := &cobra.Command{
		Use:   pluginName,
		Short: "CCC behavioural compliance tests (Godog)",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			command.ReadConfig()
		},
		Run: func(cmd *cobra.Command, args []string) {
			shared.Serve(pluginName, &shared.ServeOpts{Plugin: &BehaviouralPlugin{}})
		},
	}

	command.SetBase(root)

	root.AddCommand(&cobra.Command{
		Use:   "debug",
		Short: "Run behavioural tests in-process (no go-plugin host)",
		Run: func(cmd *cobra.Command, args []string) {
			command.ReadConfig()
			code := runBehavioural()
			if code != 0 {
				os.Exit(1)
			}
		},
	})

	root.AddCommand(&cobra.Command{
		Use:   "version",
		Short: "Show plugin version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("privateer-plugin dev")
		},
	})

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

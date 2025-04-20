package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/finos/common-cloud-controls/cmd"
)

// baseCmd represents the base command when called without any subcommands.
// This is the entry point of the CLI application.
var (
	// Version is to be replaced at build time by the associated tag
	Version = "0.0.0"

	// VersionPostfix is a marker for the version such as "dev", "beta", "rc", etc.
	VersionPostfix = "dev"

	// GitCommitHash is the commit at build time
	GitCommitHash = ""

	// BuiltAt is the actual build datetime
	BuiltAt = ""

	// baseCmd represents the base command when called without any subcommands
	baseCmd = &cobra.Command{
		Use:   "",
		Short: "test",
		PersistentPreRun: func(command *cobra.Command, args []string) {
			fmt.Println(cmd.Divider)
			fmt.Println(cmd.Logo)
		},
		PersistentPostRun: func(command *cobra.Command, args []string) {
			fmt.Println(cmd.Divider)
		},
		Run: func(command *cobra.Command, args []string) {
			fmt.Println("Welcome to the CCC Delivery Toolkit CLI v" + Version)

			fmt.Println(cmd.Divider)
			fmt.Println("You appear to be exploring!")
			fmt.Println("We suggest you begin by running the 'help' command via -h to review the available options.")
		},
	}
)

// init configures the base command and initializes the Viper configuration for various flags.
func init() {
	// Set & Bind Flags
	baseCmd.PersistentFlags().StringP("build-target", "t", "", "Name of the category and service (eg. storage/object)")
	baseCmd.PersistentFlags().StringP("output-dir", "o", ".", "Path to the directory where the compiled assets will be stored")
	baseCmd.PersistentFlags().StringP("services-dir", "", filepath.Join("..", "services"), "Path to the top level of the services directory")
	viper.BindPFlag("build-target", baseCmd.PersistentFlags().Lookup("build-target"))
	viper.BindPFlag("output-dir", baseCmd.PersistentFlags().Lookup("output-dir"))
	viper.BindPFlag("services-dir", baseCmd.PersistentFlags().Lookup("services-dir"))

	// Add subcommands
	baseCmd.AddCommand(cmd.VerifyContent)
	// baseCmd.AddCommand(cmd.UpdateMetadata)
	baseCmd.AddCommand(cmd.GenerateMarkdown)
	baseCmd.AddCommand(cmd.GenerateReleaseNotes)
	baseCmd.AddCommand(cmd.GenerateYaml)
}

// main is the entry point of the application.
func main() {
	if VersionPostfix != "" {
		Version = fmt.Sprintf("%s-%s", Version, VersionPostfix)
	}
	err := baseCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

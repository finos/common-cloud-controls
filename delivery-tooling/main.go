package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

var (
	// Version is to be replaced at build time by the associated tag
	Version = "0.0.0"
	// VersionPostfix is a marker for the version such as "dev", "beta", "rc", etc.
	VersionPostfix = "dev"
	// GitCommitHash is the commit at build time
	GitCommitHash = ""
	// BuiltAt is the actual build datetime
	BuiltAt = ""
	// ASCII art logo
	logo = "\033[34m     _____\033[35m_____\033[36m_____\n\033[34m    / ___/\033[35m ___/\033[36m ___/\n\033[34m   / /  \033[35m/ /  \033[36m/ / \n\033[34m  / /__\033[35m/ /__\033[36m/ /___ \n\033[34m  \\____/\033[35m____/\033[36m____/\n\033[37m"
	divider = fmt.Sprintf("\n%s\n", strings.Repeat("-", 40))
	// baseCmd represents the base command when called without any subcommands
	baseCmd = &cobra.Command{
		Use: "",
		Short: "test",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
		},
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
			fmt.Println("Welcome to the CCC Delivery Tooling CLI v" + Version)		
			fmt.Print(logo)
			fmt.Println(divider)
			fmt.Println("You appear to be exploring!")
			fmt.Println("We suggest you begin by running the 'help' command via -h to review the available options.")
			fmt.Println(divider)
		},
	}
)

func init() {
}

func main() {
	if VersionPostfix != "" {
		Version = fmt.Sprintf("%s-%s", Version, VersionPostfix)
	}
	err := baseCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

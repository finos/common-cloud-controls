package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
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
	baseCmd.PersistentFlags().StringP("build-target", "t", "", "Name of the category and service (eg. storage/object)")
	baseCmd.PersistentFlags().StringP("output-dir", "o", ".", "Path to the directory where the compiled assets will be stored")
	baseCmd.PersistentFlags().StringP("services-dir", "", filepath.Join("..", "services"), "Path to the top level of the services directory")
	viper.BindPFlag("build-target", baseCmd.PersistentFlags().Lookup("build-target"))
	viper.BindPFlag("output-dir", baseCmd.PersistentFlags().Lookup("output-dir"))
	viper.BindPFlag("services-dir", baseCmd.PersistentFlags().Lookup("services-dir"))
}

func checkArgs(){
	if viper.GetString("build-target") == "" {
		log.Fatal("--build-target is required")
	}
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

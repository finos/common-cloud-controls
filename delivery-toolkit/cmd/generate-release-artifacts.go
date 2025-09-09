package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var GenerateReleaseArtifacts = &cobra.Command{
	Use:   "generate-release-artifacts",
	Short: "Generate YAML, Markdown, and release notes artifacts in one step",
	Run: func(cmd *cobra.Command, args []string) {
		initializeOutputDirectory()

		if _, err := generateOmnibusYamlFile(); err != nil {
			fmt.Printf("Error generating YAML: %v\n", err)
			return
		}

		if _, err := generateOmnibusMdFile(); err != nil {
			fmt.Printf("Error generating Markdown: %v\n", err)
			return
		}

		if _, err := generateReleaseNotes(); err != nil {
			fmt.Printf("Error generating release notes: %v\n", err)
			return
		}

		fmt.Println("All release artifacts (YAML, Markdown, Release Notes) generated successfully.")
	},
}

package cmd

import (
	"fmt"
	"log"

	"github.com/spf13/cobra"
)

var GenerateReleaseArtifacts = &cobra.Command{
	Use:   "generate-release-artifacts",
	Short: "Generate YAML, Markdown, release notes, and OSCAL artifacts in one step",
	Run: func(cmd *cobra.Command, args []string) {
		catalog := readAndCompileCatalog()
		if catalog == nil {
			log.Print("error: no catalog data available to generate release artifacts")
		}

		initializeOutputDirectory()

		if _, err := generateOmnibusYamlFile(catalog); err != nil {
			log.Printf("Error generating YAML: %v\n", err)
			return
		}

		if _, err := generateOmnibusMdFile(catalog); err != nil {
			log.Printf("Error generating Markdown: %v\n", err)
			return
		}

		if _, err := generateReleaseNotes(catalog); err != nil {
			log.Printf("Error generating release notes: %v\n", err)
			return
		}

		if outputPath, err := generateOmnibusOSCALFile(catalog); err != nil {
			log.Printf("Error generating OSCAL: %v\n", err)
			return
		} else {
			log.Printf("OSCAL file generated successfully: %s\n", outputPath)
		}

		fmt.Println("All release artifacts (YAML, Markdown, Release Notes, OSCAL) generated successfully.")
	},
}

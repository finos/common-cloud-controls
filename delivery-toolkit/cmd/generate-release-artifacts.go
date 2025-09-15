package cmd

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var GenerateReleaseArtifacts = &cobra.Command{
	Use:   "generate-release-artifacts",
	Short: "Generate YAML, Markdown, release notes, and OSCAL artifacts in one step",
	Run: func(cmd *cobra.Command, args []string) {
		catalog := readAndCompileCatalog()
		if catalog == nil {
			log.Print("error: no catalog data available to generate release artifacts")
		}

		releaseDetails := getReleaseDetails(filepath.Join(viper.GetString("catalogs-dir"), viper.GetString("build-target")))
		if len(releaseDetails) == 0 {
			log.Print("error: no release details available to generate release artifacts")
		}

		initializeOutputDirectory()

		if _, err := generateOmnibusYamlFile(catalog); err != nil {
			log.Printf("Error generating YAML: %v\n", err)
			return
		}

		if _, err := generateReleaseDetailsYamlFile(releaseDetails); err != nil {
			log.Printf("Error generating release details YAML: %v\n", err)
			return
		}

		if _, err := generateOmnibusMdFile(catalog, releaseDetails); err != nil {
			log.Printf("Error generating Markdown: %v\n", err)
			return
		}

		if _, err := generateReleaseNotes(catalog, releaseDetails); err != nil {
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

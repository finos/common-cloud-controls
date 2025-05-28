package cmd

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Global Variables
var (
	releaseNotesTemplatePath = "templates/release-notes.md"
)

var (
	// baseCmd represents the base command when called without any subcommands
	GenerateReleaseNotes = &cobra.Command{
		Use:   "release-notes",
		Short: "",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			fmt.Print(Divider)
			fmt.Print(Logo)
			fmt.Println(Divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(Divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			// checkArgs()
			initializeOutputDirectory()

			outputPath, err := generateReleaseNotes()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("File generated successfully: %s\n", outputPath)
			}
		},
	}
)

// generateReleaseNotes generates the release notes based on the provided template
func generateReleaseNotes() (outputPath string, err error) {
	data := readAndCompileCatalog()

	mdFileName := "release_notes.md"
	outputPath = filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		err = fmt.Errorf("error creating output file %s: %w", outputPath, err)
		return
	}
	defer outputFile.Close()

	tmpl, err := template.ParseFiles(releaseNotesTemplatePath)
	if err != nil {
		err = fmt.Errorf("error parsing template file %s: %w", releaseNotesTemplatePath, err)
		return
	}

	err = tmpl.Execute(outputFile, data)
	if err != nil {
		err = fmt.Errorf("error executing template for file %s: %w", outputPath, err)
		return
	}

	return
}

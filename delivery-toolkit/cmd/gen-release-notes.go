package cmd

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	releaseNotesTemplatePath = "templates/release-notes.md"

	GenerateReleaseNotes = &cobra.Command{
		Use:   "release-notes",
		Short: "Generate release notes from the compiled data",
		Run:   runGenerateReleaseNotes,
	}
)

func runGenerateReleaseNotes(cmd *cobra.Command, args []string) {
	initializeOutputDirectory()

	outputPath, err := generateReleaseNotes()
	if err != nil {
		fmt.Printf("Error generating release notes: %v\n", err)
	} else {
		fmt.Printf("File generated successfully: %s\n", outputPath)
	}
}

func generateReleaseNotes() (string, error) {
	data := readAndCompileCatalog()
	if data == nil {
		return "", fmt.Errorf("no data available to generate release notes")
	}

	mdFileName := "release_notes.md"
	outputPath := filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return "", fmt.Errorf("error creating output file %s: %w", outputPath, err)
	}
	defer outputFile.Close()

	tmpl, err := template.New(filepath.Base(releaseNotesTemplatePath)).Funcs(template.FuncMap{
		"lastReleaseDetails": lastReleaseDetails,
	}).ParseFiles(releaseNotesTemplatePath)
	if err != nil {
		return "", fmt.Errorf("error parsing template file %s: %w", releaseNotesTemplatePath, err)
	}

	if err := tmpl.Execute(outputFile, data); err != nil {
		return "", fmt.Errorf("error executing template for file %s: %w", outputPath, err)
	}

	return outputPath, nil
}

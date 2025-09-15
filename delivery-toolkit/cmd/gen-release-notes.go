package cmd

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
)

var releaseNotesTemplatePath = "templates/release-notes.md"

func generateReleaseNotes(catalog *layer2.Catalog, releaseDetails []ReleaseDetails) (string, error) {
	data := CompiledCatalog{
		Catalog:        *catalog,
		ReleaseDetails: releaseDetails,
	}

	mdFileName := "release_notes.md"
	outputPath := filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return "", fmt.Errorf("error creating output file %s: %w", outputPath, err)
	}
	defer outputFile.Close()

	tmpl, err := template.New(filepath.Base(releaseNotesTemplatePath)).Funcs(template.FuncMap{
		"latestReleaseDetails": latestReleaseDetails,
	}).ParseFiles(releaseNotesTemplatePath)
	if err != nil {
		return "", fmt.Errorf("error parsing template file %s: %w", releaseNotesTemplatePath, err)
	}

	if err := tmpl.Execute(outputFile, data); err != nil {
		return "", fmt.Errorf("error executing template for file %s: %w", outputPath, err)
	}

	return outputPath, nil
}

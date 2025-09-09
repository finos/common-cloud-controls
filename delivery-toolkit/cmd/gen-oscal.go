package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
)

// generateOmnibusOSCALFile generates an OSCAL file from the compiled catalog data and returns the output path or an error.
func generateOmnibusOSCALFile(catalog *layer2.Catalog) (string, error) {
	controlHref := "https://example.com/releases/%s#%s" // TODO: Where do we want to point users to for the published artifact?
	oscalCatalog, err := catalog.ToOSCAL(controlHref)
	if err != nil {
		return "", fmt.Errorf("error converting to OSCAL: %w", err)
	}

	outputDir := viper.GetString("output-dir")
	oscalFileName := fmt.Sprintf("%s_%s.oscal.json", catalog.Metadata.Id, catalog.Metadata.Version)
	outputPath := filepath.Join(outputDir, oscalFileName)

	oscalBytes, err := json.MarshalIndent(oscalCatalog, "", "  ")
	if err != nil {
		return "", fmt.Errorf("error marshaling OSCAL JSON: %w", err)
	}

	if err := os.WriteFile(outputPath, oscalBytes, 0644); err != nil {
		return "", fmt.Errorf("error writing OSCAL file: %w", err)
	}

	return outputPath, nil
}

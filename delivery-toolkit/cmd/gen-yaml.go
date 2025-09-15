package cmd

import (
	"bytes"
	"fmt"
	"os"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

func generateOmnibusYamlFile(catalog *layer2.Catalog) (string, error) {
	var b bytes.Buffer
	yamlEncoder := yaml.NewEncoder(&b)
	yamlEncoder.SetIndent(2) // this is the line that sets the indentation
	err := yamlEncoder.Encode(catalog)
	if err != nil {
		return "", fmt.Errorf("error marshaling YAML: %w", err)
	}

	outputDir := viper.GetString("output-dir")
	yamlFileName := fmt.Sprintf("%s_%s.yaml", catalog.Metadata.Id, catalog.Metadata.Version)
	outputPath := fmt.Sprintf("%s/%s", outputDir, yamlFileName)

	if err := os.WriteFile(outputPath, b.Bytes(), 0644); err != nil {
		return "", fmt.Errorf("error writing YAML file: %w", err)
	}

	return outputPath, nil
}

func generateReleaseDetailsYamlFile(releaseDetails []ReleaseDetails) (string, error) {
	var b bytes.Buffer
	yamlEncoder := yaml.NewEncoder(&b)
	yamlEncoder.SetIndent(2) // this is the line that sets the indentation
	err := yamlEncoder.Encode(releaseDetails)
	if err != nil {
		return "", fmt.Errorf("error marshaling YAML: %w", err)
	}

	outputDir := viper.GetString("output-dir")
	yamlFileName := "release-details.yaml"
	outputPath := fmt.Sprintf("%s/%s", outputDir, yamlFileName)

	if err := os.WriteFile(outputPath, b.Bytes(), 0644); err != nil {
		return "", fmt.Errorf("error writing YAML file: %w", err)
	}

	return outputPath, nil
}

package cmd

import (
	"bytes"
	"fmt"
	"os"

	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

func generateOmnibusYamlFile() (string, error) {
	data := readAndCompileCatalog()
	if data == nil {
		return "", fmt.Errorf("no data available to generate YAML file")
	}

	var b bytes.Buffer
	yamlEncoder := yaml.NewEncoder(&b)
	yamlEncoder.SetIndent(2) // this is the line that sets the indentation
	err := yamlEncoder.Encode(&data)
	if err != nil {
		return "", fmt.Errorf("error marshaling YAML: %w", err)
	}

	outputDir := viper.GetString("output-dir")
	yamlFileName := fmt.Sprintf("%s_%s.yaml", data.Metadata.Id, data.Metadata.Version)
	outputPath := fmt.Sprintf("%s/%s", outputDir, yamlFileName)

	if err := os.WriteFile(outputPath, b.Bytes(), 0644); err != nil {
		return "", fmt.Errorf("error writing YAML file: %w", err)
	}

	return outputPath, nil
}

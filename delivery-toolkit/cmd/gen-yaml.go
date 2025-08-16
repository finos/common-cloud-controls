package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

var (
	GenerateYaml = &cobra.Command{
		Use:   "yaml",
		Short: "Generate a YAML file containing compiled data",
		Run:   runGenerateYaml,
	}
)

func runGenerateYaml(cmd *cobra.Command, args []string) {
	initializeOutputDirectory()

	outputPath, err := generateOmnibusYamlFile()
	if err != nil {
		fmt.Printf("Error generating YAML file: %v\n", err)
	} else {
		fmt.Printf("File generated successfully: %s\n", outputPath)
	}
}

func generateOmnibusYamlFile() (string, error) {
	data := readAndCompileCatalog()
	if data == nil {
		return "", fmt.Errorf("no data available to generate YAML file")
	}

	dataYaml, err := yaml.Marshal(&data)
	if err != nil {
		return "", fmt.Errorf("error marshaling YAML: %w", err)
	}

	outputDir := viper.GetString("output-dir")
	serviceName := data.Metadata.Id
	version := data.ReleaseDetails[len(data.ReleaseDetails)-1].Version
	yamlFileName := fmt.Sprintf("%s_%s.yaml", serviceName, version)
	outputPath := fmt.Sprintf("%s/%s", outputDir, yamlFileName)

	if err := os.WriteFile(outputPath, dataYaml, 0644); err != nil {
		return "", fmt.Errorf("error writing YAML file: %w", err)
	}

	return outputPath, nil
}

package cmd

import (
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

// yamlCmd represents the yaml command
// This command is responsible for generating a YAML file containing compiled data.
// It reads data from an unspecified source, compiles it, and writes it to a file in the specified output directory.
// The file name is constructed based on the service name and version from the compiled data.
var (
	// baseCmd represents the base command when called without any subcommands
	GenerateYaml = &cobra.Command{
		Use:   "yaml",
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

			outputPath, err := generateOmnibusYamlFile()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("File generated successfully: %s\n", outputPath)
			}
		},
	}
)

// generateOmnibusYamlFile creates a YAML file containing compiled data and returns its path.
//
// This function performs the following steps:
// 1. Reads and compiles data from an unspecified source.
// 2. Marshals the compiled data into YAML format.
// 3. Constructs a filename based on the service name and version from the compiled data.
// 4. Writes the YAML data to a file in the specified output directory.
//
// Returns:
//   - outputPath: The full path of the generated YAML file.
//   - err: An error if any step in the process fails, nil otherwise.
func generateOmnibusYamlFile() (outputPath string, err error) {
	// Read and compile data from an unspecified source
	data := readAndCompileCatalog()

	// Marshal the compiled data into YAML format
	dataYaml, err := yaml.Marshal(&data)
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	// Get the output directory from Viper configuration
	outputDir := viper.GetString("output-dir")

	// Extract service name and version from the compiled data
	serviceName := data.Metadata.Id
	version := data.ReleaseDetails[len(data.ReleaseDetails)-1].Version

	// Construct the YAML filename using service name and version
	yamlFileName := fmt.Sprintf("%s_%s.yaml", serviceName, version)

	// Write the YAML data to a file in the specified output directory
	err = os.WriteFile(fmt.Sprintf("%s/%s", outputDir, yamlFileName), dataYaml, 0644)
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	// Construct the full output path
	outputPath = fmt.Sprintf("%s/%s", outputDir, yamlFileName)

	return outputPath, err
}

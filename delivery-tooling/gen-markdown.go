package main

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	// baseCmd represents the base command when called without any subcommands
	mdCmd = &cobra.Command{
		Use: "md",
		Short: "",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			generateMdFile()
		},
	}
)

func init() {
	baseCmd.AddCommand(mdCmd)
}

func generateMdFile() {
	checkArgs()

	data := readAndCompile()
	
	// Generate the file
	err := generateFileFromTemplate(data)
	fmt.Println(err)
	// Shove the data into a template

	// Write template to MD file, and make it purrrty
	
	//dataYaml, err := yaml.Marshal(&data)
	//if err != nil {
	//	log.Fatalf("error: %v", err)
	//}
}

func generateFileFromTemplate(data CompiledData) error {
	serviceName := data.Metadata.ID
	version := data.Metadata.ReleaseDetails[len(data.Metadata.ReleaseDetails)-1].Version

	mdFileName := fmt.Sprintf("%s-%s.md", serviceName, version)
	
	outputPath := filepath.Join(viper.GetString("output-dir"), mdFileName)
	outputFile, err := os.Create(outputPath)

	if err != nil {
		return fmt.Errorf("error creating output file %s: %w", outputPath, err)
	}
	defer outputFile.Close()

	templatePath := "template.md"
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		return fmt.Errorf("error parsing template file %s: %w", templatePath, err)
	}

	err = tmpl.Execute(outputFile, data)
	if err != nil {
		return fmt.Errorf("error executing template for file %s: %w", outputPath, err)
	}

	return nil
}
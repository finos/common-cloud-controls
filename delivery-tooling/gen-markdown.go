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
			fmt.Print(divider)
			fmt.Print(logo)
			fmt.Println(divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			outputPath, err := generateMdFile()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("File generated successfully: %s\n", outputPath)
			}		
		},
	}
)

func init() {
	baseCmd.AddCommand(mdCmd)
}

func generateMdFile() (string, error) {
	checkArgs()

	data := readAndCompile()
	return generateFileFromTemplate(data)
}

func generateFileFromTemplate(data CompiledData) (outputPath string, err error) {
	serviceName := data.Metadata.ID
	version := data.Metadata.ReleaseDetails[len(data.Metadata.ReleaseDetails)-1].Version
	mdFileName := fmt.Sprintf("%s_%s.md", serviceName, version)
	outputPath = filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		err = fmt.Errorf("error creating output file %s: %w", outputPath, err)
		return
	}
	defer outputFile.Close()

	templatePath := "template.md"
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		err = fmt.Errorf("error parsing template file %s: %w", templatePath, err)
		return
	}

	err = tmpl.Execute(outputFile, data)
	if err != nil {
		err = fmt.Errorf("error executing template for file %s: %w", outputPath, err)
		return
	}

	return
}
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

var (
	// baseCmd represents the base command when called without any subcommands
	yamlCmd = &cobra.Command{
		Use: "yaml",
		Short: "",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			generateOmnibusYamlFile()
		},
	}
)


func init() {
	baseCmd.AddCommand(yamlCmd)
}

func generateOmnibusYamlFile() {
	checkArgs()

	data := readAndCompile()
	
	dataYaml, err := yaml.Marshal(&data)
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	outputDir := viper.GetString("output-dir")
	err = os.WriteFile(fmt.Sprintf("%s/compiled-controls.yaml", outputDir), dataYaml, 0644)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
}
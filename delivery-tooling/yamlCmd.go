package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

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
	yamlCmd.PersistentFlags().StringP("build-target", "t", "", "Name of the category and service (eg. storage/object)")
	yamlCmd.PersistentFlags().StringP("output-dir", "o", ".", "Path to the directory where the compiled assets will be stored")
	yamlCmd.PersistentFlags().StringP("services-dir", "", filepath.Join("..", "services"), "Path to the top level of the services directory")
	viper.BindPFlag("build-target", yamlCmd.PersistentFlags().Lookup("build-target"))
	viper.BindPFlag("output-dir", yamlCmd.PersistentFlags().Lookup("output-dir"))
	viper.BindPFlag("services-dir", yamlCmd.PersistentFlags().Lookup("services-dir"))
}

func checkArgs(){
	if viper.GetString("build-target") == "" {
		log.Fatal("--build-target is required")
	}
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
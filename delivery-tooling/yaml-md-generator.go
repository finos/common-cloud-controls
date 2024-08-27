package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

// ComponentDefinition represents the structure of the input YAML file.
type ComponentDefinition struct {
	CategoryID string    `yaml:"category_id"`
	Title      string    `yaml:"title"`
	Version    string    `yaml:"version"`
	Controls   []Control `yaml:"controls"`
}

// Control represents the structure of each control within the YAML file.
type Control struct {
	ID               string              `yaml:"id"`
	FeatureID        string              `yaml:"feature_id"`
	Title            string              `yaml:"title"`
	Objective        string              `yaml:"objective"`
	NISTCSF          string              `yaml:"nist_csf"`
	MITREAttack      string              `yaml:"mitre_attack"`
	ControlMappings  map[string][]string `yaml:"control_mappings"`
	TestRequirements map[string]string   `yaml:"test_requirements"`
}

func main() {
	// exit with a warning if no arguments are provided
	if len(os.Args) < 2 {
		log.Fatalf("[ERROR] Please provide a YAML file path as an argument.")
	}

	// if optional second arg is provided, use it as the output directory
	outputDir := "."
	if len(os.Args) > 2 {
		outputDir = os.Args[2]
	}

	// open file
	yamlFile, err := ioutil.ReadFile(os.Args[1])
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	// Unmarshal the YAML file into a struct
	var data ComponentDefinition
	err = yaml.Unmarshal(yamlFile, &data)
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	// Create or open the Markdown file based on the YAML id value
	mdFile, err := os.Create(fmt.Sprintf("%s/%s.md", outputDir, data.CategoryID))
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	defer mdFile.Close()

	// Write the Markdown content
	writeMarkdown(mdFile, data)
}

func writeMarkdown(file *os.File, data ComponentDefinition) {
	// Write the header
	fmt.Fprintf(file, "# %s: Object Storage\n\n", data.CategoryID)
	fmt.Fprintf(file, "| Control Id | Service Taxonomy Id | Control |\n")
	fmt.Fprintf(file, "| ---------- | ------------------- | ------- |\n")

	// Write the controls table
	for _, control := range data.Controls {
		fmt.Fprintf(file, "| %s  | %s          | %s |\n", control.ID, control.FeatureID, control.Title)
	}

	fmt.Fprintf(file, "\n---\n\n")

	// Write the details for each control
	for _, control := range data.Controls {
		fmt.Fprintf(file, "## %s: %s\n\n", control.ID, control.Title)
		fmt.Fprintf(file, "- Corresponding Feature: %s\n", control.FeatureID)
		fmt.Fprintf(file, "- NIST CSF: %s\n", control.NISTCSF)
		fmt.Fprintf(file, "- MITRE ATT&CK TTP: %s\n\n", control.MITREAttack)
		fmt.Fprintf(file, "### Objective\n\n")
		fmt.Fprintf(file, "%s\n\n", control.Objective)
		fmt.Fprintf(file, "### Control Mappings\n\n")

		for key, values := range control.ControlMappings {
			fmt.Fprintf(file, "- %s: %s\n", key, formatList(values))
		}

		fmt.Fprintf(file, "\n### Testing Requirements\n\n")
		fmt.Fprintf(file, "The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:\n\n")

		for key, value := range control.TestRequirements {
			test_requirement_id := fmt.Sprintf("%s.%s", control.ID, key)
			fmt.Fprintf(file, "1. **%s**: %s\n", test_requirement_id, value)
		}

		fmt.Fprintf(file, "\n---\n\n")
	}
}

func formatList(items []string) string {
	result := ""
	for i, item := range items {
		if i > 0 {
			result += ", "
		}
		result += item
	}
	return result
}

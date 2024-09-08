package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

type CompiledData struct {
	Metadata Metadata
	
	// These lists contain the common and specific entries smashed together
	Controls []Control
	Features []Feature
	Threats  []Threat
}

// ControlSet is a struct that represents the controls.yaml file
type ControlSet struct {
	CommonControlIDs []string `yaml:"common_controls"`
	SpecificControls []Control `yaml:"specific_controls"`
}

type Control struct {
	ID               string              `yaml:"id"`
	Title            string              `yaml:"title"`
	Objective        string              `yaml:"objective"`
	ControlFamily    string              `yaml:"control_family"`
	Threats          []string            `yaml:"threats"`
	NISTCSF          string              `yaml:"nist_csf"`
	MITREAttack      string              `yaml:"mitre_attack"`
	ControlMappings  map[string][]string `yaml:"control_mappings"`
	TestRequirements map[string]string   `yaml:"test_requirements"`
}

// Metadata is a struct that represents the metadata.yaml file
type Metadata struct {
	Title              string `yaml:"title"`
	ID                 string `yaml:"id"`
	Description        string `yaml:"description"`
	AssuranceLevel     string `yaml:"assurance_level"`
	ThreatModelAuthor  string `yaml:"threat_model_author"`
	ThreatModelURL     string `yaml:"threat_model_url"`
	RedTeam            string `yaml:"red_team"`
	RedTeamExercizeURL string `yaml:"red_team_exercize_url"`
}

// FeatureSet is a struct that represents the features.yaml file
type FeatureSet struct {
	CommonFeatureIDs []string `yaml:"common-features"`
	SpecificFeatures []Feature `yaml:"specific-features"`
}

type Feature struct {
	ID          string `yaml:"id"`
	title       string `yaml:"title"`
	description string `yaml:"description"`
}

// ThreatSet is a struct that represents the threats.yaml file
type ThreatSet struct {
	CommonThreatIDs []string `yaml:"common-threats"`
	SpecificThreats []Threat `yaml:"specific-threats"`
}

type Threat struct {
	ID          string   `yaml:"id"`
	Title       string   `yaml:"title"`
	Description string   `yaml:"description"`
	Features    []string `yaml:"features"`
	MITRE       []string `yaml:"mitre_attack"`
}

// func writeMarkdown(file *os.File, data ControlSet) {
// 	// Write the header
// 	fmt.Fprintf(file, "# %s: Object Storage\n\n", data.CategoryID)
// 	fmt.Fprintf(file, "| Control Id | Service Taxonomy Id | Control |\n")
// 	fmt.Fprintf(file, "| ---------- | ------------------- | ------- |\n")

// 	// Write the controls table
// 	for _, control := range data.Controls {
// 		fmt.Fprintf(file, "| %s  | %s          | %s |\n", control.ID, control.ID, control.Title)
// 	}

// 	fmt.Fprintf(file, "\n---\n\n")

// 	// Write the details for each control
// 	for _, control := range data.Controls {
// 		fmt.Fprintf(file, "## %s: %s\n\n", control.ID, control.Title)
// 		fmt.Fprintf(file, "- Corresponding Feature: %s\n", control.ID)
// 		fmt.Fprintf(file, "- NIST CSF: %s\n", control.NISTCSF)
// 		fmt.Fprintf(file, "- MITRE ATT&CK TTP: %s\n\n", control.MITREAttack)
// 		fmt.Fprintf(file, "### Objective\n\n")
// 		fmt.Fprintf(file, "%s\n\n", control.Objective)
// 		fmt.Fprintf(file, "### Control Mappings\n\n")

// 		for key, values := range control.ControlMappings {
// 			fmt.Fprintf(file, "- %s: %s\n", key, formatList(values))
// 		}

// 		fmt.Fprintf(file, "\n### Testing Requirements\n\n")
// 		fmt.Fprintf(file, "The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:\n\n")

// 		for key, value := range control.TestRequirements {
// 			test_requirement_id := fmt.Sprintf("%s.%s", control.ID, key)
// 			fmt.Fprintf(file, "1. **%s**: %s\n", test_requirement_id, value)
// 		}

// 		fmt.Fprintf(file, "\n---\n\n")
// 	}
// }

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

func parseArgs() string {
	// exit with a warning if no arguments are provided
	if len(os.Args) < 3 {
		log.Fatalf("[ERROR] Please provide a directory path as an argument.")
	}
	// if optional second arg is provided, use it as the output directory
	outputDir := "."
	if len(os.Args) > 3 {
		outputDir = os.Args[3]
	}
	return outputDir
}

func readYamlFile(filepath string) (yamlFile []byte) {
	yamlFile, err := ioutil.ReadFile(filepath)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	return
}

func selectDataType(name string) (interface{}, string) {
	switch name {
	case "controls":
		return ControlSet{}, os.Args[1]
	case "features":
		return FeatureSet{}, os.Args[1]
	case "threats":
		return ThreatSet{}, os.Args[1]
	case "metadata":
		return Metadata{}, os.Args[1]
	case "common-controls":
		return ControlSet{}, os.Args[2]
	case "common-features":
		return FeatureSet{}, os.Args[2]
	case "common-threats":
		return ThreatSet{}, os.Args[2]
	default:
		log.Fatalf("error: %v", "Invalid data type")
	}
	return nil, ""
}

func getYaml(name string) (data interface{}) {
	dataSet, directory := selectDataType(name)
	log.Printf("Type of dataSet: %T", dataSet)

	yamlData := readYamlFile(fmt.Sprintf("%s/%s.yaml", directory, name))

	// unmarshal the common control IDs and specific controls to dataSet
	err := yaml.Unmarshal(yamlData, &dataSet)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	log.Printf("Type of dataSet: %T", dataSet)

	// pretty print dataSet with indentation
	dataSetBytes, err := yaml.Marshal(dataSet)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	log.Printf("Data Set: %s", string(dataSetBytes))

	return dataSet
}

func readAndCompile() (data CompiledData) {
	// read controls.yaml, features.yaml, threats.yaml, and metadata.yaml from dir path
	controlsData := getYaml("controls").(ControlSet)
	featuresData := getYaml("features").(FeatureSet)
	threatsData := getYaml("threats").(ThreatSet)
	metadata := getYaml("metadata").(Metadata)

	// read the common controls, features, and threats from the common entries directory
	commonControlsData := getYaml("common-controls").(ControlSet)
	commonFeaturesData := getYaml("common-features").(FeatureSet)
	commonThreatsData := getYaml("common-threats").(ThreatSet)

	return CompiledData{
		Metadata: metadata,
		Controls: append(commonControlsData.SpecificControls, controlsData.SpecificControls...),
		Features: append(commonFeaturesData.SpecificFeatures, featuresData.SpecificFeatures...),
		Threats:  append(commonThreatsData.SpecificThreats, threatsData.SpecificThreats...),
	}
}

func main() {
	data := readAndCompile()
	log.Print(data)
	// Create or open the Markdown file based on the YAML id value
	// mdFile, err := os.Create(fmt.Sprintf("%s/%s.md", outputDir, data.CategoryID))
	// if err != nil {
	// 	log.Fatalf("error: %v", err)
	// }
	// defer mdFile.Close()

	// // Write the Markdown content
	// writeMarkdown(mdFile, data)
}

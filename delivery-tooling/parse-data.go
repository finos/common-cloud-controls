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

type Control struct {
	ID               string                  `yaml:"id"`
	Title            string                  `yaml:"title"`
	Objective        string                  `yaml:"objective"`
	ControlFamily    string                  `yaml:"control_family"`
	Threats          []string                `yaml:"threats"`
	NISTCSF          string                  `yaml:"nist_csf"`
	MITREATTACK      string                  `yaml:"mitre_attack"`
	ControlMappings  map[string]interface{}  `yaml:"control_mappings"`
	TestRequirements map[int]string          `yaml:"test_requirements"`
}

type ControlSet struct {
	CommonControls   []string  `yaml:"common_controls"`
	SpecificControls []Control `yaml:"controls"`
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
	CommonFeatureIDs []string `yaml:"common_features"`
	SpecificFeatures []Feature `yaml:"features"`
}

type Feature struct {
	ID          string `yaml:"id"`
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
}

// ThreatSet is a struct that represents the threats.yaml file
type ThreatSet struct {
	CommonThreatIDs []string `yaml:"common_threats"`
	SpecificThreats []Threat `yaml:"threats"`
}

type Threat struct {
	ID          string   `yaml:"id"`
	Title       string   `yaml:"title"`
	Description string   `yaml:"description"`
	Features    []string `yaml:"features"`
	MITRE       []string `yaml:"mitre_attack"`
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

func getDataDirectory(name string) (string) {
	switch name {
	case "controls":
		return os.Args[1]
	case "features":
		return os.Args[1]
	case "threats":
		return os.Args[1]
	case "metadata":
		return os.Args[1]
	case "common-controls":
		return os.Args[2]
	case "common-features":
		return os.Args[2]
	case "common-threats":
		return os.Args[2]
	default:
		log.Fatalf("error: %v", "Invalid data type")
	}
	return ""
}

func readYamlFile(filepath string) (yamlFile []byte) {
	yamlFile, err := ioutil.ReadFile(filepath)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	return
}

func getYaml(name string) ([]byte) {
	directory := getDataDirectory(name)
	return readYamlFile(fmt.Sprintf("%s/%s.yaml", directory, name))
}

func unmarshalData(dataName string, dataSet interface{}) {
	yamlData := getYaml(dataName)
    err := yaml.Unmarshal(yamlData, dataSet)
    if err != nil {
        log.Fatalf("error: %v", err)
    } else {
		// Debug print
        fmt.Printf("Data unmarshaled successfully: %+v\n", dataSet)
    }
}

func readAndCompile() (data CompiledData) {
	// read controls.yaml, features.yaml, threats.yaml, and metadata.yaml from dir path
	controlsData := ControlSet{}
	unmarshalData("controls", &controlsData)
	featuresData := FeatureSet{}
	unmarshalData("features", &featuresData)
	threatsData := ThreatSet{}
	unmarshalData("threats", &threatsData)
	metadata := Metadata{}
	unmarshalData("metadata", &metadata)

	// read the common controls, features, and threats from the common entries directory
	commonControlsData := ControlSet{}
	unmarshalData("common-controls", &commonControlsData)
	commonFeaturesData := FeatureSet{}
	unmarshalData("common-features", &commonFeaturesData)
	commonThreatsData := ThreatSet{}
	unmarshalData("common-threats", &commonThreatsData)

	return CompiledData{
		Metadata: metadata,
		Controls: append(commonControlsData.SpecificControls, controlsData.SpecificControls...),
		Features: append(commonFeaturesData.SpecificFeatures, featuresData.SpecificFeatures...),
		Threats:  append(commonThreatsData.SpecificThreats, threatsData.SpecificThreats...),
	}
}

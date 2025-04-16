package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

type CompiledCatalog struct {
	Metadata Metadata

	// These lists contain the common and specific entries smashed together
	Controls []Control
	Features []Feature
	Threats  []Threat

	LatestReleaseDetails ReleaseDetails
}

type Control struct {
	ID               string                 `yaml:"id"`
	Title            string                 `yaml:"title"`
	Objective        string                 `yaml:"objective"`
	ControlFamily    string                 `yaml:"control_family"`
	Threats          []string               `yaml:"threats"`
	NISTCSF          string                 `yaml:"nist_csf"`
	ControlMappings  map[string]interface{} `yaml:"control_mappings"`
	TestRequirements []TestRequirements     `yaml:"test_requirements"`
	Link             string
}

type TestRequirements struct {
	Id        string   `yaml:"id"`
	Text      string   `yaml:"text"`
	TlpLevels []string `yaml:"tlp_levels"`
}

type ControlSet struct {
	CommonControls   []string  `yaml:"common_controls"`
	SpecificControls []Control `yaml:"controls"`
}

// Metadata is a struct that represents the metadata.yaml file
type Metadata struct {
	Title          string           `yaml:"title"`
	ID             string           `yaml:"id"`
	Description    string           `yaml:"description"`
	ReleaseDetails []ReleaseDetails `yaml:"release_details"`
}

type ReleaseDetails struct {
	Version            string         `yaml:"version"`
	AssuranceLevel     string         `yaml:"assurance_level"`
	ThreatModelURL     string         `yaml:"threat_model_url"`
	ThreatModelAuthor  string         `yaml:"threat_model_author"`
	RedTeam            string         `yaml:"red_team"`
	RedTeamExerciseURL string         `yaml:"red_team_exercise_url"`
	ReleaseManager     ReleaseManager `yaml:"release_manager"`
	ChangeLog          []string       `yaml:"change_log"`
	Contributors       []Contributors `yaml:"contributors"`
}

type ReleaseManager struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github_id"`
	Company  string `yaml:"company"`
	Summary  string `yaml:"summary"`
}

type Contributors struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github_id"`
	Company  string `yaml:"company"`
}

// FeatureSet is a struct that represents the features.yaml file
type FeatureSet struct {
	CommonFeatureIDs []string  `yaml:"common_features"`
	SpecificFeatures []Feature `yaml:"features"`
}

type Feature struct {
	ID          string `yaml:"id"`
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
	Link        string
}

// ThreatSet is a struct that represents the threats.yaml file
type ThreatSet struct {
	CommonThreatIDs []string `yaml:"common_threats"`
	SpecificThreats []Threat `yaml:"threats"`
}

type Threat struct {
	ID             string   `yaml:"id"`
	Title          string   `yaml:"title"`
	Description    string   `yaml:"description"`
	Features       []string `yaml:"features"`
	MITRETechnique []string `yaml:"mitre_technique"`
	Link           string
}

func getYamlBytes(name string) []byte {
	directory := getDataDirectory(name)
	return readYamlFile(fmt.Sprintf("%s/%s.yaml", directory, name))
}

func readYamlFile(filepath string) (yamlFile []byte) {
	yamlFile, err := os.ReadFile(filepath)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	return
}

func unmarshalData(dataName string, dataSet interface{}) {
	yamlData := getYamlBytes(dataName)
	err := yaml.Unmarshal(yamlData, dataSet)
	if err != nil {
		log.Fatalf("error reading %s: %v", dataName, err)
	}
}

func createLink(id string, title string) string {
	var buffer bytes.Buffer

	buffer.WriteString(strings.ToLower(strings.ReplaceAll(id, ".", "")))
	buffer.WriteString("---")
	buffer.WriteString(strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(title, ",", ""), " ", "-")))
	return buffer.String()
}

func getDataDirectory(name string) string {
	buildTarget := filepath.Join(viper.GetString("services-dir"), viper.GetString("build-target"))
	serviceDir := viper.GetString("services-dir")

	switch name {
	case "controls":
		return buildTarget
	case "features":
		return buildTarget
	case "threats":
		return buildTarget
	case "metadata":
		return buildTarget
	case "common-controls":
		return serviceDir
	case "common-features":
		return serviceDir
	case "common-threats":
		return serviceDir
	default:
		log.Fatalf("error: %v", "Invalid data type")
	}
	return ""
}

func readAndCompileCatalog() (data CompiledCatalog) {
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

	// addFeatureLink(featuresData.SpecificFeatures)
	// addFeatureLink(commonFeaturesData.SpecificFeatures)
	// addThreatLink(threatsData.SpecificThreats)
	// addThreatLink(commonThreatsData.SpecificThreats)
	// addControlLink(controlsData.SpecificControls)
	// addControlLink(commonControlsData.SpecificControls)

	return CompiledCatalog{
		Metadata:             metadata,
		Controls:             append(commonControlsData.SpecificControls, controlsData.SpecificControls...),
		Features:             append(commonFeaturesData.SpecificFeatures, featuresData.SpecificFeatures...),
		Threats:              append(commonThreatsData.SpecificThreats, threatsData.SpecificThreats...),
		LatestReleaseDetails: metadata.ReleaseDetails[len(metadata.ReleaseDetails)-1],
	}
}

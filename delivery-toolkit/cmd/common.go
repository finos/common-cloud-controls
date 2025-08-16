package cmd

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

// createDirectoryIfNotExists creates a directory if it doesn't exist
// It takes a filePath string as input and returns an error if any
func createDirectoryIfNotExists(filePath string) error {
	err := os.MkdirAll(filePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %v", err)
	}
	return nil
}

func getMetadataYaml(filePath string) cccMetadata {
	// Read the YAML file
	yamlFile, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Error reading YAML file: %v", err)
	}

	var data cccMetadata
	// Unmarshal the YAML into the struct
	err = yaml.Unmarshal(yamlFile, &data)
	if err != nil {
		log.Fatalf("Error unmarshaling YAML: %v", err)
	}

	return data
}

func initializeOutputDirectory() {
	viper.SetDefault("output-dir", "./artifacts")
	createDirectoryIfNotExists(viper.GetString("output-dir"))
}

func addPageBreaksBeforeH2(content []byte) []byte {
	re := regexp.MustCompile(`(?m)^## `)
	pageBreak := []byte("<div style=\"page-break-after: always;\"></div>\n\n")
	return re.ReplaceAllFunc(content, func(match []byte) []byte {
		return append(pageBreak, match...)
	})
}

func removeDuplicates[T comparable](slice []T) []T {
	uniqueMap := make(map[T]bool)
	var result []T
	for _, item := range slice {
		if _, exists := uniqueMap[item]; !exists {
			uniqueMap[item] = true
			result = append(result, item)
		}
	}
	return result
}

func createLink(id, title string) string {
	var buffer bytes.Buffer
	buffer.WriteString(strings.ToLower(strings.ReplaceAll(id, ".", "")))
	buffer.WriteString("---")
	buffer.WriteString(strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(title, ",", ""), " ", "-")))
	return buffer.String()
}

// Participant represents a single participant
type Participant struct {
	Name           string `yaml:"name"`
	EnrollmentDate string `yaml:"enrollment_date"`
	GithubID       string `yaml:"github_id"`
}

// ParticipantsData represents the structure of the participants.yaml file
type ParticipantsData struct {
	Participants map[string][]Participant `yaml:"participants"`
}

var companyParticipants ParticipantsData

// LoadParticipants loads the participants data from the YAML file
func LoadParticipants() (ParticipantsData, error) {
	if len(companyParticipants.Participants) > 0 {
		return companyParticipants, nil
	}
	data, err := os.ReadFile("../participants.yaml")
	if err != nil {
		return companyParticipants, fmt.Errorf("failed to read participants file: %v", err)
	}

	err = yaml.Unmarshal(data, &companyParticipants)
	if err != nil {
		return companyParticipants, fmt.Errorf("failed to unmarshal participants data: %v", err)
	}

	return companyParticipants, nil
}

// GetCompanyByParticipantName returns the company name for a given participant name
func GetCompanyByParticipantName(participantName string) (string, error) {
	data, err := LoadParticipants()
	if err != nil {
		return "", err
	}

	for company, participants := range data.Participants {
		for _, participant := range participants {
			if strings.EqualFold(strings.TrimSpace(participant.Name), participantName) {
				return company, nil
			}
		}
	}

	return "", fmt.Errorf("participant '%s' not found", participantName)
}

// GetCompanyByGithubID returns the company name for a given GitHub ID
func GetCompanyByGithubID(githubID string) (string, error) {
	data, err := LoadParticipants()
	if err != nil {
		return "", err
	}
	for company, participants := range data.Participants {
		for _, participant := range participants {
			if participant.GithubID == githubID {
				return company, nil
			}
		}
	}

	return "", fmt.Errorf("GitHub ID '%s' not found", githubID)
}

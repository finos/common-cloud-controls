package cmd

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/revanite-io/sci/pkg/layer2"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

var globalCommonCatalog layer2.Catalog

// createDirectoryIfNotExists creates a directory if it doesn't exist
// It takes a filePath string as input and returns an error if any
func createDirectoryIfNotExists(filePath string) error {
	err := os.MkdirAll(filePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %v", err)
	}
	return nil
}

func addPageBreaksBeforeH2(content []byte) []byte {
	// Regular expression to match H2 headers
	re := regexp.MustCompile(`(?m)^## `)

	// Page break div
	pageBreak := []byte("<div style=\"page-break-after: always;\"></div>\n\n")

	// Replace each H2 header with a page break followed by the header
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

func initializeOutputDirectory() {
	viper.SetDefault("output-dir", "./artifacts")
	createDirectoryIfNotExists(viper.GetString("output-dir"))
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
		log.Fatalf("error reading %s.yaml >>> %v <<<", dataName, err)
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
	case "capabilities":
		return buildTarget
	case "threats":
		return buildTarget
	case "metadata":
		return buildTarget
	case "common-controls":
		return serviceDir
	case "common-capabilities":
		return serviceDir
	case "common-threats":
		return serviceDir
	default:
		log.Fatalf("error: %v", "Invalid data type")
	}
	return ""
}

func readAndCompileCatalog() (data CompiledCatalog) {
	if viper.GetString("build-target") == "" {
		log.Fatalf("error: %v", "build-target is required")
	}

	buildTarget := filepath.Join(viper.GetString("services-dir"), viper.GetString("build-target"))

	serviceData, err := loadContent(buildTarget)
	if err != nil {
		log.Fatalf("error loading content for %s (%v)", buildTarget, err)
		return
	}

	catalog, err := loadMetadata(buildTarget)
	if err != nil {
		log.Fatalf("error loading metadata for %s (%v)", buildTarget, err)
		return
	}

	// addCapabilityLink(capabilitiesData.SpecificCapabilities)
	// addCapabilityLink(commonCapabilitiesData.SpecificCapabilities)
	// addThreatLink(threatsData.SpecificThreats)
	// addThreatLink(commonThreatsData.SpecificThreats)
	// addControlLink(controlsData.SpecificControls)
	// addControlLink(commonControlsData.SpecificControls)

	err = setGlobalCommonCatalog()
	if err != nil {
		log.Fatalf("error loading common catalog (%v)", err)
		return
	}

	return CompiledCatalog{
		Metadata:             catalog.Metadata,
		ReleaseDetails:       catalog.ReleaseDetails,
		LatestReleaseDetails: catalog.ReleaseDetails[len(catalog.ReleaseDetails)-1],
		ControlFamilies:      append(serviceData.ControlFamilies, getCommonControls(serviceData.SharedControls)),
		Capabilities:         append(serviceData.Capabilities, getCommonCapabilities(serviceData.SharedCapabilities)...),
		Threats:              append(serviceData.Threats, getCommonThreats(serviceData.SharedThreats)...),
	}
}

func loadMetadata(directory string) (catalog CompiledCatalog, err error) {
	sourcePath := filepath.Join(directory, "metadata.yaml")

	_, err = os.Stat(sourcePath)
	if err != nil {
		return catalog, fmt.Errorf("missing metadata.yaml")
	}

	file, err := os.Open(sourcePath)
	if err != nil {
		return catalog, fmt.Errorf("error opening file: %w", err)
	}

	defer func() {
		_ = file.Close()
	}()
	decoder := yaml.NewDecoder(file)
	decoder.KnownFields(true)

	err = decoder.Decode(&catalog)
	if err != nil {
		return catalog, fmt.Errorf("error decoding YAML: %w (%s)", err, sourcePath)
	}

	return catalog, err
}

func loadContent(directory string) (data layer2.Catalog, err error) {
	_, err = os.Stat(directory)
	if err != nil {
		return
	}
	var missing []string
	_, err = os.Stat(filepath.Join(directory, "controls.yaml"))
	if err != nil {
		missing = append(missing, "controls.yaml")
	}
	_, err = os.Stat(filepath.Join(directory, "capabilities.yaml"))
	if err != nil {
		missing = append(missing, "capabilities.yaml")
	}
	_, err = os.Stat(filepath.Join(directory, "threats.yaml"))
	if err != nil {
		missing = append(missing, "threats.yaml")
	}
	if len(missing) >= 3 {
		return data, fmt.Errorf("skipping: %s", directory)
	} else if len(missing) > 0 {
		return data, fmt.Errorf("missing %v", missing)
	}
	err = data.LoadFiles([]string{
		filepath.Join(directory, "controls.yaml"),
		filepath.Join(directory, "capabilities.yaml"),
		filepath.Join(directory, "threats.yaml"),
	})
	return data, err
}

func setGlobalCommonCatalog() (err error) {
	if len(globalCommonCatalog.ControlFamilies) == 0 {
		// read the common controls, capabilities, and threats from the common entries directory
		commonDir := filepath.Join(viper.GetString("services-dir"), "..", "common")
		globalCommonCatalog, err = loadContent(commonDir)
		if err != nil {
			err = fmt.Errorf("error loading %s (%v)", commonDir, err)
		}
	}
	return err
}

func getCommonControls(mappings []layer2.Mapping) (common layer2.ControlFamily) {
	for _, family := range globalCommonCatalog.ControlFamilies {
		for _, control := range family.Controls {
			for _, mapping := range mappings {
				for _, referenceID := range mapping.Identifiers {
					if control.Id == referenceID {
						common.Controls = append(common.Controls, control)
					}
				}
			}
		}
	}
	return common
}

func getCommonCapabilities(mappings []layer2.Mapping) (common []layer2.Capability) {
	for _, capability := range globalCommonCatalog.Capabilities {
		for _, mapping := range mappings {
			for _, referenceID := range mapping.Identifiers {
				if capability.Id == referenceID {
					common = append(common, capability)
				}
			}
		}
	}
	return common
}

func getCommonThreats(mappings []layer2.Mapping) (common []layer2.Threat) {
	for _, threat := range globalCommonCatalog.Threats {
		for _, mapping := range mappings {
			for _, referenceID := range mapping.Identifiers {
				if threat.Id == referenceID {
					common = append(common, threat)
				}
			}
		}
	}
	return common
}

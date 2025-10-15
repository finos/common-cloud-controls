package cmd

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

var ApplicabilityCategories = []layer2.Category{
	{
		Id:          "tlp_red",
		Title:       "TLP:RED",
		Description: "Data is not for disclosure, restricted to explicitly authorized entities only.",
	},
	{
		Id:          "tlp_amber",
		Title:       "TLP:AMBER",
		Description: "Data is for disclosure to members of explicitly authorized organizational structures.",
	},
	{
		Id:          "tlp_green",
		Title:       "TLP:GREEN",
		Description: "Data may be freely distributed through specific channels that do not include unrestricted public access.",
	},
	{
		Id:          "tlp_clear",
		Title:       "TLP:CLEAR",
		Description: "Data has no distribution restrictions.",
	},
}

var CoreCatalogReference = []layer2.MappingReference{
	{
		Id:      "CCC.Core",
		Title:   "FINOS CCC Core Catalog",
		Version: "v2025.10",
	},
}

// CoreControlFamilyDescriptions contains the standard descriptions for core control families
var CoreControlFamilyDescriptions = map[string]string{
	"Data":                           "The Data control family ensures the confidentiality, integrity, availability, and sovereignty of data across its lifecycle. These controls govern how data is transmitted, stored, replicated, and protected from unauthorized access, tampering, or exposure beyond defined trust perimeters.",
	"Identity and Access Management": "The Identity and Access Management control family ensures that only trusted and authenticated entities can access resources. These controls establish strong authentication, enforce multi-factor verification, and restrict access to approved sources to prevent unauthorized use or data exfiltration.",
}

// buildCoreCatalogURL builds the URL for the CCC core catalog release asset
func buildCoreCatalogURL(coreVersion string) string {
	return fmt.Sprintf("https://github.com/finos/common-cloud-controls/releases/download/%s/CCC.Core_%s.yaml", coreVersion, coreVersion)
}

func readAndCompileCatalog() *layer2.Catalog {
	if viper.GetString("build-target") == "" {
		log.Fatalf("error: build-target is required")
	}

	buildTarget := filepath.Join(viper.GetString("catalogs-dir"), viper.GetString("build-target"))

	if _, err := os.Stat(buildTarget); os.IsNotExist(err) {
		log.Fatalf("error: build target directory does not exist: %s", buildTarget)
	}

	catalog, err := loadCatalog(buildTarget)
	if err != nil {
		log.Fatalf("error loading content for %s: %v", buildTarget, err)
	}

	// Process imports and merge elements from core CCC catalog
	err = processImports(catalog)
	if err != nil {
		log.Fatalf("error processing imports: %v", err)
	}

	err = validateMetadata(catalog)
	if err != nil {
		log.Fatalf("error validating metadata: %v", err)
	}

	catalog.Metadata.ApplicabilityCategories = append(
		catalog.Metadata.ApplicabilityCategories, ApplicabilityCategories...)

	if catalog.Metadata.Id != "CCC.Core" {
		catalog.Metadata.MappingReferences = append(
			catalog.Metadata.MappingReferences, CoreCatalogReference...)
	}

	catalog.Metadata.LastModified = time.Now().Format(time.RFC3339)

	return catalog
}

func validateMetadata(catalog *layer2.Catalog) error {
	if catalog.Metadata.Id == "" {
		return fmt.Errorf("metadata.id is required")
	}
	if catalog.Metadata.Version == "" {
		return fmt.Errorf("metadata.version is required")
	}
	if catalog.Metadata.Title == "" {
		return fmt.Errorf("metadata.title is required")
	}
	if catalog.Metadata.Description == "" {
		return fmt.Errorf("metadata.description is required")
	}
	return nil
}

func loadCatalog(directory string) (*layer2.Catalog, error) {
	metadata := filepath.Join(directory, "metadata.yaml")
	controls := filepath.Join(directory, "controls.yaml")
	capabilities := filepath.Join(directory, "capabilities.yaml")
	threats := filepath.Join(directory, "threats.yaml")

	var missing []string
	var targets []string
	files := []string{metadata, controls, capabilities, threats}

	for _, file := range files {
		if _, err := os.Stat(file); err != nil {
			missing = append(missing, file)
		} else {
			targets = append(targets, "file://"+file)
		}
	}

	if len(missing) > 3 {
		return nil, fmt.Errorf("no relevant files found: %s", directory)
	}
	if len(missing) > 0 {
		log.Printf("Warning: missing files in %s: %v", directory, missing)
	}

	var data layer2.Catalog
	err := data.LoadFiles(targets)
	if err != nil {
		return nil, err
	}

	// Manually parse import sections since LoadFiles doesn't handle them
	err = loadImports(&data, directory)
	if err != nil {
		return nil, fmt.Errorf("error loading imports: %v", err)
	}

	// Debug: Log what was loaded (optional - can be removed for production)
	if viper.GetBool("verbose") {
		log.Printf("Loaded catalog: %d threats, %d capabilities, %d control families",
			len(data.Threats), len(data.Capabilities), len(data.ControlFamilies))
		log.Printf("Loaded imports: %d imported threats, %d imported capabilities, %d imported controls",
			len(data.ImportedThreats), len(data.ImportedCapabilities), len(data.ImportedControls))
	}

	return &data, err
}

// loadImports manually parses the import sections from YAML files
func loadImports(catalog *layer2.Catalog, directory string) error {
	// Load imported threats
	threatsFile := filepath.Join(directory, "threats.yaml")
	if err := loadImportSection(threatsFile, "imported-threats", &catalog.ImportedThreats); err != nil {
		return fmt.Errorf("error loading imported threats: %v", err)
	}

	// Load imported capabilities
	capabilitiesFile := filepath.Join(directory, "capabilities.yaml")
	if err := loadImportSection(capabilitiesFile, "imported-capabilities", &catalog.ImportedCapabilities); err != nil {
		return fmt.Errorf("error loading imported capabilities: %v", err)
	}

	// Load imported controls
	controlsFile := filepath.Join(directory, "controls.yaml")
	if err := loadImportSection(controlsFile, "imported-controls", &catalog.ImportedControls); err != nil {
		return fmt.Errorf("error loading imported controls: %v", err)
	}

	return nil
}

// loadImportSection loads a specific import section from a YAML file
func loadImportSection(filename, sectionName string, target *[]layer2.Mapping) error {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return nil // File doesn't exist, skip
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("error reading file %s: %v", filename, err)
	}

	var yamlData map[string]interface{}
	err = yaml.Unmarshal(data, &yamlData)
	if err != nil {
		return fmt.Errorf("error parsing YAML from %s: %v", filename, err)
	}

	if section, exists := yamlData[sectionName]; exists {
		// Convert the section back to YAML and then unmarshal into the target
		sectionYAML, err := yaml.Marshal(section)
		if err != nil {
			return fmt.Errorf("error marshaling section %s: %v", sectionName, err)
		}

		err = yaml.Unmarshal(sectionYAML, target)
		if err != nil {
			return fmt.Errorf("error unmarshaling section %s: %v", sectionName, err)
		}
	}

	return nil
}

// processImports handles imported-threats, imported-capabilities, and imported-controls
// When reference-id is CCC, it loads the core/ccc catalog and merges the desired elements
func processImports(catalog *layer2.Catalog) error {
	if viper.GetBool("verbose") {
		log.Printf("Processing imports: %d imported threats, %d imported capabilities, %d imported controls",
			len(catalog.ImportedThreats), len(catalog.ImportedCapabilities), len(catalog.ImportedControls))
	}

	// Check if we have any CCC imports to process
	hasCCCImports := false
	for _, mapping := range catalog.ImportedThreats {
		if viper.GetBool("verbose") {
			log.Printf("Found imported threats mapping with reference-id: %s", mapping.ReferenceId)
		}
		if mapping.ReferenceId == "CCC" {
			hasCCCImports = true
			break
		}
	}
	if !hasCCCImports {
		for _, mapping := range catalog.ImportedCapabilities {
			if mapping.ReferenceId == "CCC" {
				hasCCCImports = true
				break
			}
		}
	}
	if !hasCCCImports {
		for _, mapping := range catalog.ImportedControls {
			if mapping.ReferenceId == "CCC" {
				hasCCCImports = true
				break
			}
		}
	}

	if !hasCCCImports {
		return nil // No CCC imports to process
	}

	// Determine desired core version from metadata.mapping-references
	coreVersion := ""
	for _, ref := range catalog.Metadata.MappingReferences {
		if ref.Id == "CCC.Core" && ref.Version != "" {
			coreVersion = ref.Version
			break
		}
	}
	if coreVersion == "" {
		// Fallback to default from CoreCatalogReference
		if len(CoreCatalogReference) > 0 {
			coreVersion = CoreCatalogReference[0].Version
		} else {
			coreVersion = "v2025.10"
		}
	}

	coreURL := buildCoreCatalogURL(coreVersion)
	if viper.GetBool("verbose") {
		log.Printf("Loading core CCC catalog from URL: %s", coreURL)
	}
	cccCatalog, err := loadCoreCatalogFromURL(coreURL)
	if err != nil {
		return fmt.Errorf("error loading core CCC catalog: %v", err)
	}
	if viper.GetBool("verbose") {
		log.Printf("Loaded core CCC catalog with %d threats, %d capabilities, %d control families",
			len(cccCatalog.Threats), len(cccCatalog.Capabilities), len(cccCatalog.ControlFamilies))
	}

	// Process imported threats
	for _, mapping := range catalog.ImportedThreats {
		if mapping.ReferenceId == "CCC" {
			err = mergeThreats(catalog, cccCatalog, mapping.Entries)
			if err != nil {
				return fmt.Errorf("error merging threats: %v", err)
			}
		}
	}

	// Process imported capabilities
	for _, mapping := range catalog.ImportedCapabilities {
		if mapping.ReferenceId == "CCC" {
			err = mergeCapabilities(catalog, cccCatalog, mapping.Entries)
			if err != nil {
				return fmt.Errorf("error merging capabilities: %v", err)
			}
		}
	}

	// Process imported controls
	for _, mapping := range catalog.ImportedControls {
		if mapping.ReferenceId == "CCC" {
			err = mergeControls(catalog, cccCatalog, mapping.Entries)
			if err != nil {
				return fmt.Errorf("error merging controls: %v", err)
			}
		}
	}

	return nil
}

// loadCoreCatalogFromURL downloads a combined YAML catalog and parses it
func loadCoreCatalogFromURL(url string) (*layer2.Catalog, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download core catalog: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to download core catalog: status %d: %s", resp.StatusCode, string(body))
	}
	dataBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read core catalog response: %v", err)
	}
	var catalog layer2.Catalog
	if err := yaml.Unmarshal(dataBytes, &catalog); err != nil {
		return nil, fmt.Errorf("failed to parse core catalog YAML: %v", err)
	}
	return &catalog, nil
}

// mergeThreats adds the referenced threats from the source catalog to the target catalog
func mergeThreats(targetCatalog, sourceCatalog *layer2.Catalog, entries []layer2.MappingEntry) error {
	if viper.GetBool("verbose") {
		log.Printf("Merging %d threat entries", len(entries))
	}
	for _, entry := range entries {
		if viper.GetBool("verbose") {
			log.Printf("Looking for threat: %s", entry.ReferenceId)
		}
		// Find the threat in the source catalog
		var foundThreat *layer2.Threat
		for _, threat := range sourceCatalog.Threats {
			if threat.Id == entry.ReferenceId {
				foundThreat = &threat
				break
			}
		}

		if foundThreat == nil {
			log.Printf("Warning: Threat %s not found in core CCC catalog, skipping", entry.ReferenceId)
			continue
		}

		// Check if the threat already exists in the target catalog
		alreadyExists := false
		for _, existingThreat := range targetCatalog.Threats {
			if existingThreat.Id == foundThreat.Id {
				alreadyExists = true
				break
			}
		}

		// Add the threat if it doesn't already exist
		if !alreadyExists {
			if viper.GetBool("verbose") {
				log.Printf("Adding threat %s to target catalog", foundThreat.Id)
			}
			targetCatalog.Threats = append(targetCatalog.Threats, *foundThreat)
		} else if viper.GetBool("verbose") {
			log.Printf("Threat %s already exists in target catalog", foundThreat.Id)
		}
	}
	return nil
}

// mergeCapabilities adds the referenced capabilities from the source catalog to the target catalog
func mergeCapabilities(targetCatalog, sourceCatalog *layer2.Catalog, entries []layer2.MappingEntry) error {
	for _, entry := range entries {
		// Find the capability in the source catalog
		var foundCapability *layer2.Capability
		for _, capability := range sourceCatalog.Capabilities {
			if capability.Id == entry.ReferenceId {
				foundCapability = &capability
				break
			}
		}

		if foundCapability == nil {
			log.Printf("Warning: Capability %s not found in core CCC catalog, skipping", entry.ReferenceId)
			continue
		}

		// Check if the capability already exists in the target catalog
		alreadyExists := false
		for _, existingCapability := range targetCatalog.Capabilities {
			if existingCapability.Id == foundCapability.Id {
				alreadyExists = true
				break
			}
		}

		// Add the capability if it doesn't already exist
		if !alreadyExists {
			targetCatalog.Capabilities = append(targetCatalog.Capabilities, *foundCapability)
		}
	}
	return nil
}

// mergeControls adds the referenced controls from the source catalog to the target catalog
func mergeControls(targetCatalog, sourceCatalog *layer2.Catalog, entries []layer2.MappingEntry) error {
	for _, entry := range entries {
		// Find the control in the source catalog
		var foundControl *layer2.Control
		var foundFamily *layer2.ControlFamily
		for _, family := range sourceCatalog.ControlFamilies {
			for _, control := range family.Controls {
				if control.Id == entry.ReferenceId {
					foundControl = &control
					foundFamily = &family
					break
				}
			}
			if foundControl != nil {
				break
			}
		}

		if foundControl == nil {
			log.Printf("Warning: Control %s not found in core CCC catalog, skipping", entry.ReferenceId)
			continue
		}

		// Check if the control already exists in the target catalog
		alreadyExists := false
		for _, family := range targetCatalog.ControlFamilies {
			for _, control := range family.Controls {
				if control.Id == foundControl.Id {
					alreadyExists = true
					break
				}
			}
			if alreadyExists {
				break
			}
		}

		// Add the control if it doesn't already exist
		if !alreadyExists {
			// Find or create the appropriate control family in the target catalog
			var targetFamily *layer2.ControlFamily
			for i := range targetCatalog.ControlFamilies {
				if targetCatalog.ControlFamilies[i].Title == foundFamily.Title {
					targetFamily = &targetCatalog.ControlFamilies[i]
					break
				}
			}

			// If the family doesn't exist, create it
			if targetFamily == nil {
				newFamily := layer2.ControlFamily{
					Id:          foundFamily.Id,
					Title:       foundFamily.Title,
					Description: foundFamily.Description,
					Controls:    []layer2.Control{},
				}
				targetCatalog.ControlFamilies = append(targetCatalog.ControlFamilies, newFamily)
				targetFamily = &targetCatalog.ControlFamilies[len(targetCatalog.ControlFamilies)-1]
			} else {
				// Apply core description if the existing family doesn't have one
				if targetFamily.Description == "" {
					if description, exists := CoreControlFamilyDescriptions[targetFamily.Title]; exists {
						if viper.GetBool("verbose") {
							log.Printf("Applying core description to existing control family: %s", targetFamily.Title)
						}
						targetFamily.Description = description
					}
				}
			}

			// Add the control to the family
			targetFamily.Controls = append(targetFamily.Controls, *foundControl)
		}
	}
	return nil
}

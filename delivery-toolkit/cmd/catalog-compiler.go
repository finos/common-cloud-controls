package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
)

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

	err = validateMetadata(catalog)
	if err != nil {
		log.Fatalf("error validating metadata: %v", err)
	}

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
	for _, file := range []string{metadata, controls, capabilities, threats} {
		if _, err := os.Stat(file); err != nil {
			missing = append(missing, file)
		}
		targets = append(targets, "file://"+file)
	}

	if len(missing) > 3 {
		return nil, fmt.Errorf("no relevant files found: %s", directory)
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing %v in %s", missing, directory)
	}

	var data layer2.Catalog
	err := data.LoadFiles(targets)
	return &data, err
}

// The following three functions might be useful when generating the markdown/pdf
var globalCommonCatalog layer2.Catalog

func getCommonControls(mappings []layer2.Mapping) []layer2.Control {
	var commonControls []layer2.Control
	for _, family := range globalCommonCatalog.ControlFamilies {
		for _, control := range family.Controls {
			for _, mapping := range mappings {
				for _, entry := range mapping.Entries {
					if control.Id == entry.ReferenceId {
						commonControls = append(commonControls, control)
					}
				}
			}
		}
	}
	return commonControls
}

func getCommonCapabilities(mappings []layer2.Mapping) []layer2.Capability {
	var commonCapabilities []layer2.Capability
	for _, capability := range globalCommonCatalog.Capabilities {
		for _, mapping := range mappings {
			for _, entry := range mapping.Entries {
				if capability.Id == entry.ReferenceId {
					commonCapabilities = append(commonCapabilities, capability)
				}
			}
		}
	}
	return commonCapabilities
}

func getCommonThreats(mappings []layer2.Mapping) []layer2.Threat {
	var commonThreats []layer2.Threat
	for _, threat := range globalCommonCatalog.Threats {
		for _, mapping := range mappings {
			for _, entry := range mapping.Entries {
				if threat.Id == entry.ReferenceId {
					commonThreats = append(commonThreats, threat)
				}
			}
		}
	}
	return commonThreats
}

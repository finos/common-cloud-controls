package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
)

var globalCommonCatalog layer2.Catalog

func readAndCompileCatalog() *CompiledCatalog {
	if viper.GetString("build-target") == "" {
		log.Fatalf("error: build-target is required")
	}

	buildTarget := filepath.Join(viper.GetString("catalogs-dir"), viper.GetString("build-target"))

	if _, err := os.Stat(buildTarget); os.IsNotExist(err) {
		log.Fatalf("error: build target directory does not exist: %s", buildTarget)
	}

	releaseDetailsData := getReleaseDetails(filepath.Join(buildTarget, "release-details.yaml"))

	serviceData, err := loadContent(buildTarget)
	if err != nil {
		log.Fatalf("error loading content for %s: %v", buildTarget, err)
	}

	var catalog CompiledCatalog

	catalog.ReleaseDetails = releaseDetailsData
	catalog.Metadata = serviceData.Metadata

	catalog.ControlFamilies = serviceData.ControlFamilies
	catalog.Capabilities = serviceData.Capabilities
	catalog.Threats = serviceData.Threats

	catalog.ImportedCapabilities = serviceData.ImportedCapabilities
	catalog.ImportedThreats = serviceData.ImportedThreats
	catalog.ImportedControls = serviceData.ImportedControls

	return &catalog
}

func loadContent(directory string) (*layer2.Catalog, error) {
	if _, err := os.Stat(directory); err != nil {
		return nil, err
	}

	var missing []string
	for _, file := range []string{"metadata.yaml", "controls.yaml", "capabilities.yaml", "threats.yaml"} {
		if _, err := os.Stat(filepath.Join(directory, file)); err != nil {
			missing = append(missing, file)
		}
	}

	if len(missing) > 3 {
		return nil, fmt.Errorf("no relevant files found: %s", directory)
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing %v in %s", missing, directory)
	}

	var data layer2.Catalog
	err := data.LoadFiles([]string{
		filepath.Join(directory, "metadata.yaml"),
		filepath.Join(directory, "controls.yaml"),
		filepath.Join(directory, "capabilities.yaml"),
		filepath.Join(directory, "threats.yaml"),
	})
	return &data, err
}

// The following three functions might be useful when generating the markdown/pdf

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

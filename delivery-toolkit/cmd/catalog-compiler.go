package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/revanite-io/gemara/layer2"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

var globalCommonCatalog layer2.Catalog

func readAndCompileCatalog() *CompiledCatalog {
	if viper.GetString("build-target") == "" {
		log.Fatalf("error: build-target is required")
	}

	buildTarget := filepath.Join(viper.GetString("services-dir"), viper.GetString("build-target"))

	serviceData, err := loadContent(buildTarget)
	if err != nil {
		log.Fatalf("error loading content for %s: %v", buildTarget, err)
	}

	catalog, err := loadMetadata(buildTarget)
	if err != nil {
		log.Fatalf("error loading metadata for %s: %v", buildTarget, err)
	}

	if err := setGlobalCommonCatalog(); err != nil {
		log.Fatalf("error loading common catalog: %v", err)
	}

	return &CompiledCatalog{
		Metadata:        catalog.Metadata,
		ReleaseDetails:  catalog.ReleaseDetails,
		ControlFamilies: append(serviceData.ControlFamilies, getCommonControls(serviceData.SharedControls)...),
		Capabilities:    append(serviceData.Capabilities, getCommonCapabilities(serviceData.SharedCapabilities)...),
		Threats:         append(serviceData.Threats, getCommonThreats(serviceData.SharedThreats)...),
	}
}

func loadMetadata(directory string) (*CompiledCatalog, error) {
	sourcePath := filepath.Join(directory, "metadata.yaml")
	if _, err := os.Stat(sourcePath); err != nil {
		return nil, fmt.Errorf("missing metadata.yaml")
	}

	file, err := os.Open(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("error opening file: %w", err)
	}
	defer file.Close()

	var catalog CompiledCatalog
	decoder := yaml.NewDecoder(file)
	decoder.KnownFields(true)
	if err := decoder.Decode(&catalog); err != nil {
		return nil, fmt.Errorf("error decoding YAML: %w (%s)", err, sourcePath)
	}

	return &catalog, nil
}

func loadContent(directory string) (*layer2.Catalog, error) {
	if _, err := os.Stat(directory); err != nil {
		return nil, err
	}

	var missing []string
	for _, file := range []string{"controls.yaml", "capabilities.yaml", "threats.yaml"} {
		if _, err := os.Stat(filepath.Join(directory, file)); err != nil {
			missing = append(missing, file)
		}
	}

	if len(missing) >= 3 {
		return nil, fmt.Errorf("no relevant files found: %s", directory)
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing %v in %s", missing, directory)
	}

	var data layer2.Catalog
	err := data.LoadFiles([]string{
		filepath.Join(directory, "controls.yaml"),
		filepath.Join(directory, "capabilities.yaml"),
		filepath.Join(directory, "threats.yaml"),
	})
	return &data, err
}

// I'm not sure about this.... I want to get a standard release of the common catalog. Then we can reference the release YAML to ingest it.
// should we mov it to the services dir? or keep it here? maybe that's irrelevant.
// do we have an existing mechanism for ingesting compiled catalogs from the release path? I think rob had something in the website directory.
// we need to make sure each catalog we release iincludes a mapping to the appropriate release of the common entries catalog.
// the common entries catalog also needss a better NAME.
// Common Cloud Controls: Common  DUMB AF

func setGlobalCommonCatalog() error {
	if len(globalCommonCatalog.ControlFamilies) == 0 {
		commonDir := filepath.Join(viper.GetString("services-dir"), "..", "common")
		commonCatalog, err := loadContent(commonDir)
		if err != nil {
			return fmt.Errorf("error loading %s: %v", commonDir, err)
		}
		globalCommonCatalog = *commonCatalog
	}
	return nil
}

func getCommonControls(mappings []layer2.Mapping) []layer2.ControlFamily {
	var commonControls []layer2.ControlFamily
	for _, family := range globalCommonCatalog.ControlFamilies {
		for _, control := range family.Controls {
			for _, mapping := range mappings {
				for _, referenceID := range mapping.Identifiers {
					if control.Id == referenceID {
						commonControls = append(commonControls, layer2.ControlFamily{Controls: []layer2.Control{control}})
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
			for _, referenceID := range mapping.Identifiers {
				if capability.Id == referenceID {
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
			for _, referenceID := range mapping.Identifiers {
				if threat.Id == referenceID {
					commonThreats = append(commonThreats, threat)
				}
			}
		}
	}
	return commonThreats
}

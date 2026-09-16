package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/runner"
)

var errFixturesStarted = errors.New("started CCC compute fixtures found")

func main() {
	action := flag.String("action", "", "Lifecycle action: start, stop, or list")
	configPath := flag.String("config", "", "Privateer config YAML (required for start; optional for stop/list)")
	privateerService := flag.String("privateer-service", "", "Privateer services.<id> key (required with -config)")
	servicesFlag := flag.String("services", "virtual-machines,kubernetes", "Comma-separated service IDs")
	providersFlag := flag.String("providers", "aws,azure,gcp", "Comma-separated providers for discover mode (stop/list without -config)")
	flag.Parse()

	switch *action {
	case "start", "stop", "list":
	default:
		log.Fatal("Error: -action must be start, stop, or list")
	}

	services := splitCSV(*servicesFlag)
	if len(services) == 0 {
		log.Fatal("Error: -services must list at least one service ID")
	}

	var err error
	if *configPath != "" {
		if *privateerService == "" {
			log.Fatal("Error: -privateer-service is required with -config")
		}
		err = runConfigured(*action, *configPath, *privateerService, services)
	} else if *action == "start" {
		log.Fatal("Error: -config and -privateer-service are required for start")
	} else {
		err = runDiscover(*action, splitCSV(*providersFlag), services)
	}
	if errors.Is(err, errFixturesStarted) {
		os.Exit(2)
	}
	if err != nil {
		log.Fatal(err)
	}
}

func runConfigured(action, configPath, privateerService string, services []string) error {
	cfg, err := runner.LoadPrivateerConfig(configPath, privateerService)
	if err != nil {
		return fmt.Errorf("load Privateer config: %w", err)
	}
	provider, err := cfg.Provider()
	if err != nil {
		return err
	}
	factory.ResetFactoryCache()
	cloudFactory, err := factory.NewFactory(provider, cfg)
	if err != nil {
		return err
	}
	failed := false
	for _, serviceID := range services {
		if _, err := actOnService(action, string(provider), serviceID, cloudFactory, cfg); err != nil {
			log.Printf("ERROR %s/%s: %v", provider, serviceID, err)
			failed = true
		}
	}
	if failed {
		return fmt.Errorf("%s completed with errors", action)
	}
	return nil
}

func runDiscover(action string, providers, services []string) error {
	var reported []string
	failed := false
	for _, providerName := range providers {
		cfg, err := configFromEnv(providerName)
		if err != nil {
			log.Printf("skip %s: %v", providerName, err)
			continue
		}
		provider, err := cfg.Provider()
		if err != nil {
			log.Printf("skip %s: %v", providerName, err)
			continue
		}
		factory.ResetFactoryCache()
		cloudFactory, err := factory.NewFactory(provider, cfg)
		if err != nil {
			log.Printf("skip %s: %v", providerName, err)
			failed = true
			continue
		}
		for _, serviceID := range services {
			lines, err := actOnService(action, providerName, serviceID, cloudFactory, cfg)
			if err != nil {
				log.Printf("ERROR %s/%s: %v", providerName, serviceID, err)
				failed = true
				continue
			}
			reported = append(reported, lines...)
		}
	}
	if action == "list" {
		if len(reported) == 0 {
			fmt.Println("OK: no started CCC compute fixtures found")
			return nil
		}
		fmt.Println("STARTED:")
		for _, line := range reported {
			fmt.Println(line)
		}
		return errFixturesStarted
	}
	if failed {
		return fmt.Errorf("%s completed with errors", action)
	}
	return nil
}

func actOnService(action, providerName, serviceID string, cloudFactory factory.Factory, cfg types.Config) ([]string, error) {
	svc, err := cloudFactory.GetServiceAPI(serviceID)
	if err != nil {
		return nil, err
	}
	switch action {
	case "list":
		started, err := svc.StartedDetails()
		if err != nil {
			return nil, err
		}
		lines := make([]string, 0, len(started))
		for _, r := range started {
			lines = append(lines, formatStarted(providerName, serviceID, r))
		}
		return lines, nil
	case "stop":
		started, err := svc.StartedDetails()
		if err != nil {
			return nil, err
		}
		if len(started) == 0 {
			fmt.Printf("==> stop %s/%s: nothing started\n", providerName, serviceID)
			return nil, nil
		}
		var failed bool
		for _, r := range started {
			id := r.ResourceID
			if id == "" {
				id = r.Name
			}
			fmt.Printf("==> stop %s/%s resource=%q state=%q\n", providerName, serviceID, id, r.State)
			if err := svc.Stop(id); err != nil {
				log.Printf("ERROR stop %s/%s %q: %v", providerName, serviceID, id, err)
				failed = true
			} else {
				fmt.Printf("==> stop %s/%s %q ok\n", providerName, serviceID, id)
			}
		}
		if failed {
			return nil, fmt.Errorf("one or more stops failed")
		}
		return nil, nil
	case "start":
		resourceID := resourceIDForService(serviceID, cfg.Get("resource"), cfg.Get("kubernetes-cluster-name"))
		fmt.Printf("==> start %s/%s resource=%q\n", providerName, serviceID, resourceID)
		if err := svc.Start(resourceID); err != nil {
			return nil, err
		}
		fmt.Printf("==> start %s/%s ok\n", providerName, serviceID)
		return nil, nil
	default:
		return nil, fmt.Errorf("unsupported action %q", action)
	}
}

func formatStarted(provider, serviceID string, r generic.StartedResource) string {
	id := r.ResourceID
	if id == "" {
		id = r.Name
	}
	parts := []string{provider, serviceID, id, "state=" + r.State}
	if r.Detail != "" {
		parts = append(parts, r.Detail)
	}
	return strings.Join(parts, " ")
}

func configFromEnv(provider string) (types.Config, error) {
	provider = strings.ToLower(strings.TrimSpace(provider))
	vars := map[string]interface{}{
		"provider": provider,
	}
	switch provider {
	case "aws":
		region := firstEnv("AWS_REGION", "AWS_DEFAULT_REGION")
		if region == "" {
			return types.Config{}, fmt.Errorf("AWS_REGION not set")
		}
		vars["region"] = region
	case "azure":
		sub := os.Getenv("AZURE_SUBSCRIPTION_ID")
		group := firstEnv("AZURE_RESOURCE_GROUP", "AZURE_RESOURCE_GROUP_NAME")
		if group == "" {
			group = "finos-ccc-integration-rg"
		}
		region := firstEnv("AZURE_REGION", "AZURE_LOCATION")
		if region == "" {
			region = "westus2"
		}
		if sub == "" {
			return types.Config{}, fmt.Errorf("AZURE_SUBSCRIPTION_ID not set")
		}
		vars["region"] = region
		vars["azure-subscription-id"] = sub
		vars["azure-resource-group"] = group
		if tenant := os.Getenv("AZURE_TENANT_ID"); tenant != "" {
			vars["azure-tenant-id"] = tenant
		}
	case "gcp":
		project := firstEnv("GCP_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT")
		region := firstEnv("GCP_REGION", "CLOUDSDK_COMPUTE_REGION")
		if region == "" {
			region = "us-east1"
		}
		if project == "" {
			return types.Config{}, fmt.Errorf("GCP_PROJECT_ID not set")
		}
		vars["region"] = region
		vars["gcp-project-id"] = project
		if zone := firstEnv("GCP_ZONE", "CLOUDSDK_COMPUTE_ZONE"); zone != "" {
			vars["zone"] = zone
		}
	default:
		return types.Config{}, fmt.Errorf("unsupported provider %q", provider)
	}
	return types.NewConfig(vars), nil
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return ""
}

func splitCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func resourceIDForService(serviceID, resource, clusterName string) string {
	if serviceID == "kubernetes" {
		if strings.TrimSpace(clusterName) != "" {
			return strings.TrimSpace(clusterName)
		}
	}
	return strings.TrimSpace(resource)
}

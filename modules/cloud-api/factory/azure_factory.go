package factory

import (
	"context"
	"fmt"
	"sync"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/logging"
	objstorage "github.com/finos/common-cloud-controls/cloud-api/object-storage"
	secretsapi "github.com/finos/common-cloud-controls/cloud-api/secrets"
	serverlesscomputing "github.com/finos/common-cloud-controls/cloud-api/serverless-computing"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	virtualmachines "github.com/finos/common-cloud-controls/cloud-api/virtual-machines"
	vpcapi "github.com/finos/common-cloud-controls/cloud-api/vpc"
)

// AzureFactory implements the Factory interface for Azure
type AzureFactory struct {
	ctx          context.Context
	config       types.Config
	serviceCache map[string]generic.Service
	serviceMu    sync.Mutex
}

// NewAzureFactory creates a new Azure factory
func NewAzureFactory(config types.Config) *AzureFactory {
	return &AzureFactory{
		ctx:          context.Background(),
		config:       config,
		serviceCache: make(map[string]generic.Service),
	}
}

// GetServiceAPI returns a generic service API client for the given service type
func (f *AzureFactory) GetServiceAPI(serviceID string) (generic.Service, error) {
	key := serviceID
	f.serviceMu.Lock()
	if cached, ok := f.serviceCache[key]; ok {
		f.serviceMu.Unlock()
		return cached, nil
	}
	f.serviceMu.Unlock()

	var service generic.Service
	var err error
	switch serviceID {
	case "object-storage":
		var blobSvc *objstorage.AzureBlobService
		blobSvc, err = objstorage.NewAzureBlobService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}
		service = blobSvc
		if err := service.ElevateAccessForInspection(); err != nil {
			fmt.Printf("⚠️  Warning: Failed to elevate access for %s: %v\n", serviceID, err)
		}

	case "logging":
		service, err = logging.NewAzureLoggingService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure logging service: %w", err)
		}
	case "virtual-machines":
		service, err = virtualmachines.NewAzureVirtualMachinesService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}
	case "serverless-computing":
		service, err = serverlesscomputing.NewAzureServerlessComputingService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}
	case "vpc":
		service, err = vpcapi.NewAzureVPCService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}
	case "secrets":
		service, err = secretsapi.NewAzureSecretsService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}

	default:
		return nil, fmt.Errorf("unsupported service type for Azure: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetServiceAPIWithIdentity returns a service API client for identityKey (e.g. test-user-read).
func (f *AzureFactory) GetServiceAPIWithIdentity(serviceID string, identityKey string) (generic.Service, error) {
	identity, err := f.config.Identity(identityKey)
	if err != nil {
		return nil, err
	}
	key := serviceID + ":" + identity.UserName
	f.serviceMu.Lock()
	if cached, ok := f.serviceCache[key]; ok {
		f.serviceMu.Unlock()
		return cached, nil
	}
	f.serviceMu.Unlock()

	var service generic.Service
	switch serviceID {
	case "object-storage":
		service, err = objstorage.NewAzureBlobServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity %q: %w", serviceID, identityKey, err)
		}
	case "virtual-machines":
		service, err = virtualmachines.NewAzureVirtualMachinesServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity %q: %w", serviceID, identityKey, err)
		}
	case "serverless-computing":
		service, err = serverlesscomputing.NewAzureServerlessComputingServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity %q: %w", serviceID, identityKey, err)
		}
	case "vpc":
		service, err = vpcapi.NewAzureVPCServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity %q: %w", serviceID, identityKey, err)
		}
	case "secrets":
		service, err = secretsapi.NewAzureSecretsServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity %q: %w", serviceID, identityKey, err)
		}

	default:
		return nil, fmt.Errorf("unsupported service type for Azure: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetProvider returns the cloud provider
func (f *AzureFactory) GetProvider() types.CloudProvider {
	return types.ProviderAzure
}

// TearDown calls TearDown on all cached services
func (f *AzureFactory) TearDown() error {
	f.serviceMu.Lock()
	services := make([]generic.Service, 0, len(f.serviceCache))
	for _, svc := range f.serviceCache {
		services = append(services, svc)
	}
	f.serviceMu.Unlock()

	for _, svc := range services {
		if err := svc.TearDown(); err != nil {
			fmt.Printf("⚠️  TearDown failed: %v\n", err)
		}
	}
	return nil
}

// SetContext sets the context for this factory
func (f *AzureFactory) SetContext(ctx context.Context) {
	f.ctx = ctx
}

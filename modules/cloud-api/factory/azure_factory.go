package factory

import (
	"context"
	"fmt"
	"sync"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/iam"
	"github.com/finos/common-cloud-controls/cloud-api/logging"
	objstorage "github.com/finos/common-cloud-controls/cloud-api/object-storage"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AzureFactory implements the Factory interface for Azure
type AzureFactory struct {
	ctx          context.Context
	instance     types.InstanceConfig
	iamService   generic.Service
	serviceCache map[string]generic.Service
	serviceMu    sync.Mutex
}

// NewAzureFactory creates a new Azure factory
func NewAzureFactory(instance types.InstanceConfig) *AzureFactory {
	ctx := context.Background()

	// Create IAM service once and cache it
	iamService, err := iam.NewAzureIAMService(ctx, instance)
	if err != nil {
		fmt.Printf("⚠️  Warning: Failed to create Azure IAM service: %v\n", err)
	}

	return &AzureFactory{
		ctx:          ctx,
		instance:     instance,
		iamService:   iamService,
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
	case "iam":
		service = f.iamService

	case "object-storage":
		var blobSvc *objstorage.AzureBlobService
		blobSvc, err = objstorage.NewAzureBlobService(f.ctx, &f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s': %w", serviceID, err)
		}
		service = blobSvc
		if err := service.ElevateAccessForInspection(); err != nil {
			fmt.Printf("⚠️  Warning: Failed to elevate access for %s: %v\n", serviceID, err)
		}

	case "logging":
		service, err = logging.NewAzureLoggingService(f.ctx, &f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure logging service: %w", err)
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

// GetServiceAPIWithIdentity returns a service API client authenticated as the given identity
func (f *AzureFactory) GetServiceAPIWithIdentity(serviceID string, identity *iam.Identity, testAccess bool) (generic.Service, error) {
	if identity.Provider != string(types.ProviderAzure) {
		return nil, fmt.Errorf("identity is not for Azure provider: %s", identity.Provider)
	}

	key := serviceID + ":" + identity.UserName
	f.serviceMu.Lock()
	if cached, ok := f.serviceCache[key]; ok {
		f.serviceMu.Unlock()
		return cached, nil
	}
	f.serviceMu.Unlock()

	cloudParams := f.instance.CloudParams()

	var service generic.Service
	var err error
	switch serviceID {
	case "iam":
		service = f.iamService

	case "object-storage":
		service, err = objstorage.NewAzureBlobServiceWithCredentials(f.ctx, cloudParams, f.instance, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create Azure service '%s' with identity: %w", serviceID, err)
		}
		if testAccess {
			if err = waitForUserProvisioning(service); err != nil {
				return nil, fmt.Errorf("user provisioning validation failed: %w", err)
			}
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

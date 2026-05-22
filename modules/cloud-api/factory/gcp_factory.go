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

// GCPFactory implements the Factory interface for GCP
type GCPFactory struct {
	ctx          context.Context
	instance     types.InstanceConfig
	iamService   generic.Service
	serviceCache map[string]generic.Service
	serviceMu    sync.Mutex
}

// NewGCPFactory creates a new GCP factory
func NewGCPFactory(instance types.InstanceConfig) *GCPFactory {
	ctx := context.Background()
	cloudParams := instance.CloudParams()

	// Create IAM service once and cache it
	var iamService generic.Service
	if cloudParams.GcpProjectId != "" {
		var err error
		iamService, err = iam.NewGCPIAMService(ctx, instance)
		if err != nil {
			fmt.Printf("⚠️  Warning: Failed to create GCP IAM service: %v\n", err)
		}
	}

	return &GCPFactory{
		ctx:          ctx,
		instance:     instance,
		iamService:   iamService,
		serviceCache: make(map[string]generic.Service),
	}
}

// GetServiceAPI returns a generic service API client for the given service type
func (f *GCPFactory) GetServiceAPI(serviceID string) (generic.Service, error) {
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
		service, err = objstorage.NewGCPStorageService(f.ctx, f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s': %w", serviceID, err)
		}

	case "logging":
		service, err = logging.NewGCPLoggingService(f.ctx, &f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP logging service: %w", err)
		}

	default:
		return nil, fmt.Errorf("unsupported service type for GCP: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetServiceAPIWithIdentity returns a service API client authenticated as the given identity
func (f *GCPFactory) GetServiceAPIWithIdentity(serviceID string, identity *iam.Identity, testAccess bool) (generic.Service, error) {
	if identity.Provider != string(types.ProviderGCP) {
		return nil, fmt.Errorf("identity is not for GCP provider: %s", identity.Provider)
	}

	key := serviceID + ":" + identity.UserName
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
		service, err = objstorage.NewGCPStorageServiceWithCredentials(f.ctx, f.instance, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCS service with credentials: %w", err)
		}
		if testAccess {
			if err := service.CheckUserProvisioned(); err != nil {
				return nil, fmt.Errorf("credentials not ready: %w", err)
			}
		}

	default:
		return nil, fmt.Errorf("unsupported service type for GCP: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetProvider returns the cloud provider
func (f *GCPFactory) GetProvider() types.CloudProvider {
	return types.ProviderGCP
}

// TearDown calls TearDown on all cached services
func (f *GCPFactory) TearDown() error {
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
func (f *GCPFactory) SetContext(ctx context.Context) {
	f.ctx = ctx
}

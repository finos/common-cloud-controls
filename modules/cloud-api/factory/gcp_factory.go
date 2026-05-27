package factory

import (
	"context"
	"fmt"
	"sync"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/logging"
	objstorage "github.com/finos/common-cloud-controls/cloud-api/object-storage"
	serverlesscomputing "github.com/finos/common-cloud-controls/cloud-api/serverless-computing"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	virtualmachines "github.com/finos/common-cloud-controls/cloud-api/virtual-machines"
)

// GCPFactory implements the Factory interface for GCP
type GCPFactory struct {
	ctx          context.Context
	config       types.Config
	serviceCache map[string]generic.Service
	serviceMu    sync.Mutex
}

// NewGCPFactory creates a new GCP factory
func NewGCPFactory(config types.Config) *GCPFactory {
	return &GCPFactory{
		ctx:          context.Background(),
		config:       config,
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
	case "object-storage":
		service, err = objstorage.NewGCPStorageService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s': %w", serviceID, err)
		}

	case "logging":
		service, err = logging.NewGCPLoggingService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP logging service: %w", err)
		}
	case "virtual-machines":
		service, err = virtualmachines.NewGCPVirtualMachinesService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s': %w", serviceID, err)
		}
	case "serverless-computing":
		service, err = serverlesscomputing.NewGCPServerlessComputingService(f.ctx, f.config)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s': %w", serviceID, err)
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

// GetServiceAPIWithIdentity returns a service API client for identityKey (e.g. testUserRead).
func (f *GCPFactory) GetServiceAPIWithIdentity(serviceID string, identityKey string, testAccess bool) (generic.Service, error) {
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
		service, err = objstorage.NewGCPStorageServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCS service with identity %q: %w", identityKey, err)
		}
		if testAccess {
			if err := service.CheckUserProvisioned(); err != nil {
				return nil, fmt.Errorf("credentials not ready: %w", err)
			}
		}
	case "virtual-machines":
		service, err = virtualmachines.NewGCPVirtualMachinesServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s' with identity %q: %w", serviceID, identityKey, err)
		}
	case "serverless-computing":
		service, err = serverlesscomputing.NewGCPServerlessComputingServiceWithCredentials(f.ctx, f.config, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create GCP service '%s' with identity %q: %w", serviceID, identityKey, err)
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

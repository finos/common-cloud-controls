package factory

import (
	"context"
	"fmt"
	"sync"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/iam"
	"github.com/finos/common-cloud-controls/cloud-api/logging"
	objstorage "github.com/finos/common-cloud-controls/cloud-api/object-storage"
	vpcapi "github.com/finos/common-cloud-controls/cloud-api/vpc"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AWSFactory implements the Factory interface for AWS
type AWSFactory struct {
	ctx          context.Context
	instance     types.InstanceConfig
	iamService   generic.Service
	serviceCache map[string]generic.Service
	serviceMu    sync.Mutex
}

// NewAWSFactory creates a new AWS factory
func NewAWSFactory(instance types.InstanceConfig) *AWSFactory {
	ctx := context.Background()

	// Create IAM service once and cache it
	iamService, err := iam.NewAWSIAMService(ctx, instance)
	if err != nil {
		fmt.Printf("⚠️  Warning: Failed to create AWS IAM service: %v\n", err)
	}

	return &AWSFactory{
		ctx:          ctx,
		instance:     instance,
		iamService:   iamService,
		serviceCache: make(map[string]generic.Service),
	}
}

// GetServiceAPI returns a generic service API client for the given service type
func (f *AWSFactory) GetServiceAPI(serviceID string) (generic.Service, error) {
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
		if f.iamService == nil {
			return nil, fmt.Errorf("AWS IAM service not initialized")
		}
		service = f.iamService

	case "object-storage":
		service, err = objstorage.NewAWSS3Service(f.ctx, f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create AWS service '%s': %w", serviceID, err)
		}
		if err := service.ElevateAccessForInspection(); err != nil {
			fmt.Printf("⚠️  Warning: Failed to elevate access for %s: %v\n", serviceID, err)
		}

	case "logging":
		service, err = logging.NewAWSLoggingService(f.ctx, &f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create AWS logging service: %w", err)
		}

	case "vpc":
		service, err := vpcapi.NewAWSVPCService(f.ctx, f.instance)
		if err != nil {
			return nil, fmt.Errorf("failed to create AWS service '%s': %w", serviceID, err)
		}
		return service, nil

	default:
		return nil, fmt.Errorf("unsupported service type for AWS: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetServiceAPIWithIdentity returns a service API client authenticated as the given identity
func (f *AWSFactory) GetServiceAPIWithIdentity(serviceID string, identity *iam.Identity, testAccess bool) (generic.Service, error) {
	if identity.Provider != string(types.ProviderAWS) {
		return nil, fmt.Errorf("identity is not for AWS provider: %s", identity.Provider)
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
		service, err = objstorage.NewAWSS3ServiceWithCredentials(f.ctx, f.instance, identity)
		if err != nil {
			return nil, fmt.Errorf("failed to create AWS service '%s' with identity: %w", serviceID, err)
		}
		if err := service.ElevateAccessForInspection(); err != nil {
			fmt.Printf("⚠️  Warning: Failed to elevate access for %s: %v\n", serviceID, err)
		}
		if testAccess {
			if err = waitForUserProvisioning(service); err != nil {
				return nil, fmt.Errorf("user provisioning validation failed: %w", err)
			}
		}

	case "vpc":
		// VPC tests currently run with the runner's ambient credentials.
		// Per-identity clients can be added later when needed for negative testing.
		return nil, fmt.Errorf("vpc with identity not yet implemented for AWS")

	default:
		return nil, fmt.Errorf("unsupported service type for AWS: %s", serviceID)
	}

	if service != nil {
		f.serviceMu.Lock()
		f.serviceCache[key] = service
		f.serviceMu.Unlock()
	}
	return service, nil
}

// GetProvider returns the cloud provider
func (f *AWSFactory) GetProvider() types.CloudProvider {
	return types.ProviderAWS
}

// TearDown calls TearDown on all cached services
func (f *AWSFactory) TearDown() error {
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
func (f *AWSFactory) SetContext(ctx context.Context) {
	f.ctx = ctx
}

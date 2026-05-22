package factory

import (
	"fmt"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/iam"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Cache for factories (one per provider)
var factoryCache = make(map[types.CloudProvider]Factory)

// Factory creates cloud service API clients for different providers
type Factory interface {
	// GetServiceAPI returns a generic service API client for the given service ID
	GetServiceAPI(serviceID string) (generic.Service, error)

	// GetServiceAPIWithIdentity returns a service API client authenticated as the given identity
	// If testAccess is true, validates that the identity's permissions have propagated before returning
	GetServiceAPIWithIdentity(serviceID string, identity *iam.Identity, testAccess bool) (generic.Service, error)

	// GetProvider returns the cloud provider this factory is configured for
	GetProvider() types.CloudProvider

	// TearDown calls TearDown on all cached services to remove test-created resources
	TearDown() error
}

// NewFactory creates a new factory for the specified cloud provider.
// instance carries all environment configuration, including service-specific properties.
// Factories are cached per provider to ensure IAM service caching works across calls.
func NewFactory(provider types.CloudProvider, instance types.InstanceConfig) (Factory, error) {
	// Check cache first
	if cachedFactory, exists := factoryCache[provider]; exists {
		fmt.Printf("♻️  Using cached factory for provider: %s\n", provider)
		return cachedFactory, nil
	}

	// Create new factory
	fmt.Printf("🏭 Creating new factory for provider: %s\n", provider)
	var factory Factory
	switch provider {
	case types.ProviderAWS:
		factory = NewAWSFactory(instance)
	case types.ProviderAzure:
		factory = NewAzureFactory(instance)
	case types.ProviderGCP:
		factory = NewGCPFactory(instance)
	default:
		return nil, fmt.Errorf("unsupported cloud provider: %s", provider)
	}

	// Cache the factory
	factoryCache[provider] = factory
	return factory, nil
}

// waitForUserProvisioning validates that a user's permissions have propagated to the service
// This is a shared helper used by all factories to handle IAM propagation delays
func waitForUserProvisioning(service generic.Service) error {
	maxAttempts := 12 // 12 attempts * 5 seconds = 60 seconds max
	fmt.Printf("   🔄 Validating user permissions have propagated to service...\n")

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		err := service.CheckUserProvisioned()
		if err == nil {
			fmt.Printf("   ✅ User permissions validated after %d attempt(s)\n", attempt)
			return nil
		}

		// Wait and retry
		if attempt < maxAttempts {
			waitTime := 5 * time.Second
			fmt.Printf("   ⏳ Permissions not ready yet (attempt %d/%d), waiting %v...\n", attempt, maxAttempts, waitTime)
			time.Sleep(waitTime)
			continue
		}

		// Max attempts reached
		return fmt.Errorf("user permissions validation timed out after %d attempts: %w", attempt, err)
	}

	return fmt.Errorf("user permissions validation timed out after %d seconds", maxAttempts*5)
}

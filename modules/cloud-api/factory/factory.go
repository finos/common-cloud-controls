package factory

import (
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Cache for factories (one per provider)
var factoryCache = make(map[types.CloudProvider]Factory)

// ResetFactoryCache clears cached factories between integration test cases.
func ResetFactoryCache() {
	factoryCache = make(map[types.CloudProvider]Factory)
}

// Factory creates cloud service API clients for different providers
type Factory interface {
	// GetServiceAPI returns a generic service API client for the given service ID
	GetServiceAPI(serviceID string) (generic.Service, error)

	// GetServiceAPIWithIdentity returns a service API client for identityKey (e.g. test-user-read).
	// Credentials are resolved from config test-identities.
	GetServiceAPIWithIdentity(serviceID string, identityKey string) (generic.Service, error)

	// GetProvider returns the cloud provider this factory is configured for
	GetProvider() types.CloudProvider

	// TearDown calls TearDown on all cached services to remove test-created resources
	TearDown() error
}

// NewFactory creates a new factory for the specified cloud provider.
// config is the Privateer services.*.vars map (expanded); factories read it directly.
// Factories are cached per provider to ensure IAM service caching works across calls.
func NewFactory(provider types.CloudProvider, config types.Config) (Factory, error) {
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
		factory = NewAWSFactory(config)
	case types.ProviderAzure:
		factory = NewAzureFactory(config)
	case types.ProviderGCP:
		factory = NewGCPFactory(config)
	default:
		return nil, fmt.Errorf("unsupported cloud provider: %s", provider)
	}

	// Cache the factory
	factoryCache[provider] = factory
	return factory, nil
}

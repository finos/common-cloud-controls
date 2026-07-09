# Cloud Service API

Go module: `github.com/finos/common-cloud-controls/cloud-api`

```bash
go get github.com/finos/common-cloud-controls/cloud-api@latest
```

This package provides a unified interface for interacting with cloud service APIs across AWS, Azure, and GCP.

CI runs unit tests and builds on every PR that touches `modules/**`.

## Architecture

### Factory Pattern (`factory/`)

The factory pattern provides a consistent way to create cloud service clients:

```go
import (
 "github.com/finos/common-cloud-controls/cloud-api/factory"
 "github.com/finos/common-cloud-controls/cloud-api/types"
)

// Create a factory for a specific cloud provider
factory, err := factory.NewFactory(types.ProviderAWS, instanceConfig)

// Get a service API client
service, err := factory.GetServiceAPI("object-storage")
service, err := factory.GetServiceAPI("iam")

// Get a service API with a specific identity
identity, err := iamService.ProvisionUser("test-user")
service, err := factory.GetServiceAPIWithIdentity("object-storage", identity)
```

### Generic Service Interface (`generic/`)

The `Service` interface provides a common abstraction for all cloud services. Currently empty but will be extended with common operations.

### IAM Service (`iam/`)

The `IAMService` interface provides identity and access management operations:

- **ProvisionUser**: Create a new user/identity
- **SetAccess**: Grant access to a service at a specific level (read/write/admin)
- **DestroyUser**: Remove an identity and all associated access

```go
// Get IAM service from factory
iamService, err := factory.GetIAMService()

// Provision a new user
identity, err := iamService.ProvisionUser("test-user")

// Grant access to a service
err = iamService.SetAccess("test-user", "service-id", iam.AccessLevelRead)

// Remove the user
err = iamService.DestroyUser("test-user")
```

## Usage in Tests

These APIs will be used by the compliance test framework to:

1. Provision test users/identities
2. Grant specific access levels to test privilege escalation
3. Interact with services using different identities
4. Clean up test resources after testing

## VPC (AWS)

The `vpc/` package implements AWS VPC helpers (including CN03/CN04 classification).

## Releases

Tag releases with `cloud-api/vX.Y.Z` (for example `cloud-api/v0.1.0`). The [release-cloud-api workflow](../../.github/workflows/release-cloud-api.yml) verifies the module and creates a GitHub release.

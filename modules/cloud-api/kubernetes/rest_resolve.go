package kubernetes

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	"k8s.io/client-go/rest"
)

// resolveProviderRESTConfig derives a REST config from CSP credentials.
// Used by admission-webhook (which is not itself a ControlPlane).
func resolveProviderRESTConfig(ctx context.Context, cfg types.Config, identity *types.Identity) (*rest.Config, error) {
	provider, err := cfg.Provider()
	if err != nil {
		return nil, err
	}
	switch provider {
	case types.ProviderAWS:
		var svc *AWSService
		if identity != nil {
			svc, err = NewAWSServiceWithCredentials(ctx, cfg, *identity)
		} else {
			svc, err = NewAWSService(ctx, cfg)
		}
		if err != nil {
			return nil, err
		}
		return svc.ensureRESTConfig()
	case types.ProviderAzure:
		var svc *AzureService
		if identity != nil {
			svc, err = NewAzureServiceWithCredentials(ctx, cfg, *identity)
		} else {
			svc, err = NewAzureService(ctx, cfg)
		}
		if err != nil {
			return nil, err
		}
		return svc.ensureRESTConfig()
	case types.ProviderGCP:
		var svc *GCPService
		if identity != nil {
			svc, err = NewGCPServiceWithCredentials(ctx, cfg, *identity)
		} else {
			svc, err = NewGCPService(ctx, cfg)
		}
		if err != nil {
			return nil, err
		}
		return svc.ensureRESTConfig()
	default:
		return nil, fmt.Errorf("unsupported provider %q for kubernetes REST config", provider)
	}
}

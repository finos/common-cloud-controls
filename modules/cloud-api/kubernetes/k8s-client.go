package kubernetes

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/reachability"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// KubeClient is the portable Kubernetes API façade shared across AWS/Azure/GCP.
// Features obtain it via ControlPlane.GetKubernetesClient and refer to it as "kubeClient".
type KubeClient struct {
	ctx        context.Context
	config     types.Config
	restConfig *rest.Config
	client     kubernetes.Interface
	prober     reachability.Prober
	provider   string
}

// GetKubernetesClient builds a KubeClient using CSP-derived credentials.
func (s *managedService) GetKubernetesClient() (*KubeClient, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	if s.restConfig == nil {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: could not derive REST config from kubernetes-cluster-name / cloud credentials")
	}
	return &KubeClient{
		ctx:        s.ctx,
		config:     s.config,
		restConfig: s.restConfig,
		client:     client,
		prober:     s.prober,
		provider:   s.provider,
	}, nil
}

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

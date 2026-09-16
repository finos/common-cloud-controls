package kubernetes

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/reachability"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Client is the portable Kubernetes API façade shared across AWS/Azure/GCP.
// Features obtain it via ControlPlane.GetKubernetesClient and refer to it as "kubeClient".
type Client struct {
	ctx        context.Context
	config     types.Config
	restConfig *rest.Config
	client     kubernetes.Interface
	prober     reachability.Prober
	provider   string
}

// GetKubernetesClient builds a Client from the control-plane's kubeconfig.
func (s *managedService) GetKubernetesClient() (*Client, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	if s.restConfig == nil {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: configure kubeconfig or kubeconfig-path")
	}
	return &Client{
		ctx:        s.ctx,
		config:     s.config,
		restConfig: s.restConfig,
		client:     client,
		prober:     s.prober,
		provider:   s.provider,
	}, nil
}

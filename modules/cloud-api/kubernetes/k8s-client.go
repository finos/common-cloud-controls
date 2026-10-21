package kubernetes

import (
	"context"
	"fmt"
	"strings"

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
	// autoscalers returns CSP node-pool scaling bounds (nil when the provider has none).
	autoscalers func(context.Context) ([]autoscalerBound, error)
	// infraIdentities returns CN17 identities from the CSP API when SA list is Forbidden.
	infraIdentities func(context.Context, string) (map[string]interface{}, error)
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
		autoscalers: func() func(context.Context) ([]autoscalerBound, error) {
			if s.autoscalers == nil {
				return nil
			}
			return s.nodeAutoscalers
		}(),
		infraIdentities: s.infraIdentities,
	}, nil
}

// ControlPlane wrappers so cloud-api-test CSV reflection can hit KubeClient probes.
func (s *managedService) withKubeClient(fn func(*KubeClient) (map[string]interface{}, error)) (map[string]interface{}, error) {
	client, err := s.GetKubernetesClient()
	if err != nil {
		return nil, err
	}
	return fn(client)
}

func (s *managedService) GetRBACPolicyFindings(clusterID string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetRBACPolicyFindings(clusterID)
	})
}

func (s *managedService) GetWorkloadIdentityStatus(clusterID, namespace, serviceAccount string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetWorkloadIdentityStatus(clusterID, namespace, serviceAccount)
	})
}

func (s *managedService) FindStaticCloudCredentials(clusterID, namespace string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.FindStaticCloudCredentials(clusterID, namespace)
	})
}

func (s *managedService) GetAdmissionPolicyCoverage(clusterID string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetAdmissionPolicyCoverage(clusterID)
	})
}

func (s *managedService) GetNamespaceNetworkPolicyStatus(clusterID, namespace string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetNamespaceNetworkPolicyStatus(clusterID, namespace)
	})
}

func (s *managedService) AttemptCreatePVC(clusterID, claimYAML string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.AttemptCreatePVC(clusterID, claimYAML)
	})
}

func (s *managedService) GetResourceConsumptionBounds(clusterID, namespace string) (map[string]interface{}, error) {
	result, err := s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetResourceConsumptionBounds(clusterID, namespace)
	})
	if err == nil {
		return result, nil
	}
	if !shouldFallbackBounds(err) {
		return result, err
	}
	return s.boundsFromProviderAutoscalers(err)
}

func shouldFallbackBounds(err error) bool {
	if err == nil {
		return false
	}
	if IsAPIUnreachable(err) {
		return true
	}
	msg := strings.ToLower(err.Error())
	for _, needle := range []string{
		"could not derive rest config",
		"prerequisite missing",
		"forbidden",
		"unauthorized",
	} {
		if strings.Contains(msg, needle) {
			return true
		}
	}
	return false
}

func (s *managedService) boundsFromProviderAutoscalers(kubeErr error) (map[string]interface{}, error) {
	if s.autoscalers == nil {
		return nil, kubeErr
	}
	pools, err := s.autoscalers(s.ctx, "")
	if err != nil {
		return nil, err
	}
	maxByName := map[string]interface{}{}
	enabled := false
	within := true
	nodeCap := configInt(s.config, "approved-autoscaler-max", 0)
	for _, bound := range pools {
		maxByName[bound.Name] = bound.Max
		enabled = enabled || bound.Enabled
		switch {
		case bound.Max <= 0:
			within = false
		case nodeCap <= 0:
			within = false
		case bound.Max > nodeCap:
			within = false
		}
	}
	result := map[string]interface{}{
		"Quotas": map[string]interface{}{}, "AutoscalerMax": maxByName,
		"AutoscalingEnabled": enabled, "AutoscalerWithinApprovedMax": within,
		"EvidenceSource": "csp-node-pool",
	}
	if kubeErr != nil {
		result["KubeAPIError"] = kubeErr.Error()
	}
	return result, nil
}

func (s *managedService) GetInfrastructureIdentities(clusterID string) (map[string]interface{}, error) {
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.GetInfrastructureIdentities(clusterID)
	})
}

// ProbeNodeAdminInterfacesFromConfig is the 1-argument feature entry point
// (port lists come from Privateer vars, not Godog slices).
func (s *managedService) ProbeNodeAdminInterfacesFromConfig(clusterID string) (map[string]interface{}, error) {
	return s.ProbeNodeAdminInterfaces(clusterID, "", s.config.Get("kubelet-ports"), s.config.Get("node-mgmt-ports"))
}

func (s *managedService) GetResourceConsumptionBoundsFromConfig(clusterID string) (map[string]interface{}, error) {
	return s.GetResourceConsumptionBounds(clusterID, configOr(s.config, "test-workload-namespace", "default"))
}

func (c *KubeClient) GetResourceConsumptionBoundsFromConfig(clusterID string) (map[string]interface{}, error) {
	return c.GetResourceConsumptionBounds(clusterID, configOr(c.config, "test-workload-namespace", "default"))
}

func (c *KubeClient) AttemptSecretAccessFromConfig(clusterID, secretName, serviceAccount, verb string) (map[string]interface{}, error) {
	return c.AttemptSecretAccessAsIdentity(
		clusterID,
		configOr(c.config, "test-workload-namespace", "default"),
		secretName,
		serviceAccount,
		verb,
	)
}

func (c *KubeClient) AttemptWorkloadNetworkFlowFromConfig(clusterID, selector, host string) (map[string]interface{}, error) {
	return c.AttemptWorkloadNetworkFlow(
		clusterID,
		selector,
		host,
		int(configInt(c.config, "network-probe-port", 8080)),
		configOr(c.config, "network-probe-protocol", "tcp"),
	)
}

func (s *managedService) ProbeNodeAdminInterfaces(clusterID, nodeID string, kubeletPorts, mgmtPorts any) (map[string]interface{}, error) {
	if s.nodeAdmin != nil {
		arm, err := s.nodeAdmin(s.ctx, clusterID)
		if err == nil {
			if present, _ := arm["PublicIPPresent"].(bool); !present {
				return arm, nil
			}
		}
	}
	return s.withKubeClient(func(c *KubeClient) (map[string]interface{}, error) {
		return c.ProbeNodeAdminInterfaces(clusterID, nodeID, kubeletPorts, mgmtPorts)
	})
}

// ResolveProviderRESTConfig derives a REST config from CSP credentials.
// Used by the admission-webhook factory service (which is not itself a ControlPlane).
func ResolveProviderRESTConfig(ctx context.Context, cfg types.Config, identity *types.Identity) (*rest.Config, error) {
	return resolveProviderRESTConfig(ctx, cfg, identity)
}

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

package admissionwebhook

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	admissionv1 "k8s.io/api/admissionregistration/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

type Service interface {
	generic.Service
	SetBackendAvailability(clusterID string, enabled bool) (map[string]interface{}, error)
}

var _ Service = (*Controller)(nil)

type Controller struct {
	ctx        context.Context
	config     types.Config
	restConfig *rest.Config
	client     kubernetes.Interface
}

func NewService(ctx context.Context, cfg types.Config) (*Controller, error) {
	return newService(ctx, cfg, nil), nil
}

func NewServiceWithIdentity(ctx context.Context, cfg types.Config, identity types.Identity) (*Controller, error) {
	return newService(ctx, cfg, &identity), nil
}

func newService(ctx context.Context, cfg types.Config, identity *types.Identity) *Controller {
	controller := &Controller{ctx: ctx, config: cfg}
	kubeconfig := cfg.Get("kubeconfig", "kubeconfig-path")
	if identity != nil {
		if value := identity.Get("kubeconfig", "kubeconfig_path"); value != "" {
			kubeconfig = value
		}
	}
	var rc *rest.Config
	var err error
	if strings.Contains(kubeconfig, "\n") {
		rc, err = clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	} else if kubeconfig != "" {
		if strings.HasPrefix(kubeconfig, "~/") {
			if home, homeErr := os.UserHomeDir(); homeErr == nil {
				kubeconfig = home + strings.TrimPrefix(kubeconfig, "~")
			}
		}
		rc, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
	}
	if err == nil {
		controller.restConfig = rc
	}
	return controller
}

func (c *Controller) kubeClient() (kubernetes.Interface, error) {
	if c.client != nil {
		return c.client, nil
	}
	if c.restConfig == nil {
		return nil, fmt.Errorf("admission-webhook prerequisite missing: configure kubeconfig or kubeconfig-path with a provider-authenticated exec credential")
	}
	client, err := kubernetes.NewForConfig(c.restConfig)
	if err != nil {
		return nil, fmt.Errorf("create Kubernetes client: %w", err)
	}
	c.client = client
	return client, nil
}

func (c *Controller) SetBackendAvailability(clusterID string, enabled bool) (map[string]interface{}, error) {
	if configured := c.config.Get("resource"); configured != "" && clusterID != "" && configured != clusterID {
		return nil, fmt.Errorf("clusterID %q does not match configured resource %q", clusterID, configured)
	}
	namespace := c.config.Get("webhook-probe-namespace")
	testNamespace := c.config.Get("webhook-probe-test-namespace")
	deploymentName := c.config.Get("webhook-probe-deployment")
	serviceName := c.config.Get("webhook-probe-service")
	webhookName := c.config.Get("webhook-probe-configuration")
	if namespace == "" || testNamespace == "" || deploymentName == "" || serviceName == "" || webhookName == "" {
		return nil, fmt.Errorf("webhook-probe-namespace, webhook-probe-test-namespace, webhook-probe-deployment, webhook-probe-service, and webhook-probe-configuration are required")
	}
	client, err := c.kubeClient()
	if err != nil {
		return nil, err
	}
	deployment, err := client.AppsV1().Deployments(namespace).Get(c.ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get configured webhook probe deployment: %w", err)
	}
	if deployment.UID == "" || deployment.Labels["app.kubernetes.io/name"] != deploymentName {
		return nil, fmt.Errorf("refusing to scale deployment %s/%s: fixture UID or app.kubernetes.io/name guardrail failed", namespace, deploymentName)
	}
	service, err := client.CoreV1().Services(namespace).Get(c.ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get configured webhook probe service: %w", err)
	}
	if !selectorMatches(service.Spec.Selector, deployment.Spec.Template.Labels) {
		return nil, fmt.Errorf("refusing to scale deployment: service %s/%s does not select its pod template", namespace, serviceName)
	}
	configuration, err := client.AdmissionregistrationV1().ValidatingWebhookConfigurations().Get(c.ctx, webhookName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get configured validating webhook: %w", err)
	}
	failurePolicy, err := validateRegistration(configuration, namespace, serviceName, testNamespace, client)
	if err != nil {
		return nil, err
	}

	replicas := int32(0)
	if enabled {
		replicas = int32Config(c.config, "webhook-probe-enabled-replicas", 1)
	}
	scale, err := client.AppsV1().Deployments(namespace).GetScale(c.ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get webhook probe scale: %w", err)
	}
	scale.Spec.Replicas = replicas
	if _, err := client.AppsV1().Deployments(namespace).UpdateScale(c.ctx, deploymentName, scale, metav1.UpdateOptions{}); err != nil {
		return nil, fmt.Errorf("update webhook probe scale: %w", err)
	}

	timeout := durationConfig(c.config, "webhook-probe-timeout-ms", 30*time.Second)
	deadline := time.Now().Add(timeout)
	var readyReplicas, readyEndpoints int32
	for {
		current, getErr := client.AppsV1().Deployments(namespace).Get(c.ctx, deploymentName, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("watch webhook probe deployment: %w", getErr)
		}
		readyReplicas = current.Status.ReadyReplicas
		slices, listErr := client.DiscoveryV1().EndpointSlices(namespace).List(c.ctx, metav1.ListOptions{LabelSelector: "kubernetes.io/service-name=" + serviceName})
		if listErr != nil {
			return nil, fmt.Errorf("list webhook probe EndpointSlices: %w", listErr)
		}
		readyEndpoints = 0
		for _, slice := range slices.Items {
			for _, endpoint := range slice.Endpoints {
				if endpoint.Conditions.Ready != nil && *endpoint.Conditions.Ready {
					readyEndpoints++
				}
			}
		}
		if (!enabled && readyReplicas == 0 && readyEndpoints == 0) ||
			(enabled && readyReplicas >= replicas && readyEndpoints > 0) {
			break
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("timed out waiting for webhook backend enabled=%t (readyReplicas=%d readyEndpoints=%d)", enabled, readyReplicas, readyEndpoints)
		}
		select {
		case <-c.ctx.Done():
			return nil, c.ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
	if _, err := client.AdmissionregistrationV1().ValidatingWebhookConfigurations().Get(c.ctx, webhookName, metav1.GetOptions{}); err != nil {
		return nil, fmt.Errorf("webhook registration disappeared after scale change: %w", err)
	}
	return map[string]interface{}{
		"Enabled": enabled, "DesiredReplicas": replicas, "ReadyReplicas": readyReplicas,
		"ReadyEndpoints": readyEndpoints, "RegistrationPresent": true, "FailurePolicy": failurePolicy,
	}, nil
}

func validateRegistration(configuration *admissionv1.ValidatingWebhookConfiguration, namespace, serviceName, testNamespace string, client kubernetes.Interface) (string, error) {
	ns, err := client.CoreV1().Namespaces().Get(context.Background(), testNamespace, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get webhook test namespace: %w", err)
	}
	for _, webhook := range configuration.Webhooks {
		if webhook.ClientConfig.Service == nil ||
			webhook.ClientConfig.Service.Namespace != namespace ||
			webhook.ClientConfig.Service.Name != serviceName {
			continue
		}
		if webhook.FailurePolicy == nil || *webhook.FailurePolicy != admissionv1.Fail {
			return "", fmt.Errorf("webhook %q must retain failurePolicy=Fail", webhook.Name)
		}
		if webhook.NamespaceSelector == nil {
			return "", fmt.Errorf("webhook %q has no namespace selector; refusing fixture mutation", webhook.Name)
		}
		selector, err := metav1.LabelSelectorAsSelector(webhook.NamespaceSelector)
		if err != nil || !selector.Matches(labels.Set(ns.Labels)) {
			return "", fmt.Errorf("webhook %q selector does not select configured test namespace %q", webhook.Name, testNamespace)
		}
		return string(*webhook.FailurePolicy), nil
	}
	return "", fmt.Errorf("validating webhook configuration does not target configured service %s/%s", namespace, serviceName)
}

func (c *Controller) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := c.config.Get("resource")
	if resource == "" {
		return nil, fmt.Errorf("resource config var is required for admission-webhook")
	}
	return []types.TestParams{{
		UID: resource, ResourceName: resource, ProviderServiceType: "kubernetes:validating-admission-webhook",
		ServiceType: "admission-webhook", CatalogTypes: []string{"CCC.K8S"},
		TagFilter: []string{"@Behavioural", "@kubernetes"}, Config: c.config,
	}}, nil
}

func (c *Controller) CheckUserProvisioned() error {
	client, err := c.kubeClient()
	if err != nil {
		return err
	}
	_, err = client.Discovery().ServerVersion()
	return err
}

func (c *Controller) ElevateAccessForInspection() error { return nil }
func (c *Controller) ResetAccess() error                { return nil }
func (c *Controller) TearDown() error                   { return nil }
func (c *Controller) UpdateResourcePolicy() error {
	return fmt.Errorf("UpdateResourcePolicy is unsupported for admission-webhook: fixture controller only permits scale changes")
}
func (c *Controller) TriggerDataWrite(string) error {
	return fmt.Errorf("TriggerDataWrite is unsupported for admission-webhook: fixture controller only permits scale changes")
}
func (c *Controller) TriggerDataRead(string) error {
	return fmt.Errorf("TriggerDataRead is unsupported for admission-webhook: fixture controller only permits scale changes")
}
func (c *Controller) GetResourceRegion(string) (string, error) {
	return "", fmt.Errorf("GetResourceRegion is unsupported for admission-webhook: use the kubernetes service")
}
func (c *Controller) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("GetReplicationStatus is unsupported for admission-webhook")
}

func selectorMatches(selector, podLabels map[string]string) bool {
	for key, value := range selector {
		if podLabels[key] != value {
			return false
		}
	}
	return len(selector) > 0
}

func int32Config(cfg types.Config, key string, fallback int32) int32 {
	value, err := strconv.ParseInt(cfg.Get(key), 10, 32)
	if err != nil || value < 1 {
		return fallback
	}
	return int32(value)
}

func durationConfig(cfg types.Config, key string, fallback time.Duration) time.Duration {
	value, err := strconv.Atoi(cfg.Get(key))
	if err != nil || value < 1 {
		return fallback
	}
	return time.Duration(value) * time.Millisecond
}

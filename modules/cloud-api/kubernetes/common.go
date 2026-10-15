package kubernetes

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/reachability"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type managedService struct {
	ctx            context.Context
	config         types.Config
	restConfig     *rest.Config
	resolveREST    func() (*rest.Config, error)
	client         kubernetes.Interface
	dynamic        dynamic.Interface
	prober         reachability.Prober
	provider       string
	endpoint       func(context.Context, string) (map[string]interface{}, error)
	region         func(context.Context, string) (string, error)
	updateMetadata func(context.Context, string, map[string]interface{}) error
	governance     func(context.Context, string) (map[string]interface{}, error)
	authConfig     func(context.Context, string) (map[string]interface{}, error)
	encryption     func(context.Context, string) (map[string]interface{}, error)
	// support, nodeIntegrity and autoscalers are optional provider hooks that
	// corroborate Kubernetes API data with CSP lifecycle/node-pool APIs.
	support       func(context.Context, string) (*supportEvidence, error)
	nodeIntegrity func(context.Context, string) ([]map[string]interface{}, error)
	autoscalers   func(context.Context, string) ([]autoscalerBound, error)
}

const (
	managedByLabel = "app.kubernetes.io/managed-by"
	managedByValue = "ccc-cloud-api"
)

func newManagedService(ctx context.Context, cfg types.Config, provider string) *managedService {
	return &managedService{
		ctx:      ctx,
		config:   cfg,
		provider: provider,
		prober:   proberFromConfig(cfg),
	}
}

func (s *managedService) ensureRESTConfig() (*rest.Config, error) {
	if s.restConfig != nil {
		return s.restConfig, nil
	}
	if s.resolveREST == nil {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: set kubernetes-cluster-name (and cloud coords) so the control plane can derive credentials")
	}
	rc, err := s.resolveREST()
	if err != nil {
		return nil, err
	}
	s.restConfig = rc
	return s.restConfig, nil
}

func (s *managedService) kubeClients() (kubernetes.Interface, dynamic.Interface, error) {
	if s.client != nil && s.dynamic != nil {
		return s.client, s.dynamic, nil
	}
	if _, err := s.ensureRESTConfig(); err != nil {
		return nil, nil, err
	}
	client, err := kubernetes.NewForConfig(s.restConfig)
	if err != nil {
		return nil, nil, fmt.Errorf("create Kubernetes client: %w", err)
	}
	dyn, err := dynamic.NewForConfig(s.restConfig)
	if err != nil {
		return nil, nil, fmt.Errorf("create Kubernetes dynamic client: %w", err)
	}
	s.client, s.dynamic = client, dyn
	return client, dyn, nil
}

func proberFromConfig(cfg types.Config) reachability.Prober {
	return reachability.ProberFromConfig(cfg)
}

func (s *managedService) clusterResourceID(explicit string) string {
	if id := strings.TrimSpace(explicit); id != "" {
		return id
	}
	return strings.TrimSpace(s.config.Get("kubernetes-cluster-name", "resource"))
}

func (s *managedService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.clusterResourceID("")
	if resource == "" {
		return nil, fmt.Errorf("kubernetes-cluster-name or resource config var is required for kubernetes; cloud-api does not provision clusters")
	}
	endpoint, err := s.GetAPIEndpointConfig(resource)
	if err != nil {
		return nil, err
	}
	host, _ := endpoint["EndpointHostname"].(string)
	return []types.TestParams{{
		UID: resource, ResourceName: resource, HostName: host, PortNumber: "443", Protocol: "https",
		ProviderServiceType: s.provider + ":managed-kubernetes", ServiceType: "kubernetes",
		CatalogTypes: []string{"CCC.K8S", "CCC.Core"}, TagFilter: []string{"@Behavioural", "@kubernetes"}, Config: s.config,
	}}, nil
}

func (s *managedService) CheckUserProvisioned() error {
	client, _, err := s.kubeClients()
	if err != nil {
		return err
	}
	if _, err := client.Discovery().ServerVersion(); err != nil {
		return fmt.Errorf("provider-authenticated Kubernetes credentials are not ready: %w", err)
	}
	return nil
}

func (s *managedService) ElevateAccessForInspection() error { return nil }
func (s *managedService) ResetAccess() error                { return nil }

// TearDown removes claims and consumer pods created by KubeClient.AttemptCreatePVC.
// It is best-effort: a cluster that is already parked or unreachable must not fail suite teardown.
func (s *managedService) TearDown() error {
	if s.client == nil {
		return nil
	}
	namespace := configOr(s.config, "test-workload-namespace", "default")
	selector := metav1.ListOptions{LabelSelector: managedByLabel + "=" + managedByValue}
	ctx := context.Background()
	_ = s.client.CoreV1().Pods(namespace).DeleteCollection(ctx, metav1.DeleteOptions{}, selector)
	_ = s.client.CoreV1().PersistentVolumeClaims(namespace).DeleteCollection(ctx, metav1.DeleteOptions{}, selector)
	return nil
}

func (s *managedService) UpdateResourcePolicy() error {
	if s.updateMetadata == nil {
		return unsupported(s.provider, "UpdateResourcePolicy", "managed-cluster metadata update API is unavailable")
	}
	return s.updateMetadata(s.ctx, s.clusterResourceID(""), map[string]interface{}{
		"ccc_compliance_test": time.Now().UTC().Format(time.RFC3339Nano),
	})
}

func (s *managedService) TriggerDataWrite(resourceID string) error {
	client, _, err := s.kubeClients()
	if err != nil {
		return err
	}
	namespace := configOr(s.config, "test-workload-namespace", "default")
	name := "ccc-data-write-probe"
	cm, err := client.CoreV1().ConfigMaps(namespace).Get(s.ctx, name, metav1.GetOptions{})
	if err != nil {
		_, err = client.CoreV1().ConfigMaps(namespace).Create(s.ctx, &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: name, Labels: map[string]string{"app.kubernetes.io/managed-by": "ccc-cloud-api"}},
			Data:       map[string]string{"resource": resourceID, "timestamp": time.Now().UTC().Format(time.RFC3339Nano)},
		}, metav1.CreateOptions{})
	} else {
		cm.Data = map[string]string{"resource": resourceID, "timestamp": time.Now().UTC().Format(time.RFC3339Nano)}
		_, err = client.CoreV1().ConfigMaps(namespace).Update(s.ctx, cm, metav1.UpdateOptions{})
	}
	if err != nil {
		return fmt.Errorf("trigger Kubernetes data write: %w", err)
	}
	return nil
}

func (s *managedService) TriggerDataRead(resourceID string) error {
	client, _, err := s.kubeClients()
	if err != nil {
		return err
	}
	if _, err := client.CoreV1().ConfigMaps(configOr(s.config, "test-workload-namespace", "default")).Get(s.ctx, "ccc-data-write-probe", metav1.GetOptions{}); err != nil {
		return fmt.Errorf("trigger Kubernetes data read for %q: %w", resourceID, err)
	}
	return nil
}

func (s *managedService) GetResourceRegion(resourceID string) (string, error) {
	if s.region == nil {
		return "", unsupported(s.provider, "GetResourceRegion", "provider cluster location API is unavailable")
	}
	return s.region(s.ctx, resourceID)
}

func (s *managedService) GetReplicationStatus(string) (*generic.ReplicationStatus, error) {
	return nil, unsupported(s.provider, "GetReplicationStatus", "managed Kubernetes cluster replication is not a portable resource property")
}

func (s *managedService) GetAPIEndpointConfig(clusterID string) (map[string]interface{}, error) {
	if s.endpoint == nil {
		return nil, unsupported(s.provider, "GetAPIEndpointConfig", "provider cluster endpoint API is unavailable")
	}
	return s.endpoint(s.ctx, clusterID)
}

func (s *managedService) AttemptAPIEndpointReachability(clusterID, networkContext string) (map[string]interface{}, error) {
	config, err := s.GetAPIEndpointConfig(clusterID)
	if err != nil {
		return nil, err
	}
	host, _ := config["EndpointHostname"].(string)
	if host == "" {
		return nil, fmt.Errorf("provider returned no API endpoint hostname for cluster %q", clusterID)
	}
	result, err := s.prober.Probe(s.ctx, reachability.Request{
		Host: host, Port: 443, Protocol: "tls", ServerName: host,
		Timeout: configDuration(s.config, "reachability-probe-timeout-ms", 5*time.Second), NetworkContext: networkContext,
	})
	if err != nil {
		return nil, err
	}
	return structMap(result)
}

// defaultSystemRolePrefixes identify Kubernetes- and CSP-owned ClusterRoles that
// legitimately carry wildcard rules. Extend with the system-role-prefixes config var.
var defaultSystemRolePrefixes = []string{
	"system:", "kube-", "eks:", "aks-", "gke-", "gce:", "azure-policy", "aws-node", "cloud-provider",
}

// isSystemRole reports whether a ClusterRole is Kubernetes/CSP-owned: it carries
// the RBAC bootstrap label or one of the system prefixes.
func isSystemRole(role rbacv1.ClusterRole, extraPrefixes []string) bool {
	if role.Labels["kubernetes.io/bootstrapping"] == "rbac-defaults" {
		return true
	}
	for _, prefix := range append(append([]string{}, defaultSystemRolePrefixes...), extraPrefixes...) {
		if prefix != "" && strings.HasPrefix(role.Name, prefix) {
			return true
		}
	}
	return false
}

func (c *KubeClient) GetRBACPolicyFindings(string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	roles, err := client.RbacV1().ClusterRoles().List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list cluster roles: %w", err)
	}
	extraPrefixes := splitConfigList(c.config.Get("system-role-prefixes"))
	wildcards := []map[string]interface{}{}
	secretAccess := []map[string]interface{}{}
	skipped := 0
	for _, role := range roles.Items {
		if isSystemRole(role, extraPrefixes) {
			skipped++
			continue
		}
		for _, rule := range role.Rules {
			if contains(rule.Verbs, "*") || contains(rule.Resources, "*") || contains(rule.APIGroups, "*") {
				wildcards = append(wildcards, map[string]interface{}{"Name": role.Name, "Rule": rule})
			}
			if (contains(rule.Resources, "secrets") || contains(rule.Resources, "*")) &&
				(contains(rule.Verbs, "list") || contains(rule.Verbs, "watch") || contains(rule.Verbs, "*")) {
				secretAccess = append(secretAccess, map[string]interface{}{"Name": role.Name, "Verbs": rule.Verbs})
			}
		}
	}
	return map[string]interface{}{"WildcardRoles": wildcards, "OverbroadSecretAccess": secretAccess, "SystemRolesExcluded": skipped}, nil
}

func (c *KubeClient) AttemptSecretAccessAsIdentity(_ string, namespace, secretName, serviceAccount, verb string) (map[string]interface{}, error) {
	if c.restConfig == nil {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: REST config is required for service-account impersonation")
	}
	if !contains([]string{"get", "list", "watch"}, strings.ToLower(verb)) {
		return nil, fmt.Errorf("unsupported secret verb %q", verb)
	}
	rc := rest.CopyConfig(c.restConfig)
	rc.Impersonate.UserName = "system:serviceaccount:" + namespace + ":" + serviceAccount
	client, err := kubernetes.NewForConfig(rc)
	if err != nil {
		return nil, err
	}
	result := map[string]interface{}{"Allowed": false, "Denied": false, "ValueMatched": false}
	var secret *corev1.Secret
	switch strings.ToLower(verb) {
	case "get":
		secret, err = client.CoreV1().Secrets(namespace).Get(c.ctx, secretName, metav1.GetOptions{})
	case "list":
		_, err = client.CoreV1().Secrets(namespace).List(c.ctx, metav1.ListOptions{})
	case "watch":
		ctx, cancel := context.WithTimeout(c.ctx, configDuration(c.config, "secret-watch-timeout-ms", 3*time.Second))
		defer cancel()
		watcher, watchErr := client.CoreV1().Secrets(namespace).Watch(ctx, metav1.ListOptions{FieldSelector: "metadata.name=" + secretName})
		if watchErr == nil {
			watcher.Stop()
		}
		err = watchErr
	}
	if err != nil {
		result["Denied"] = true
		result["Reason"] = err.Error()
		return result, fmt.Errorf("secret %s as service account %s denied or failed: %w", verb, serviceAccount, err)
	}
	result["Allowed"] = true
	if secret != nil {
		matched, source, matchErr := c.secretMatchesFixture(namespace, secretName, secret)
		result["ValueMatched"] = matched
		result["ExpectedDigestSource"] = source
		if matchErr != nil {
			result["ValueCheckError"] = matchErr.Error()
		}
	}
	return result, nil
}

// secretMatchesFixture compares a digest of the secret the impersonated service
// account read against the expected digest. Plaintext is never returned or logged.
// The expected digest is protected-secret-sha256 (hex sha256 of the protected-secret-key
// value, default key "value"); without it the runner's own credentials read the same
// secret as the reference.
func (c *KubeClient) secretMatchesFixture(namespace, secretName string, read *corev1.Secret) (bool, string, error) {
	key := configOr(c.config, "protected-secret-key", "value")
	got, ok := secretValueDigest(read, key)
	if !ok {
		return false, "", fmt.Errorf("secret %s/%s has no key %q", namespace, secretName, key)
	}
	if expected := strings.ToLower(strings.TrimSpace(c.config.Get("protected-secret-sha256"))); expected != "" {
		return subtle.ConstantTimeCompare([]byte(got), []byte(expected)) == 1, "config", nil
	}
	if c.client == nil {
		return false, "", fmt.Errorf("Kubernetes client is not initialized")
	}
	reference, err := c.client.CoreV1().Secrets(namespace).Get(c.ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return false, "admin-read", fmt.Errorf("read reference secret: %w", err)
	}
	want, ok := secretValueDigest(reference, key)
	if !ok {
		return false, "admin-read", fmt.Errorf("reference secret %s/%s has no key %q", namespace, secretName, key)
	}
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1, "admin-read", nil
}

func secretValueDigest(secret *corev1.Secret, key string) (string, bool) {
	value, ok := secret.Data[key]
	if !ok {
		if text, textOK := secret.StringData[key]; textOK {
			value, ok = []byte(text), true
		}
	}
	if !ok {
		return "", false
	}
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:]), true
}

func (c *KubeClient) GetWorkloadIdentityStatus(_ string, namespace, serviceAccount string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	sa, err := client.CoreV1().ServiceAccounts(namespace).Get(c.ctx, serviceAccount, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get service account: %w", err)
	}
	keys := []string{"eks.amazonaws.com/role-arn", "azure.workload.identity/client-id", "iam.gke.io/gcp-service-account"}
	identity := ""
	for _, key := range keys {
		if sa.Annotations[key] != "" {
			identity = sa.Annotations[key]
			break
		}
	}
	if identity == "" {
		identity = sa.Labels["azure.workload.identity/client-id"]
	}
	return map[string]interface{}{
		"Federated": identity != "", "CloudIdentityID": identity,
		"LongLivedKeysPresent": len(sa.Secrets) > 0,
	}, nil
}

var credentialPattern = regexp.MustCompile(`(?i)(AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"type"\s*:\s*"service_account"|AZURE_CLIENT_SECRET)`)

func (c *KubeClient) FindStaticCloudCredentials(_ string, namespace string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	var findings []map[string]interface{}
	secrets, err := client.CoreV1().Secrets(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list secrets: %w", err)
	}
	for _, secret := range secrets.Items {
		for key, value := range secret.Data {
			if credentialPattern.Match(value) || credentialPattern.MatchString(key) {
				findings = append(findings, map[string]interface{}{"Kind": "Secret", "Name": secret.Name, "Reason": "static cloud credential material in key " + key})
			}
		}
	}
	pods, err := client.CoreV1().Pods(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list pods: %w", err)
	}
	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			for _, env := range container.Env {
				if credentialPattern.MatchString(env.Name) || credentialPattern.MatchString(env.Value) {
					findings = append(findings, map[string]interface{}{"Kind": "Pod", "Name": pod.Name, "Reason": "static cloud credential in environment variable " + env.Name})
				}
			}
		}
	}
	return map[string]interface{}{"Findings": findings}, nil
}

func (s *managedService) AttemptAdmitWorkload(_ string, operation, manifestYAML string) (map[string]interface{}, error) {
	_, dyn, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	obj, gvr, err := decodeManifest(manifestYAML)
	if err != nil {
		return nil, err
	}
	namespace := obj.GetNamespace()
	if namespace == "" && gvr.Resource != "namespaces" {
		namespace = configOr(s.config, "test-workload-namespace", "default")
		obj.SetNamespace(namespace)
	}
	resource := dyn.Resource(gvr)
	var ri dynamic.ResourceInterface = resource
	if namespace != "" {
		ri = resource.Namespace(namespace)
	}
	result := map[string]interface{}{"Admitted": false, "Denied": false, "DeniedAt": "apiserver", "GeneratedWorkloadRunning": false}
	switch operation {
	case "create":
		_, err = ri.Create(s.ctx, obj, metav1.CreateOptions{DryRun: []string{metav1.DryRunAll}})
	case "update":
		current, getErr := ri.Get(s.ctx, obj.GetName(), metav1.GetOptions{})
		if getErr != nil {
			err = getErr
		} else {
			obj.SetResourceVersion(current.GetResourceVersion())
			_, err = ri.Update(s.ctx, obj, metav1.UpdateOptions{DryRun: []string{metav1.DryRunAll}})
		}
	case "ephemeral-update":
		if gvr.Resource != "pods" {
			return nil, fmt.Errorf("ephemeral-update requires a Pod manifest")
		}
		_, err = ri.Update(s.ctx, obj, metav1.UpdateOptions{DryRun: []string{metav1.DryRunAll}}, "ephemeralcontainers")
	default:
		return nil, fmt.Errorf("unsupported admission operation %q", operation)
	}
	if err != nil {
		result["Denied"] = true
		result["Reason"] = err.Error()
		return result, fmt.Errorf("workload admission denied or failed: %w", err)
	}
	result["Admitted"] = true
	result["DeniedAt"] = ""
	return result, nil
}

func (c *KubeClient) GetAdmissionPolicyCoverage(string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	namespaces, err := client.CoreV1().Namespaces().List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var coverage, uncovered []map[string]interface{}
	for _, ns := range namespaces.Items {
		enforce := ns.Labels["pod-security.kubernetes.io/enforce"]
		explicit := enforce != ""
		entry := map[string]interface{}{
			"Name": ns.Name, "System": strings.HasPrefix(ns.Name, "kube-"), "Explicit": explicit,
			"PolicyName": "PodSecurity", "Mode": enforce, "Exemptions": []string{},
		}
		coverage = append(coverage, entry)
		if !explicit {
			uncovered = append(uncovered, entry)
		}
	}
	return map[string]interface{}{"Namespaces": coverage, "Uncovered": uncovered}, nil
}

func (c *KubeClient) GetWorkloadRuntimeSecurity(_ string, podSelector string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	namespace := configOr(c.config, "test-workload-namespace", "default")
	pods, err := client.CoreV1().Pods(namespace).List(c.ctx, metav1.ListOptions{LabelSelector: podSelector})
	if err != nil {
		return nil, err
	}
	if len(pods.Items) != 1 {
		return nil, fmt.Errorf("pod selector %q matched %d pods; exactly one is required", podSelector, len(pods.Items))
	}
	pod := pods.Items[0]
	if len(pod.Spec.Containers) == 0 {
		return nil, fmt.Errorf("selected pod has no containers")
	}
	security := pod.Spec.Containers[0].SecurityContext
	result := map[string]interface{}{"RawEvidence": pod.Spec}
	if pod.Spec.SecurityContext != nil {
		result["UID"] = int64Value(pod.Spec.SecurityContext.RunAsUser)
		result["GID"] = int64Value(pod.Spec.SecurityContext.RunAsGroup)
		result["SeccompProfile"] = seccompName(pod.Spec.SecurityContext.SeccompProfile)
	}
	if security != nil {
		result["AllowPrivilegeEscalation"] = boolValue(security.AllowPrivilegeEscalation)
		result["CapabilitiesEmpty"] = security.Capabilities != nil && len(security.Capabilities.Add) == 0 && containsCapabilitiesAll(security.Capabilities.Drop)
		if result["SeccompProfile"] == nil {
			result["SeccompProfile"] = seccompName(security.SeccompProfile)
		}
	}
	return result, nil
}

func (c *KubeClient) GetNamespaceNetworkPolicyStatus(_ string, namespace string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	policies, err := client.NetworkingV1().NetworkPolicies(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	ingress, egress := false, false
	for _, policy := range policies.Items {
		if len(policy.Spec.PodSelector.MatchLabels) != 0 || len(policy.Spec.PodSelector.MatchExpressions) != 0 {
			continue
		}
		for _, policyType := range policy.Spec.PolicyTypes {
			if policyType == "Ingress" && len(policy.Spec.Ingress) == 0 {
				ingress = true
			}
			if policyType == "Egress" && len(policy.Spec.Egress) == 0 {
				egress = true
			}
		}
	}
	return map[string]interface{}{"DefaultDenyIngress": ingress, "DefaultDenyEgress": egress, "PolicyCapable": len(policies.Items) > 0}, nil
}

func (c *KubeClient) AttemptWorkloadNetworkFlow(_ string, fromSelector, toHost string, port int, protocol string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	image := strings.TrimSpace(c.config.Get("network-probe-image"))
	if image == "" {
		return nil, unsupported(c.provider, "AttemptWorkloadNetworkFlow", "network-probe-image config var is required")
	}
	labels, err := parseLabelSelector(fromSelector)
	if err != nil {
		return nil, err
	}
	if labels["role"] == "" {
		labels["role"] = "network-probe"
	}
	namespace := networkFlowNamespace(c.config, labels)
	targetURL, dialHost, dialPort := networkFlowTarget(toHost, port, protocol)
	timeout := configDuration(c.config, "network-probe-timeout-ms", 15*time.Second)
	deadlineSec := int64(timeout.Seconds())
	if deadlineSec < 5 {
		deadlineSec = 5
	}
	backoff := int32(0)
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			GenerateName: "ccc-netflow-",
			Namespace:    namespace,
			Labels:       labels,
		},
		Spec: batchv1.JobSpec{
			BackoffLimit:          &backoff,
			ActiveDeadlineSeconds: &deadlineSec,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					SecurityContext: &corev1.PodSecurityContext{
						RunAsNonRoot: boolPtr(true),
						RunAsUser:    int64Ptr(65534),
						SeccompProfile: &corev1.SeccompProfile{
							Type: corev1.SeccompProfileTypeRuntimeDefault,
						},
					},
					Containers: []corev1.Container{{
						Name:            "probe",
						Image:           image,
						ImagePullPolicy: corev1.PullIfNotPresent,
						Command:         []string{"/bin/sh", "-c"},
						Args:            []string{networkFlowProbeScript(targetURL, dialHost, dialPort)},
						SecurityContext: &corev1.SecurityContext{
							AllowPrivilegeEscalation: boolPtr(false),
							RunAsNonRoot:             boolPtr(true),
							RunAsUser:                int64Ptr(65534),
							Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
							SeccompProfile:           &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
						},
					}},
				},
			},
		},
	}
	created, err := client.BatchV1().Jobs(namespace).Create(c.ctx, job, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("create network flow probe job: %w", err)
	}
	defer func() {
		prop := metav1.DeletePropagationBackground
		_ = client.BatchV1().Jobs(namespace).Delete(c.ctx, created.Name, metav1.DeleteOptions{PropagationPolicy: &prop})
	}()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		current, getErr := client.BatchV1().Jobs(namespace).Get(c.ctx, created.Name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("watch network flow probe job: %w", getErr)
		}
		if current.Status.Succeeded > 0 {
			return map[string]interface{}{
				"Allowed": true, "Connected": true, "Error": "",
				"Namespace": namespace, "Job": created.Name,
				"FromSelector": fromSelector, "ToHost": toHost, "Port": port, "Protocol": protocol,
			}, nil
		}
		if current.Status.Failed > 0 {
			return map[string]interface{}{
				"Allowed": false, "Connected": false, "Error": "probe job failed",
				"Namespace": namespace, "Job": created.Name,
			}, fmt.Errorf("network flow blocked or unreachable from %q to %s:%d/%s", fromSelector, toHost, port, protocol)
		}
		select {
		case <-c.ctx.Done():
			return nil, c.ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
	return map[string]interface{}{
		"Allowed": false, "Connected": false, "Error": "probe timed out",
		"Namespace": namespace, "Job": created.Name,
	}, fmt.Errorf("network flow probe timed out from %q to %s:%d/%s", fromSelector, toHost, port, protocol)
}

func parseLabelSelector(raw string) (map[string]string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("fromSelector is required")
	}
	labels := map[string]string{}
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		key, value, ok := strings.Cut(part, "=")
		if !ok || strings.TrimSpace(key) == "" {
			return nil, fmt.Errorf("invalid label selector %q (want key=value[,key=value])", raw)
		}
		labels[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}
	if len(labels) == 0 {
		return nil, fmt.Errorf("fromSelector is required")
	}
	return labels, nil
}

func networkFlowNamespace(cfg types.Config, labels map[string]string) string {
	controlNS := configOr(cfg, "network-control-namespace", "ccc-network-control")
	testNS := configOr(cfg, "test-workload-namespace", "ccc-test")
	if labels["app"] == "ccc-network-control" {
		return controlNS
	}
	return testNS
}

func networkFlowTarget(toHost string, port int, protocol string) (targetURL, dialHost string, dialPort int) {
	toHost = strings.TrimSpace(toHost)
	dialPort = port
	if dialPort <= 0 {
		dialPort = 8080
	}
	if strings.Contains(toHost, "://") {
		if u, err := url.Parse(toHost); err == nil && u.Host != "" {
			dialHost = u.Hostname()
			if u.Port() != "" {
				if p, err := strconv.Atoi(u.Port()); err == nil {
					dialPort = p
				}
			}
			return toHost, dialHost, dialPort
		}
	}
	dialHost = toHost
	if strings.Contains(toHost, ":") && !strings.Contains(toHost, "]") {
		if host, portStr, err := net.SplitHostPort(toHost); err == nil {
			dialHost = host
			if p, err := strconv.Atoi(portStr); err == nil {
				dialPort = p
			}
		}
	}
	scheme := "http"
	if strings.EqualFold(protocol, "https") {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s:%d/", scheme, dialHost, dialPort), dialHost, dialPort
}

func networkFlowProbeScript(targetURL, dialHost string, dialPort int) string {
	// Prefer HTTP GET when a URL was provided; fall back to TCP connect via /dev/tcp.
	return fmt.Sprintf(`set -e
TARGET_URL=%q
HOST=%q
PORT=%d
if command -v wget >/dev/null 2>&1; then
  wget -q -T 5 -O /dev/null "$TARGET_URL"
elif command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 5 -o /dev/null "$TARGET_URL"
else
  timeout 5 sh -c "echo >/dev/tcp/$HOST/$PORT"
fi
`, targetURL, dialHost, dialPort)
}

func boolPtr(v bool) *bool    { return &v }
func int64Ptr(v int64) *int64 { return &v }

// AttemptCreatePVC persists the claim (admission runs for real) and waits for it
// to bind. WaitForFirstConsumer classes only bind once a pod schedules, so a
// short-lived consumer pod is created for them. Claims get a generated name and
// the managed-by label so managedService.TearDown can remove them.
func (c *KubeClient) AttemptCreatePVC(_ string, claimYAML string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	obj, _, err := decodeManifest(claimYAML)
	if err != nil {
		return nil, err
	}
	var claim corev1.PersistentVolumeClaim
	data, _ := json.Marshal(obj.Object)
	if err := json.Unmarshal(data, &claim); err != nil {
		return nil, fmt.Errorf("decode PVC: %w", err)
	}
	namespace := claim.Namespace
	if namespace == "" {
		namespace = configOr(c.config, "test-workload-namespace", "default")
	}
	claim.Namespace = namespace
	claim.GenerateName = claim.Name + "-"
	claim.Name = ""
	claim.ResourceVersion = ""
	if claim.Labels == nil {
		claim.Labels = map[string]string{}
	}
	claim.Labels[managedByLabel] = managedByValue

	result := map[string]interface{}{"Created": false, "Denied": false, "Bound": false}
	created, err := client.CoreV1().PersistentVolumeClaims(namespace).Create(c.ctx, &claim, metav1.CreateOptions{})
	if err != nil {
		result["Reason"] = err.Error()
		if apierrors.IsForbidden(err) || apierrors.IsInvalid(err) || apierrors.IsBadRequest(err) {
			result["Denied"] = true
			return result, fmt.Errorf("PVC admission denied: %w", err)
		}
		return result, fmt.Errorf("create PVC: %w", err)
	}
	result["Created"] = true
	result["ClaimName"] = created.Name
	result["Namespace"] = namespace

	timeout := configDuration(c.config, "pvc-bind-timeout-ms", 120*time.Second)
	if c.pvcNeedsConsumer(created) {
		consumer, consumerErr := c.createPVCConsumer(namespace, created.Name)
		if consumerErr != nil {
			result["Reason"] = consumerErr.Error()
			result["Phase"] = string(created.Status.Phase)
			return result, nil
		}
		defer func() {
			_ = client.CoreV1().Pods(namespace).Delete(context.Background(), consumer, metav1.DeleteOptions{GracePeriodSeconds: int64Ptr(0)})
		}()
	}

	deadline := time.Now().Add(timeout)
	for {
		current, getErr := client.CoreV1().PersistentVolumeClaims(namespace).Get(c.ctx, created.Name, metav1.GetOptions{})
		if getErr != nil {
			return result, fmt.Errorf("watch PVC %s/%s: %w", namespace, created.Name, getErr)
		}
		result["Phase"] = string(current.Status.Phase)
		if current.Status.Phase == corev1.ClaimBound {
			result["Bound"] = true
			return result, nil
		}
		if time.Now().After(deadline) {
			result["BindTimeout"] = true
			return result, nil
		}
		select {
		case <-c.ctx.Done():
			return result, c.ctx.Err()
		case <-time.After(time.Second):
		}
	}
}

// pvcNeedsConsumer reports whether the claim's StorageClass delays binding
// until a pod uses it.
func (c *KubeClient) pvcNeedsConsumer(claim *corev1.PersistentVolumeClaim) bool {
	if claim.Spec.StorageClassName == nil || *claim.Spec.StorageClassName == "" {
		return false
	}
	class, err := c.client.StorageV1().StorageClasses().Get(c.ctx, *claim.Spec.StorageClassName, metav1.GetOptions{})
	if err != nil {
		return false
	}
	return class.VolumeBindingMode != nil && *class.VolumeBindingMode == storagev1.VolumeBindingWaitForFirstConsumer
}

func (c *KubeClient) createPVCConsumer(namespace, claimName string) (string, error) {
	image := firstNonEmpty(c.config.Get("pvc-consumer-image"), c.config.Get("network-probe-image"), "busybox:1.36")
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{GenerateName: "ccc-pvc-consumer-", Namespace: namespace, Labels: map[string]string{managedByLabel: managedByValue}},
		Spec: corev1.PodSpec{
			RestartPolicy: corev1.RestartPolicyNever,
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot: boolPtr(true), RunAsUser: int64Ptr(65534), FSGroup: int64Ptr(65534),
				SeccompProfile: &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
			},
			Containers: []corev1.Container{{
				Name: "consumer", Image: image, ImagePullPolicy: corev1.PullIfNotPresent,
				Command:      []string{"/bin/sh", "-c", "sleep 30"},
				VolumeMounts: []corev1.VolumeMount{{Name: "data", MountPath: "/data"}},
				SecurityContext: &corev1.SecurityContext{
					AllowPrivilegeEscalation: boolPtr(false),
					Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
					SeccompProfile:           &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
				},
			}},
			Volumes: []corev1.Volume{{Name: "data", VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{ClaimName: claimName},
			}}},
		},
	}
	created, err := c.client.CoreV1().Pods(namespace).Create(c.ctx, pod, metav1.CreateOptions{})
	if err != nil {
		return "", fmt.Errorf("create PVC consumer pod: %w", err)
	}
	return created.Name, nil
}

func (s *managedService) AttemptModifyAdmissionConfig(clusterID string, change map[string]interface{}) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptModifyAdmissionConfig",
		fmt.Sprintf("mutating admission configuration is destructive and no narrowly-scoped fixture target was configured (cluster=%s change=%v)", clusterID, change))
}

func (c *KubeClient) ProbeNodeAdminInterfaces(_ string, nodeID string, kubeletPorts, mgmtPorts []int) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	nodes, err := client.CoreV1().Nodes().List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var evidence []map[string]interface{}
	anonymousKubelet, kubeletReachable, publicSSH, publicRDP, publicIP := false, false, false, false, false
	for _, node := range nodes.Items {
		if nodeID != "" && node.Name != nodeID {
			continue
		}
		external := nodeAddress(node, corev1.NodeExternalIP)
		internal := nodeAddress(node, corev1.NodeInternalIP)
		openMgmt := []int{}
		for _, port := range kubeletPorts {
			host := internal
			if host == "" {
				host = external
			}
			if host == "" {
				continue
			}
			probe, probeErr := (reachability.LocalProber{Observer: "runner-local"}).Probe(c.ctx, reachability.Request{Host: host, Port: port, Protocol: "tcp", Timeout: configDuration(c.config, "node-probe-timeout-ms", 5*time.Second)})
			if probeErr != nil {
				return nil, probeErr
			}
			kubeletReachable = kubeletReachable || probe.TCPConnected
			if port == 10255 && probe.TCPConnected {
				anonymousKubelet = true
			}
		}
		for _, port := range mgmtPorts {
			if external == "" {
				continue
			}
			probe, probeErr := c.prober.Probe(c.ctx, reachability.Request{Host: external, Port: port, Protocol: "tcp", Timeout: configDuration(c.config, "node-probe-timeout-ms", 5*time.Second), NetworkContext: "untrusted"})
			if probeErr != nil {
				return nil, probeErr
			}
			if probe.TCPConnected {
				openMgmt = append(openMgmt, port)
				publicSSH = publicSSH || port == 22
				publicRDP = publicRDP || port == 3389
			}
		}
		publicIP = publicIP || external != ""
		evidence = append(evidence, map[string]interface{}{"Name": node.Name, "ExternalIP": external, "OpenMgmtPorts": openMgmt})
	}
	return map[string]interface{}{
		"AnonymousKubeletOpen": anonymousKubelet, "KubeletReachable": kubeletReachable,
		"PublicSSHOpen": publicSSH, "PublicRDPOpen": publicRDP, "PublicIPPresent": publicIP, "Nodes": evidence,
	}, nil
}

func (s *managedService) AttemptInstanceMetadataAccess(clusterID, podSelector string) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptInstanceMetadataAccess",
		fmt.Sprintf("an approved in-cluster metadata probe image is required (cluster=%s selector=%s)", clusterID, podSelector))
}

func (c *KubeClient) GetResourceConsumptionBounds(_ string, namespace string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	quotas, err := client.CoreV1().ResourceQuotas(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	quotaEvidence := map[string]interface{}{}
	for _, quota := range quotas.Items {
		quotaEvidence[quota.Name] = quota.Spec.Hard
	}

	var bounds []autoscalerBound
	hpas, err := client.AutoscalingV2().HorizontalPodAutoscalers(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list HorizontalPodAutoscalers: %w", err)
	}
	for _, hpa := range hpas.Items {
		minReplicas := int64(1)
		if hpa.Spec.MinReplicas != nil {
			minReplicas = int64(*hpa.Spec.MinReplicas)
		}
		bounds = append(bounds, autoscalerBound{
			Name: "hpa/" + hpa.Name, Kind: "hpa", Min: minReplicas, Max: int64(hpa.Spec.MaxReplicas),
			Enabled: int64(hpa.Spec.MaxReplicas) > minReplicas,
		})
	}
	nodePoolErr := ""
	if c.autoscalers != nil {
		pools, poolErr := c.autoscalers(c.ctx)
		if poolErr != nil {
			nodePoolErr = poolErr.Error()
		}
		bounds = append(bounds, pools...)
	} else {
		nodePoolErr = "provider node-pool autoscaler API is unavailable"
	}

	maxByName := map[string]interface{}{}
	enabled := false
	// Unset approved caps must not report WithinApprovedMax=true for a positive max.
	within := nodePoolErr == ""
	nodeCap := configInt(c.config, "approved-autoscaler-max", 0)
	hpaCap := configInt(c.config, "approved-hpa-max-replicas", 0)
	for _, bound := range bounds {
		maxByName[bound.Name] = bound.Max
		enabled = enabled || bound.Enabled
		limit := nodeCap
		if bound.Kind == "hpa" {
			limit = hpaCap
		}
		switch {
		case bound.Max <= 0:
			within = false
		case limit <= 0:
			// Cap unset/zero: cannot claim the observed maximum is approved.
			within = false
		case bound.Max > limit:
			within = false
		}
	}
	result := map[string]interface{}{
		"Quotas": quotaEvidence, "AutoscalerMax": maxByName,
		"AutoscalingEnabled": enabled, "AutoscalerWithinApprovedMax": within,
	}
	if nodePoolErr != "" {
		result["AutoscalerEvidenceError"] = nodePoolErr
	}
	return result, nil
}

func configInt(cfg types.Config, key string, fallback int64) int64 {
	raw := strings.TrimSpace(cfg.Get(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}

func (s *managedService) GetGovernanceMetadata(clusterID string) (map[string]interface{}, error) {
	if s.governance == nil {
		return nil, unsupported(s.provider, "GetGovernanceMetadata", "provider cluster metadata API is unavailable")
	}
	return s.governance(s.ctx, clusterID)
}

func (s *managedService) AttemptModifyGovernanceMetadata(clusterID, target string, patch map[string]interface{}) (map[string]interface{}, error) {
	// Features may pass target "cluster" to mean cluster-level tags/labels.
	if target != "" && !strings.EqualFold(target, "cluster") && target != clusterID {
		return nil, fmt.Errorf("governance target %q does not match configured cluster %q", target, clusterID)
	}
	if s.updateMetadata == nil {
		return nil, unsupported(s.provider, "AttemptModifyGovernanceMetadata", "provider cluster metadata update API is unavailable")
	}
	if err := s.updateMetadata(s.ctx, clusterID, patch); err != nil {
		return map[string]interface{}{"Applied": false, "Denied": true, "Reason": err.Error()}, fmt.Errorf("modify governance metadata: %w", err)
	}
	return map[string]interface{}{"Applied": true, "Denied": false}, nil
}

func (s *managedService) GetClusterAuthConfig(clusterID string) (map[string]interface{}, error) {
	if s.authConfig == nil {
		return nil, unsupported(s.provider, "GetClusterAuthConfig", "provider authentication configuration API is unavailable")
	}
	return s.authConfig(s.ctx, clusterID)
}

func (s *managedService) AttemptClusterAuthWithStaticCredential(clusterID, mode string) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptClusterAuthWithStaticCredential",
		fmt.Sprintf("a deliberately invalid static %s credential fixture and isolated endpoint client are required for cluster %s", mode, clusterID))
}

// defaultRequiredInfrastructureRoles are present on every managed offering
// (node agent / CNI DaemonSet SA and CSI driver SA). Override with required-infrastructure-roles.
var defaultRequiredInfrastructureRoles = []string{"node", "csi"}

func (c *KubeClient) GetInfrastructureIdentities(_ string) (map[string]interface{}, error) {
	client := c.client
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not initialized")
	}
	serviceAccounts, err := client.CoreV1().ServiceAccounts("").List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	principals := []map[string]interface{}{}
	present := map[string]bool{}
	type holder struct {
		serviceAccount string
		roles          []string
	}
	byIdentity := map[string][]holder{}
	for _, sa := range serviceAccounts.Items {
		roles := infrastructureRoles(sa.Name)
		if len(roles) == 0 {
			continue
		}
		identity := firstAnnotation(sa.Annotations, "eks.amazonaws.com/role-arn", "azure.workload.identity/client-id", "iam.gke.io/gcp-service-account")
		for _, role := range roles {
			present[role] = true
			principals = append(principals, map[string]interface{}{
				"Role": role, "IdentityID": identity, "Exposed": len(sa.Secrets) > 0,
				"ServiceAccount": sa.Namespace + "/" + sa.Name,
			})
		}
		if identity != "" {
			byIdentity[identity] = append(byIdentity[identity], holder{serviceAccount: sa.Namespace + "/" + sa.Name, roles: roles})
		}
	}

	required := splitConfigList(c.config.Get("required-infrastructure-roles"))
	if len(required) == 0 {
		required = defaultRequiredInfrastructureRoles
	}
	missing := []map[string]interface{}{}
	for _, role := range required {
		if !present[role] {
			missing = append(missing, map[string]interface{}{"Role": role})
		}
	}

	// One cloud identity shared by several distinct infrastructure service accounts
	// defeats separation between their roles.
	duplicates := []map[string]interface{}{}
	identities := make([]string, 0, len(byIdentity))
	for identity := range byIdentity {
		identities = append(identities, identity)
	}
	sort.Strings(identities)
	for _, identity := range identities {
		holders := byIdentity[identity]
		if len(holders) < 2 {
			continue
		}
		accounts, roles := []string{}, map[string]bool{}
		for _, h := range holders {
			accounts = append(accounts, h.serviceAccount)
			for _, role := range h.roles {
				roles[role] = true
			}
		}
		if len(roles) < 2 {
			continue
		}
		roleList := make([]string, 0, len(roles))
		for role := range roles {
			roleList = append(roleList, role)
		}
		sort.Strings(roleList)
		duplicates = append(duplicates, map[string]interface{}{"IdentityID": identity, "ServiceAccounts": accounts, "Roles": roleList})
	}
	return map[string]interface{}{
		"Principals": principals, "MissingRequiredRoles": missing, "DuplicateIdentityAssignments": duplicates,
	}, nil
}

func (s *managedService) GetEncryptionAtRestStatus(clusterID string) (map[string]interface{}, error) {
	if s.encryption == nil {
		return nil, unsupported(s.provider, "GetEncryptionAtRestStatus", "provider encryption configuration API is unavailable")
	}
	return s.encryption(s.ctx, clusterID)
}

func decodeManifest(manifest string) (*unstructured.Unstructured, schema.GroupVersionResource, error) {
	var object map[string]interface{}
	if err := yaml.Unmarshal([]byte(manifest), &object); err != nil {
		return nil, schema.GroupVersionResource{}, fmt.Errorf("decode workload manifest: %w", err)
	}
	obj := &unstructured.Unstructured{Object: object}
	var gvr schema.GroupVersionResource
	switch obj.GetKind() {
	case "Pod":
		gvr = schema.GroupVersionResource{Version: "v1", Resource: "pods"}
	case "Namespace":
		gvr = schema.GroupVersionResource{Version: "v1", Resource: "namespaces"}
	case "PersistentVolumeClaim":
		gvr = schema.GroupVersionResource{Version: "v1", Resource: "persistentvolumeclaims"}
	case "Deployment":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	case "DaemonSet":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "daemonsets"}
	case "Job":
		gvr = schema.GroupVersionResource{Group: "batch", Version: "v1", Resource: "jobs"}
	default:
		return nil, gvr, fmt.Errorf("unsupported workload kind %q", obj.GetKind())
	}
	if obj.GetName() == "" {
		return nil, gvr, fmt.Errorf("manifest metadata.name is required")
	}
	return obj, gvr, nil
}

func unsupported(provider, method, reason string) error {
	return fmt.Errorf("%s is unsupported for %s: %s", method, provider, reason)
}

func structMap(value interface{}) (map[string]interface{}, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	return result, err
}

func configDuration(cfg types.Config, key string, fallback time.Duration) time.Duration {
	raw := cfg.Get(key)
	if raw == "" {
		return fallback
	}
	ms, err := strconv.Atoi(raw)
	if err != nil || ms <= 0 {
		return fallback
	}
	return time.Duration(ms) * time.Millisecond
}

func configOr(cfg types.Config, key, fallback string) string {
	if value := cfg.Get(key); value != "" {
		return value
	}
	return fallback
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func nodeAddress(node corev1.Node, addressType corev1.NodeAddressType) string {
	for _, address := range node.Status.Addresses {
		if address.Type == addressType {
			return address.Address
		}
	}
	return ""
}

func firstAnnotation(annotations map[string]string, keys ...string) string {
	for _, key := range keys {
		if annotations[key] != "" {
			return annotations[key]
		}
	}
	return ""
}

func infrastructureRoles(name string) []string {
	lower := strings.ToLower(name)
	var roles []string
	for _, role := range []string{"node", "cni", "csi", "autoscaler"} {
		if strings.Contains(lower, role) {
			roles = append(roles, role)
		}
	}
	return roles
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func int64Value(value *int64) interface{} {
	if value == nil {
		return nil
	}
	return *value
}

func boolValue(value *bool) interface{} {
	if value == nil {
		return nil
	}
	return *value
}

func seccompName(profile *corev1.SeccompProfile) interface{} {
	if profile == nil {
		return nil
	}
	return string(profile.Type)
}

func containsCapabilitiesAll(capabilities []corev1.Capability) bool {
	for _, capability := range capabilities {
		if capability == "ALL" {
			return true
		}
	}
	return false
}

func endpointHostname(endpoint string) string {
	parsed, err := url.Parse(endpoint)
	if err == nil && parsed.Hostname() != "" {
		return parsed.Hostname()
	}
	host, _, err := net.SplitHostPort(endpoint)
	if err == nil {
		return host
	}
	return strings.TrimSpace(endpoint)
}

package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/reachability"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type managedService struct {
	ctx            context.Context
	config         types.Config
	restConfig     *rest.Config
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
}

func newManagedService(ctx context.Context, cfg types.Config, provider string, identity *types.Identity) *managedService {
	s := &managedService{ctx: ctx, config: cfg, provider: provider}
	kubeconfig := cfg.Get("kubeconfig", "kubeconfig-path")
	if identity != nil {
		if identityKubeconfig := identity.Get("kubeconfig", "kubeconfig_path"); identityKubeconfig != "" {
			kubeconfig = identityKubeconfig
		}
	}
	if kubeconfig != "" {
		var rc *rest.Config
		var err error
		if strings.Contains(kubeconfig, "\n") {
			rc, err = clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
		} else {
			if strings.HasPrefix(kubeconfig, "~/") {
				if home, homeErr := os.UserHomeDir(); homeErr == nil {
					kubeconfig = home + strings.TrimPrefix(kubeconfig, "~")
				}
			}
			rc, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		}
		if err == nil {
			s.restConfig = rc
		}
	}
	s.prober = proberFromConfig(cfg)
	return s
}

func (s *managedService) kubeClients() (kubernetes.Interface, dynamic.Interface, error) {
	if s.client != nil && s.dynamic != nil {
		return s.client, s.dynamic, nil
	}
	if s.restConfig == nil {
		return nil, nil, fmt.Errorf("Kubernetes API prerequisite missing: configure kubeconfig or kubeconfig-path with a provider-authenticated exec credential")
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
	timeout := configDuration(cfg, "reachability-probe-timeout-ms", 5*time.Second)
	_ = timeout
	if strings.EqualFold(cfg.Get("reachability-probe-mode"), "remote") {
		return reachability.RemoteProber{
			URL:          cfg.Get("reachability-probe-url"),
			SharedSecret: []byte(cfg.Get("reachability-probe-shared-secret")),
			Observer:     cfg.Get("reachability-probe-observer"),
		}
	}
	return reachability.LocalProber{Observer: "runner-local"}
}

func (s *managedService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	resource := s.config.Get("resource")
	if resource == "" {
		return nil, fmt.Errorf("resource config var is required for kubernetes; cloud-api does not provision clusters")
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
func (s *managedService) TearDown() error                   { return nil }

func (s *managedService) UpdateResourcePolicy() error {
	if s.updateMetadata == nil {
		return unsupported(s.provider, "UpdateResourcePolicy", "managed-cluster metadata update API is unavailable")
	}
	return s.updateMetadata(s.ctx, s.config.Get("resource"), map[string]interface{}{
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

func (s *managedService) GetRBACPolicyFindings(string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	roles, err := client.RbacV1().ClusterRoles().List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list cluster roles: %w", err)
	}
	var wildcards, secretAccess []map[string]interface{}
	for _, role := range roles.Items {
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
	return map[string]interface{}{"WildcardRoles": wildcards, "OverbroadSecretAccess": secretAccess}, nil
}

func (s *managedService) AttemptSecretAccessAsIdentity(_ string, namespace, secretName, serviceAccount, verb string) (map[string]interface{}, error) {
	if s.restConfig == nil {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: kubeconfig is required for service-account impersonation")
	}
	if !contains([]string{"get", "list", "watch"}, strings.ToLower(verb)) {
		return nil, fmt.Errorf("unsupported secret verb %q", verb)
	}
	rc := rest.CopyConfig(s.restConfig)
	rc.Impersonate.UserName = "system:serviceaccount:" + namespace + ":" + serviceAccount
	client, err := kubernetes.NewForConfig(rc)
	if err != nil {
		return nil, err
	}
	result := map[string]interface{}{"Allowed": false, "Denied": false, "ValueMatched": false}
	switch strings.ToLower(verb) {
	case "get":
		_, err = client.CoreV1().Secrets(namespace).Get(s.ctx, secretName, metav1.GetOptions{})
	case "list":
		_, err = client.CoreV1().Secrets(namespace).List(s.ctx, metav1.ListOptions{})
	case "watch":
		ctx, cancel := context.WithTimeout(s.ctx, configDuration(s.config, "secret-watch-timeout-ms", 3*time.Second))
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
	return result, nil
}

func (s *managedService) GetWorkloadIdentityStatus(_ string, namespace, serviceAccount string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	sa, err := client.CoreV1().ServiceAccounts(namespace).Get(s.ctx, serviceAccount, metav1.GetOptions{})
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

func (s *managedService) AttemptCloudAPIAsWorkload(clusterID, namespace, serviceAccount, action string) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptCloudAPIAsWorkload",
		fmt.Sprintf("a configured provider-specific probe image/action is required (cluster=%s namespace=%s serviceAccount=%s action=%s)", clusterID, namespace, serviceAccount, action))
}

var credentialPattern = regexp.MustCompile(`(?i)(AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"type"\s*:\s*"service_account"|AZURE_CLIENT_SECRET)`)

func (s *managedService) FindStaticCloudCredentials(_ string, namespace string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	var findings []map[string]interface{}
	secrets, err := client.CoreV1().Secrets(namespace).List(s.ctx, metav1.ListOptions{})
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
	pods, err := client.CoreV1().Pods(namespace).List(s.ctx, metav1.ListOptions{})
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

func (s *managedService) GetAdmissionPolicyCoverage(string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	namespaces, err := client.CoreV1().Namespaces().List(s.ctx, metav1.ListOptions{})
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

func (s *managedService) GetWorkloadRuntimeSecurity(_ string, podSelector string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	namespace := configOr(s.config, "test-workload-namespace", "default")
	pods, err := client.CoreV1().Pods(namespace).List(s.ctx, metav1.ListOptions{LabelSelector: podSelector})
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

func (s *managedService) GetNamespaceNetworkPolicyStatus(_ string, namespace string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	policies, err := client.NetworkingV1().NetworkPolicies(namespace).List(s.ctx, metav1.ListOptions{})
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

func (s *managedService) AttemptWorkloadNetworkFlow(clusterID, fromSelector, toHost string, port int, protocol string) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptWorkloadNetworkFlow",
		fmt.Sprintf("an approved in-cluster network probe image is required (cluster=%s source=%s target=%s:%d/%s)", clusterID, fromSelector, toHost, port, protocol))
}

func (s *managedService) GetClusterComponentInventory(string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	version, err := client.Discovery().ServerVersion()
	if err != nil {
		return nil, err
	}
	nodes, err := client.CoreV1().Nodes().List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	workers := make([]map[string]interface{}, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		workers = append(workers, map[string]interface{}{"Name": node.Name, "Version": node.Status.NodeInfo.KubeletVersion, "Image": node.Status.NodeInfo.OSImage})
	}
	return map[string]interface{}{"ControlPlaneVersion": version.GitVersion, "Workers": workers, "Addons": []map[string]interface{}{}}, nil
}

func (s *managedService) AttemptCreatePVC(_ string, claimYAML string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
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
		namespace = configOr(s.config, "test-workload-namespace", "default")
	}
	result := map[string]interface{}{"Created": false, "Denied": false, "Bound": false}
	created, err := client.CoreV1().PersistentVolumeClaims(namespace).Create(s.ctx, &claim, metav1.CreateOptions{DryRun: []string{metav1.DryRunAll}})
	if err != nil {
		result["Denied"] = true
		result["Reason"] = err.Error()
		return result, fmt.Errorf("PVC admission denied or failed: %w", err)
	}
	result["Created"] = true
	result["Bound"] = created.Status.Phase == corev1.ClaimBound
	return result, nil
}

func (s *managedService) AttemptModifyAdmissionConfig(clusterID string, change map[string]interface{}) (map[string]interface{}, error) {
	return nil, unsupported(s.provider, "AttemptModifyAdmissionConfig",
		fmt.Sprintf("mutating admission configuration is destructive and no narrowly-scoped fixture target was configured (cluster=%s change=%v)", clusterID, change))
}

func (s *managedService) ProbeNodeAdminInterfaces(_ string, nodeID string, kubeletPorts, mgmtPorts []int) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	nodes, err := client.CoreV1().Nodes().List(s.ctx, metav1.ListOptions{})
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
			probe, probeErr := (reachability.LocalProber{Observer: "runner-local"}).Probe(s.ctx, reachability.Request{Host: host, Port: port, Protocol: "tcp", Timeout: configDuration(s.config, "node-probe-timeout-ms", 5*time.Second)})
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
			probe, probeErr := s.prober.Probe(s.ctx, reachability.Request{Host: external, Port: port, Protocol: "tcp", Timeout: configDuration(s.config, "node-probe-timeout-ms", 5*time.Second), NetworkContext: "untrusted"})
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

func (s *managedService) GetResourceConsumptionBounds(_ string, namespace string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	quotas, err := client.CoreV1().ResourceQuotas(namespace).List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	quotaEvidence := map[string]interface{}{}
	for _, quota := range quotas.Items {
		quotaEvidence[quota.Name] = quota.Spec.Hard
	}
	return map[string]interface{}{"Quotas": quotaEvidence, "AutoscalerMax": map[string]interface{}{}, "AutoscalingEnabled": false}, nil
}

func (s *managedService) GetGovernanceMetadata(clusterID string) (map[string]interface{}, error) {
	if s.governance == nil {
		return nil, unsupported(s.provider, "GetGovernanceMetadata", "provider cluster metadata API is unavailable")
	}
	return s.governance(s.ctx, clusterID)
}

func (s *managedService) AttemptModifyGovernanceMetadata(clusterID, target string, patch map[string]interface{}) (map[string]interface{}, error) {
	if target != "" && target != clusterID {
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

func (s *managedService) GetInfrastructureIdentities(_ string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	serviceAccounts, err := client.CoreV1().ServiceAccounts("").List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var principals []map[string]interface{}
	for _, sa := range serviceAccounts.Items {
		role := infrastructureRole(sa.Name)
		if role == "" {
			continue
		}
		identity := firstAnnotation(sa.Annotations, "eks.amazonaws.com/role-arn", "azure.workload.identity/client-id", "iam.gke.io/gcp-service-account")
		principals = append(principals, map[string]interface{}{"Role": role, "IdentityID": identity, "Exposed": len(sa.Secrets) > 0})
	}
	return map[string]interface{}{"Principals": principals}, nil
}

func (s *managedService) GetNodeIntegrityStatus(_ string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	nodes, err := client.CoreV1().Nodes().List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var evidence []map[string]interface{}
	for _, node := range nodes.Items {
		evidence = append(evidence, map[string]interface{}{
			"Name": node.Name, "ImageID": node.Status.NodeInfo.OSImage, "ImageSource": "unknown",
			"ImageSupported": false, "BootIntegrityEnabled": false,
			"Reason": "Kubernetes Node status does not expose image publisher support or measured-boot state; provider corroboration is required",
		})
	}
	return map[string]interface{}{"Nodes": evidence}, nil
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

func infrastructureRole(name string) string {
	lower := strings.ToLower(name)
	for _, role := range []string{"node", "cni", "csi", "autoscaler"} {
		if strings.Contains(lower, role) {
			return role
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

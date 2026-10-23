package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
)

func TestNetworkFlowTargetDefaultsBareHostToHealth(t *testing.T) {
	target, host, port := networkFlowTarget("ccc-allowed.ccc-network-control.svc", 8080, "tcp")
	if target != "http://ccc-allowed.ccc-network-control.svc:8080/health" {
		t.Fatalf("target = %q", target)
	}
	if host != "ccc-allowed.ccc-network-control.svc" {
		t.Fatalf("host = %q", host)
	}
	if port != 8080 {
		t.Fatalf("port = %d", port)
	}
}

func TestNetworkFlowTargetKeepsFullURL(t *testing.T) {
	target, host, port := networkFlowTarget("https://listener.example:8443/ready", 8080, "tcp")
	if target != "https://listener.example:8443/ready" {
		t.Fatalf("target = %q", target)
	}
	if host != "listener.example" {
		t.Fatalf("host = %q", host)
	}
	if port != 8443 {
		t.Fatalf("port = %d", port)
	}
}

func TestNetworkFlowTargetHostPortUsesHealth(t *testing.T) {
	target, host, port := networkFlowTarget("10.0.0.8:9090", 8080, "https")
	if target != "https://10.0.0.8:9090/health" {
		t.Fatalf("target = %q", target)
	}
	if host != "10.0.0.8" {
		t.Fatalf("host = %q", host)
	}
	if port != 9090 {
		t.Fatalf("port = %d", port)
	}
}

func TestIsReachabilityPolicyDenied(t *testing.T) {
	if !isReachabilityPolicyDenied(fmt.Errorf("remote reachability probe returned HTTP 403: target is not allowed")) {
		t.Fatal("expected 403 allowlist error to be policy-denied")
	}
	if isReachabilityPolicyDenied(fmt.Errorf("remote reachability probe failed: connection refused")) {
		t.Fatal("did not expect a transport error to be policy-denied")
	}
	if isReachabilityPolicyDenied(nil) {
		t.Fatal("nil is not policy-denied")
	}
}

func TestIsCommandInvokeREST(t *testing.T) {
	if !isCommandInvokeREST(&rest.Config{Host: "https://aks-command-invoke.local"}) {
		t.Fatal("expected command-invoke host")
	}
	if isCommandInvokeREST(&rest.Config{Host: "https://aks.privatelink.eastus.azmk8s.io"}) {
		t.Fatal("did not expect a real AKS API host")
	}
	if isCommandInvokeREST(nil) {
		t.Fatal("nil is not command-invoke")
	}
}

func TestTokenRequestUnsupported(t *testing.T) {
	if !tokenRequestUnsupported(apierrors.NewBadRequest("the server rejected our request (post serviceaccounts ccc-wi-sa)")) {
		t.Fatal("expected 400 TokenRequest to be unsupported")
	}
	if !tokenRequestUnsupported(fmt.Errorf("the server does not allow this method on the requested resource")) {
		t.Fatal("expected method-not-supported message")
	}
	if tokenRequestUnsupported(fmt.Errorf(`serviceaccounts "ccc-wi-sa" is forbidden: User cannot create resource "token"`)) {
		t.Fatal("Forbidden on CreateToken must not fall back to impersonation")
	}
	if tokenRequestUnsupported(nil) {
		t.Fatal("nil is not unsupported")
	}
}

func TestIsWebhookUnavailable(t *testing.T) {
	if !isWebhookUnavailable(fmt.Errorf(`failed calling webhook "ccc-admission-webhook-probe": failed to call webhook: no endpoints available for service "ccc-admission-webhook-probe"`)) {
		t.Fatal("expected webhook fail-closed")
	}
	if isWebhookUnavailable(fmt.Errorf(`ValidatingAdmissionPolicy 'ccc-deny-static-creds' with binding 'ccc-deny-static-creds' denied request: static cloud credentials`)) {
		t.Fatal("VAP deny is a policy decision, not webhook-unavailable")
	}
	if isWebhookUnavailable(fmt.Errorf(`pods "ccc-static-creds" is forbidden: violates PodSecurity`)) {
		t.Fatal("PSA Forbidden is authz, not webhook-unavailable")
	}
	if isWebhookUnavailable(nil) {
		t.Fatal("nil is not webhook-unavailable")
	}
}

func TestClusterUsableErrorReadyUnschedulable(t *testing.T) {
	client := fake.NewSimpleClientset(readyNode("n1", true))
	err := clusterUsableError(context.Background(), client)
	if err == nil || !strings.Contains(err.Error(), "no Ready schedulable node") {
		t.Fatalf("Ready+unschedulable must not pass: %v", err)
	}
}

func TestClusterUsableErrorReadySchedulable(t *testing.T) {
	client := fake.NewSimpleClientset(readyNode("n1", false))
	if err := clusterUsableError(context.Background(), client); err != nil {
		t.Fatalf("Ready+schedulable must pass: %v", err)
	}
}

func TestClusterUsableErrorSkipsMissingOptionalAddons(t *testing.T) {
	client := fake.NewSimpleClientset(readyNode("n1", false))
	if err := clusterUsableError(context.Background(), client); err != nil {
		t.Fatalf("missing optional addons must skip: %v", err)
	}
}

func TestClusterUsableErrorWaitsForPresentAddon(t *testing.T) {
	client := fake.NewSimpleClientset(
		readyNode("n1", false),
		deployment("kube-system", "ebs-csi-controller", 0),
	)
	err := clusterUsableError(context.Background(), client)
	if err == nil || !strings.Contains(err.Error(), "ebs-csi-controller") {
		t.Fatalf("present not-Ready addon must fail: %v", err)
	}
}

func TestClusterUsableErrorAcceptsReadyAddons(t *testing.T) {
	client := fake.NewSimpleClientset(
		readyNode("n1", false),
		deployment("kube-system", "coredns", 1),
		deployment("kube-system", "ebs-csi-controller", 1),
		deployment("gatekeeper-system", "gatekeeper-controller", 1),
	)
	if err := clusterUsableError(context.Background(), client); err != nil {
		t.Fatalf("Ready addons must pass: %v", err)
	}
}

func TestClusterUsableErrorWaitsForPolicyAddon(t *testing.T) {
	client := fake.NewSimpleClientset(
		readyNode("n1", false),
		deployment("kube-system", "azure-policy", 0),
	)
	err := clusterUsableError(context.Background(), client)
	if err == nil || !strings.Contains(err.Error(), "azure-policy") {
		t.Fatalf("present not-Ready policy addon must fail: %v", err)
	}
}

func TestWaitForClusterUsableImmediate(t *testing.T) {
	client := fake.NewSimpleClientset(readyNode("n1", false))
	if err := waitForClusterUsable(context.Background(), client, time.Second); err != nil {
		t.Fatal(err)
	}
}

func TestWaitForClusterUsableTimesOut(t *testing.T) {
	client := fake.NewSimpleClientset(readyNode("n1", true))
	err := waitForClusterUsable(context.Background(), client, -time.Second)
	if err == nil || !strings.Contains(err.Error(), "timed out") {
		t.Fatalf("expected timeout, got %v", err)
	}
}

func readyNode(name string, unschedulable bool) *corev1.Node {
	return &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Spec:       corev1.NodeSpec{Unschedulable: unschedulable},
		Status: corev1.NodeStatus{
			Conditions: []corev1.NodeCondition{{
				Type:   corev1.NodeReady,
				Status: corev1.ConditionTrue,
			}},
		},
	}
}

func deployment(namespace, name string, readyReplicas int32) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Status:     appsv1.DeploymentStatus{ReadyReplicas: readyReplicas},
	}
}

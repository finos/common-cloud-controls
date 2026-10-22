package kubernetes

import (
	"fmt"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
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

package config

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestKubectlAdmissionDeniedStatusPreservesVAPMessage(t *testing.T) {
	logs := `The pods "ccc-static-creds" is invalid: : ValidatingAdmissionPolicy 'ccc-deny-static-cloud-credentials' with binding 'ccc-deny-static-cloud-credentials' denied request: static cloud credentials must not be embedded in workloads`
	raw, ok := kubectlAdmissionDeniedStatus(logs)
	if !ok {
		t.Fatal("expected admission deny status")
	}
	var status map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &status); err != nil {
		t.Fatal(err)
	}
	msg, _ := status["message"].(string)
	if !strings.Contains(msg, "static cloud credentials") {
		t.Fatalf("status message lost VAP reason: %q", msg)
	}
}

func TestKubectlExitStatusValidListIsOK(t *testing.T) {
	logs := `{"kind":"ClusterRoleList","apiVersion":"rbac.authorization.k8s.io/v1","items":[{"metadata":{"name":"review-forbidden-verbs"}}]}`
	if got := kubectlExitStatus(http.MethodGet, 1, logs); got != http.StatusOK {
		t.Fatalf("valid ClusterRoleList should be HTTP 200, got %d", got)
	}
}

func TestKubectlForbiddenStatusIgnoresSuccessfulListJSON(t *testing.T) {
	logs := `{
  "apiVersion": "v1",
  "items": [
    {"kind": "ClusterRole", "metadata": {"name": "ccc-review-forbidden-verbs"}}
  ]
}`
	if _, ok := kubectlForbiddenStatus(logs); ok {
		t.Fatal("successful ClusterRole list JSON must not be treated as Forbidden")
	}
}

func TestKubectlAdmissionDeniedStatusIgnoresForbidden(t *testing.T) {
	if _, ok := kubectlAdmissionDeniedStatus(`Error from server (Forbidden): pods is forbidden`); ok {
		t.Fatal("Forbidden must stay on the authz path")
	}
}

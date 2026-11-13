package config

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"k8s.io/client-go/rest"
)

const commandInvokeHost = "https://aks-command-invoke.local"

// AzureCommandInvoke builds a REST config that sends Kubernetes API calls
// through ARM `managedClusters/runCommand` (az aks command invoke). Hosted
// runners use this when the AKS API FQDN is private. The other AKS
// constructor is AzureDirect.
func AzureCommandInvoke(ctx context.Context, arm *azcore.Client, cred azcore.TokenCredential, runCommandURL string) (*rest.Config, error) {
	if arm == nil {
		return nil, fmt.Errorf("Azure ARM client is required for AKS command invoke")
	}
	if strings.TrimSpace(runCommandURL) == "" {
		return nil, fmt.Errorf("AKS runCommand URL is required")
	}
	return &rest.Config{
		Host: commandInvokeHost,
		// command-invoke only returns JSON from kubectl -o json; protobuf
		// negotiation makes client-go report "unknown (get ...)".
		ContentConfig: rest.ContentConfig{
			AcceptContentTypes: "application/json",
			ContentType:        "application/json",
		},
		Transport: &aksCommandInvokeTransport{
			ctx:  ctx,
			arm:  arm,
			cred: cred,
			url:  runCommandURL,
		},
	}, nil
}

type aksCommandInvokeTransport struct {
	ctx  context.Context
	arm  *azcore.Client
	cred azcore.TokenCredential
	url  string
}

func (t *aksCommandInvokeTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req == nil {
		return nil, fmt.Errorf("command invoke: empty request")
	}
	body, err := readRequestBody(req)
	if err != nil {
		return nil, err
	}
	command, contextB64, err := kubectlCommandFor(req, body)
	if err != nil {
		return nil, err
	}
	logs, exitCode, err := t.runCommand(req.Context(), command, contextB64)
	if err != nil {
		return nil, err
	}
	if statusJSON, forbidden := kubectlForbiddenStatus(logs); forbidden {
		return &http.Response{
			StatusCode: http.StatusForbidden,
			Status:     http.StatusText(http.StatusForbidden),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(statusJSON)),
			Request:    req,
		}, nil
	}
	if statusJSON, denied := kubectlAdmissionDeniedStatus(logs); denied {
		return &http.Response{
			StatusCode: http.StatusUnprocessableEntity,
			Status:     http.StatusText(http.StatusUnprocessableEntity),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(statusJSON)),
			Request:    req,
		}, nil
	}
	bodyOut := extractKubectlJSON(logs)
	if (req.Method == http.MethodGet || req.Method == "") && !json.Valid([]byte(bodyOut)) {
		preview := strings.TrimSpace(logs)
		if len(preview) > 500 {
			preview = preview[:500]
		}
		if preview == "" {
			preview = "(empty logs)"
		}
		return nil, fmt.Errorf("AKS runCommand kubectl returned non-JSON (exit %d): %s", exitCode, preview)
	}
	status := kubectlExitStatus(req.Method, exitCode, logs)
	return &http.Response{
		StatusCode: status,
		Status:     http.StatusText(status),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(bodyOut)),
		Request:    req,
	}, nil
}

func readRequestBody(req *http.Request) ([]byte, error) {
	if req.Body == nil {
		return nil, nil
	}
	defer req.Body.Close()
	return io.ReadAll(io.LimitReader(req.Body, 1<<20))
}

func kubectlCommandFor(req *http.Request, body []byte) (command, contextB64 string, err error) {
	as := impersonationFlags(req)
	resource, ok := translateAPIPath(req.URL.Path)
	watch := strings.Contains(req.URL.RawQuery, "watch=")
	dryRun := strings.Contains(req.URL.RawQuery, "dryRun")
	uri := req.URL.RequestURI()
	if uri == "" {
		uri = req.URL.Path
	}
	quoted := shellSingleQuote(uri)
	switch req.Method {
	case http.MethodGet, "":
		if watch || !ok {
			return "kubectl" + as + " get --raw " + quoted, "", nil
		}
		// Collection GETs use --raw so the API returns compact JSON.
		// `kubectl get -o json` pretty-print is ~2x larger and gets truncated
		// by AKS runCommand logs, which then fails client-go list decode.
		if !strings.Contains(resource, " ") {
			return "kubectl" + as + " get --raw " + quoted, "", nil
		}
		return "kubectl" + as + " get " + resource + " -o json --show-managed-fields=false", "", nil
	case http.MethodDelete:
		if ok {
			return "kubectl" + as + " delete " + resource + " --ignore-not-found -o json", "", nil
		}
		return "kubectl" + as + " delete --raw " + quoted, "", nil
	case http.MethodPost, http.MethodPut, http.MethodPatch:
		file := "ccc-req.json"
		switch {
		case req.Method == http.MethodPatch:
			command = "kubectl" + as + " patch --raw " + quoted + " --type " + shellSingleQuote(req.Header.Get("Content-Type")) + " -p \"$(cat " + file + ")\""
		case req.Method == http.MethodPut:
			command = "kubectl" + as + " replace -o json -f " + file
		case dryRun:
			command = "kubectl" + as + " create --dry-run=server -o json -f " + file
		default:
			command = "kubectl" + as + " create -o json -f " + file
		}
		contextB64, err = zipBase64(file, body)
		return command, contextB64, err
	default:
		return "", "", fmt.Errorf("command invoke: unsupported method %s", req.Method)
	}
}

func impersonationFlags(req *http.Request) string {
	if req == nil {
		return ""
	}
	user := strings.TrimSpace(req.Header.Get("Impersonate-User"))
	if user == "" {
		return ""
	}
	return " --as=" + shellSingleQuote(user)
}

// translateAPIPath maps a Kubernetes REST path to a kubectl get/delete resource
// expression such as "secrets ccc-protected-secret -n ccc-test".
func translateAPIPath(path string) (string, bool) {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" || trimmed == "version" || trimmed == "api" || trimmed == "apis" {
		return "", false
	}
	parts := strings.Split(trimmed, "/")
	switch {
	case len(parts) >= 2 && parts[0] == "api" && parts[1] == "v1":
		return kubectlResourceFromSegments(parts[2:]), true
	case len(parts) >= 3 && parts[0] == "apis":
		return kubectlResourceFromSegments(parts[3:]), true
	default:
		return "", false
	}
}

func kubectlResourceFromSegments(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	if parts[0] == "namespaces" {
		switch len(parts) {
		case 1:
			return "namespaces"
		case 2:
			return "namespaces " + parts[1]
		case 3:
			return parts[2] + " -n " + parts[1]
		default:
			return parts[2] + " " + parts[3] + " -n " + parts[1]
		}
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return parts[0] + " " + parts[1]
}

func extractKubectlJSON(logs string) string {
	trimmed := strings.TrimSpace(logs)
	start := strings.IndexAny(trimmed, "{[")
	if start < 0 {
		return trimmed
	}
	candidate := strings.TrimSpace(trimmed[start:])
	if json.Valid([]byte(candidate)) {
		return candidate
	}
	decoder := json.NewDecoder(strings.NewReader(candidate))
	var value json.RawMessage
	if err := decoder.Decode(&value); err == nil && json.Valid(value) {
		return strings.TrimSpace(string(value))
	}
	return candidate
}

func kubectlAdmissionDeniedStatus(logs string) (string, bool) {
	lower := strings.ToLower(logs)
	if strings.Contains(lower, "forbidden") || strings.Contains(lower, "unauthorized") {
		return "", false
	}
	if !strings.Contains(lower, "denied request") &&
		!strings.Contains(lower, "validatingadmissionpolicy") &&
		!strings.Contains(lower, "admission webhook") &&
		!strings.Contains(lower, "forbidden by") {
		return "", false
	}
	message := strings.TrimSpace(logs)
	if len(message) > 800 {
		message = message[:800]
	}
	payload, err := json.Marshal(map[string]interface{}{
		"kind":       "Status",
		"apiVersion": "v1",
		"status":     "Failure",
		"message":    message,
		"reason":     "Invalid",
		"code":       http.StatusUnprocessableEntity,
	})
	if err != nil {
		return "", true
	}
	return string(payload), true
}

func kubectlForbiddenStatus(logs string) (string, bool) {
	lower := strings.ToLower(logs)
	// Require the kubectl error prefix. A successful `kubectl get -o json`
	// can contain the words "forbidden"/"unauthorized" inside object data.
	if !strings.Contains(lower, "error from server") {
		return "", false
	}
	if !strings.Contains(lower, "forbidden") && !strings.Contains(lower, "unauthorized") {
		return "", false
	}
	message := strings.TrimSpace(logs)
	if i := strings.LastIndex(message, "Error from server"); i >= 0 {
		message = strings.TrimSpace(message[i:])
	}
	if len(message) > 800 {
		message = message[:800]
	}
	payload, err := json.Marshal(map[string]interface{}{
		"kind":       "Status",
		"apiVersion": "v1",
		"status":     "Failure",
		"message":    message,
		"reason":     "Forbidden",
		"code":       http.StatusForbidden,
	})
	if err != nil {
		return "", true
	}
	return string(payload), true
}

func zipBase64(name string, body []byte) (string, error) {
	if body == nil {
		body = []byte("{}")
	}
	var buf bytes.Buffer
	archive := zip.NewWriter(&buf)
	writer, err := archive.Create(name)
	if err != nil {
		return "", err
	}
	if _, err := writer.Write(body); err != nil {
		return "", err
	}
	if err := archive.Close(); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

func shellSingleQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", `'"'"'`) + "'"
}

func kubectlExitStatus(method string, exitCode int, logs string) int {
	if exitCode == 0 {
		return http.StatusOK
	}
	// A successful list/get body can still produce a non-zero kubectl exit
	// (truncated ARM logs, discovery warnings). Do not treat valid API
	// objects as Forbidden just because the JSON contains those words.
	if body := extractKubectlJSON(logs); isK8sAPIObject(body) && !strings.Contains(strings.ToLower(logs), "error from server") {
		return http.StatusOK
	}
	lower := strings.ToLower(logs)
	switch {
	case strings.Contains(lower, "not found"):
		return http.StatusNotFound
	case strings.Contains(lower, "already exists"):
		return http.StatusConflict
	case strings.Contains(lower, "error from server") && (strings.Contains(lower, "forbidden") || strings.Contains(lower, "unauthorized")):
		return http.StatusForbidden
	case strings.Contains(lower, "denied"), strings.Contains(lower, "invalid"), strings.Contains(lower, "admission"):
		return http.StatusUnprocessableEntity
	case method == http.MethodGet:
		return http.StatusNotFound
	default:
		return http.StatusUnprocessableEntity
	}
}

func isK8sAPIObject(body string) bool {
	var obj map[string]interface{}
	if json.Unmarshal([]byte(body), &obj) != nil {
		return false
	}
	_, hasKind := obj["kind"]
	_, hasItems := obj["items"]
	return hasKind || hasItems
}

type runCommandRequest struct {
	Command      string `json:"command"`
	Context      string `json:"context,omitempty"`
	ClusterToken string `json:"clusterToken,omitempty"`
}

type runCommandResult struct {
	Properties struct {
		ProvisioningState string `json:"provisioningState"`
		ExitCode          int    `json:"exitCode"`
		Logs              string `json:"logs"`
	} `json:"properties"`
}

func (t *aksCommandInvokeTransport) runCommand(ctx context.Context, command, contextB64 string) (string, int, error) {
	if ctx == nil {
		ctx = t.ctx
	}
	if ctx == nil {
		ctx = context.Background()
	}
	token := ""
	if t.cred != nil {
		aad, err := t.cred.GetToken(ctx, policy.TokenRequestOptions{
			Scopes: []string{aksAADServerAppID + "/.default"},
		})
		if err != nil {
			return "", 0, fmt.Errorf("AKS runCommand cluster token: %w", err)
		}
		token = aad.Token
	}
	payload, err := json.Marshal(runCommandRequest{Command: command, Context: contextB64, ClusterToken: token})
	if err != nil {
		return "", 0, err
	}
	request, err := runtime.NewRequest(ctx, http.MethodPost, t.url)
	if err != nil {
		return "", 0, err
	}
	if err := request.SetBody(streaming.NopCloser(bytes.NewReader(payload)), "application/json"); err != nil {
		return "", 0, err
	}
	response, err := t.arm.Pipeline().Do(request)
	if err != nil {
		return "", 0, fmt.Errorf("AKS runCommand: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 200 && response.StatusCode < 300 && response.StatusCode != http.StatusAccepted {
		var result runCommandResult
		if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
			return "", 0, fmt.Errorf("decode AKS runCommand: %w", err)
		}
		return result.Properties.Logs, result.Properties.ExitCode, nil
	}
	pollURL := firstNonEmptyHeader(response.Header, "Azure-AsyncOperation", "Location")
	if pollURL == "" {
		raw, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return "", 0, fmt.Errorf("AKS runCommand returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(raw)))
	}
	return t.pollCommand(ctx, pollURL)
}

func (t *aksCommandInvokeTransport) pollCommand(ctx context.Context, pollURL string) (string, int, error) {
	deadline := time.Now().Add(3 * time.Minute)
	for {
		if err := ctx.Err(); err != nil {
			return "", 0, err
		}
		request, err := runtime.NewRequest(ctx, http.MethodGet, pollURL)
		if err != nil {
			return "", 0, err
		}
		response, err := t.arm.Pipeline().Do(request)
		if err != nil {
			return "", 0, fmt.Errorf("poll AKS runCommand: %w", err)
		}
		body, _ := io.ReadAll(io.LimitReader(response.Body, 1<<20))
		response.Body.Close()
		var result runCommandResult
		_ = json.Unmarshal(body, &result)
		state := strings.ToLower(result.Properties.ProvisioningState)
		if state == "succeeded" || response.StatusCode == http.StatusOK && result.Properties.Logs != "" {
			return result.Properties.Logs, result.Properties.ExitCode, nil
		}
		if state == "failed" || state == "canceled" {
			return result.Properties.Logs, result.Properties.ExitCode, fmt.Errorf("AKS runCommand %s: %s", state, strings.TrimSpace(result.Properties.Logs))
		}
		if time.Now().After(deadline) {
			return "", 0, fmt.Errorf("AKS runCommand timed out polling %s", pollURL)
		}
		select {
		case <-ctx.Done():
			return "", 0, ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
}

func firstNonEmptyHeader(header http.Header, names ...string) string {
	for _, name := range names {
		if value := strings.TrimSpace(header.Get(name)); value != "" {
			return value
		}
	}
	return ""
}

package config

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// AKS Entra ID server application ID (fixed across tenants).
const aksAADServerAppID = "6dae42f8-4368-4678-94ff-3960e28e3630"

// Azure builds a REST config for an AKS API server. listUserCredentialURL is the
// full ARM POST URL for listClusterUserCredential (host/CA only); auth uses cred
// against the AKS AAD audience (no kubelogin).
func Azure(ctx context.Context, arm *azcore.Client, cred azcore.TokenCredential, listUserCredentialURL string) (*rest.Config, error) {
	host, caData, err := aksAPIServerTrust(ctx, arm, listUserCredentialURL)
	if err != nil {
		return nil, err
	}
	return FromHostCA(host, caData, func(rt http.RoundTripper) http.RoundTripper {
		return &aksBearerTransport{base: rt, cred: cred}
	})
}

type aksBearerTransport struct {
	base http.RoundTripper
	cred azcore.TokenCredential
}

func (t *aksBearerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	token, err := t.cred.GetToken(req.Context(), policy.TokenRequestOptions{
		Scopes: []string{aksAADServerAppID + "/.default"},
	})
	if err != nil {
		return nil, fmt.Errorf("get AKS AAD token: %w", err)
	}
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+token.Token)
	base := t.base
	if base == nil {
		base = http.DefaultTransport
	}
	return base.RoundTrip(req)
}

type aksCredentialResults struct {
	Kubeconfigs []struct {
		Name  string `json:"name"`
		Value string `json:"value"`
	} `json:"kubeconfigs"`
}

func aksAPIServerTrust(ctx context.Context, arm *azcore.Client, credURL string) (string, []byte, error) {
	request, err := runtime.NewRequest(ctx, http.MethodPost, credURL)
	if err != nil {
		return "", nil, err
	}
	// Empty JSON body is required for this ARM action; format is a query param when needed.
	if err := request.SetBody(streaming.NopCloser(bytes.NewReader([]byte("{}"))), "application/json"); err != nil {
		return "", nil, err
	}
	response, err := arm.Pipeline().Do(request)
	if err != nil {
		return "", nil, fmt.Errorf("list AKS user credentials: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		raw, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return "", nil, fmt.Errorf("list AKS user credentials returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(raw)))
	}
	var results aksCredentialResults
	if err := json.NewDecoder(response.Body).Decode(&results); err != nil {
		return "", nil, fmt.Errorf("decode AKS user credentials: %w", err)
	}
	if len(results.Kubeconfigs) == 0 || results.Kubeconfigs[0].Value == "" {
		return "", nil, fmt.Errorf("AKS listClusterUserCredential returned no kubeconfig")
	}
	raw, err := base64.StdEncoding.DecodeString(results.Kubeconfigs[0].Value)
	if err != nil {
		return "", nil, fmt.Errorf("decode AKS kubeconfig payload: %w", err)
	}
	kc, err := clientcmd.Load(raw)
	if err != nil {
		return "", nil, fmt.Errorf("parse AKS kubeconfig: %w", err)
	}
	var clusterName string
	if kc.CurrentContext != "" {
		if ctxEntry, ok := kc.Contexts[kc.CurrentContext]; ok && ctxEntry != nil {
			clusterName = ctxEntry.Cluster
		}
	}
	if clusterName == "" {
		for name := range kc.Clusters {
			clusterName = name
			break
		}
	}
	cluster := kc.Clusters[clusterName]
	if cluster == nil {
		return "", nil, fmt.Errorf("AKS kubeconfig has no cluster entry")
	}
	host := strings.TrimSpace(cluster.Server)
	if host == "" {
		return "", nil, fmt.Errorf("AKS kubeconfig cluster server is empty")
	}
	if _, err := url.Parse(host); err != nil {
		return "", nil, fmt.Errorf("AKS kubeconfig server URL: %w", err)
	}
	ca := cluster.CertificateAuthorityData
	if len(ca) == 0 {
		return "", nil, fmt.Errorf("AKS kubeconfig missing certificate-authority-data")
	}
	return host, ca, nil
}

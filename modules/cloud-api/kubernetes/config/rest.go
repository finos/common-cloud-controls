package config

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"k8s.io/client-go/rest"
)

// FromHostCA builds a client-go REST config for the given API server host and CA.
// wrap, if non-nil, supplies per-request auth (bearer token refresh, etc.).
func FromHostCA(host string, caData []byte, wrap func(http.RoundTripper) http.RoundTripper) (*rest.Config, error) {
	host = strings.TrimSpace(host)
	if host == "" {
		return nil, fmt.Errorf("kubernetes API host is empty")
	}
	if !strings.HasPrefix(host, "https://") && !strings.HasPrefix(host, "http://") {
		host = "https://" + host
	}
	if len(caData) == 0 {
		return nil, fmt.Errorf("kubernetes API certificate authority data is empty")
	}
	rc := &rest.Config{
		Host: host,
		TLSClientConfig: rest.TLSClientConfig{
			CAData: caData,
		},
	}
	if wrap != nil {
		rc.Wrap(wrap)
	}
	return rc, nil
}

// DecodeCAData decodes standard base64 CA material from a CSP describe/get response.
func DecodeCAData(b64 string) ([]byte, error) {
	b64 = strings.TrimSpace(b64)
	if b64 == "" {
		return nil, fmt.Errorf("empty certificate authority data")
	}
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, fmt.Errorf("decode certificate authority data: %w", err)
	}
	return raw, nil
}

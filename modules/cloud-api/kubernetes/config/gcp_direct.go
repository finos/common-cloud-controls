package config

import (
	"fmt"
	"net/http"
	"strings"

	"golang.org/x/oauth2"
	"k8s.io/client-go/rest"
)

// GCPDirect builds a REST config that talks HTTPS to the GKE API FQDN using
// the given oauth2 token source.
func GCPDirect(endpoint, caDataB64 string, ts oauth2.TokenSource) (*rest.Config, error) {
	if strings.TrimSpace(endpoint) == "" {
		return nil, fmt.Errorf("GKE cluster endpoint is empty")
	}
	if ts == nil {
		return nil, fmt.Errorf("GKE token source is not configured")
	}
	caData, err := DecodeCAData(caDataB64)
	if err != nil {
		return nil, err
	}
	return FromHostCA(endpoint, caData, func(rt http.RoundTripper) http.RoundTripper {
		return &oauth2.Transport{Base: rt, Source: ts}
	})
}

package config

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"k8s.io/client-go/rest"
)

const eksTokenPrefix = "k8s-aws-v1."
const eksClusterIDHeader = "x-k8s-aws-id"

// AWS builds a REST config for an EKS API server using ambient AWS credentials
// (STS-presigned GetCallerIdentity token, aws-iam-authenticator compatible).
func AWS(ctx context.Context, awsCfg aws.Config, endpoint, caDataB64, clusterName string) (*rest.Config, error) {
	caData, err := DecodeCAData(caDataB64)
	if err != nil {
		return nil, err
	}
	return FromHostCA(endpoint, caData, func(rt http.RoundTripper) http.RoundTripper {
		return &eksBearerTransport{base: rt, awsCfg: awsCfg, clusterName: clusterName}
	})
}

type eksBearerTransport struct {
	base        http.RoundTripper
	awsCfg      aws.Config
	clusterName string
}

func (t *eksBearerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	token, err := eksAuthToken(req.Context(), t.awsCfg, t.clusterName)
	if err != nil {
		return nil, err
	}
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+token)
	base := t.base
	if base == nil {
		base = http.DefaultTransport
	}
	return base.RoundTrip(req)
}

func eksAuthToken(ctx context.Context, cfg aws.Config, clusterName string) (string, error) {
	// aws-sdk-go-v2's default PresignGetCallerIdentity omits X-Amz-Expires in the
	// form EKS expects; without it the API server returns Unauthorized. Inject the
	// cluster header and a 60s expiry via a custom HTTPPresignerV4 (same approach as
	// aws eks get-token / aws-sdk-go-v2#1922).
	presigner := sts.NewPresignClient(sts.NewFromConfig(cfg))
	out, err := presigner.PresignGetCallerIdentity(ctx, &sts.GetCallerIdentityInput{}, func(opt *sts.PresignOptions) {
		opt.Presigner = &eksHTTPPresignerV4{
			client: opt.Presigner,
			headers: map[string]string{
				eksClusterIDHeader: clusterName,
				"X-Amz-Expires":    "60",
			},
		}
	})
	if err != nil {
		return "", fmt.Errorf("presign STS GetCallerIdentity for EKS: %w", err)
	}
	if strings.TrimSpace(out.URL) == "" {
		return "", fmt.Errorf("presigned EKS URL is empty")
	}
	return eksTokenPrefix + base64.RawURLEncoding.EncodeToString([]byte(out.URL)), nil
}

// eksHTTPPresignerV4 wraps the STS HTTPPresignerV4 to add EKS-required headers
// before SigV4 signing (so they appear in the signed query string).
type eksHTTPPresignerV4 struct {
	client  sts.HTTPPresignerV4
	headers map[string]string
}

func (p *eksHTTPPresignerV4) PresignHTTP(
	ctx context.Context, credentials aws.Credentials, r *http.Request,
	payloadHash string, service string, region string, signingTime time.Time,
	optFns ...func(*v4.SignerOptions),
) (string, http.Header, error) {
	for key, val := range p.headers {
		r.Header.Set(key, val)
	}
	// Older SDK middlewares inject amz-sdk-request into signed headers, which
	// breaks EKS token validation. Harmless to clear on current SDKs.
	r.Header.Del("amz-sdk-request")
	return p.client.PresignHTTP(ctx, credentials, r, payloadHash, service, region, signingTime, optFns...)
}

package config

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"
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
	presigner := sts.NewPresignClient(sts.NewFromConfig(cfg))
	out, err := presigner.PresignGetCallerIdentity(ctx, &sts.GetCallerIdentityInput{}, func(opt *sts.PresignOptions) {
		opt.ClientOptions = append(opt.ClientOptions, func(o *sts.Options) {
			o.APIOptions = append(o.APIOptions, func(stack *middleware.Stack) error {
				return stack.Finalize.Add(middleware.FinalizeMiddlewareFunc(
					"eks-cluster-id-header",
					func(ctx context.Context, in middleware.FinalizeInput, next middleware.FinalizeHandler) (
						middleware.FinalizeOutput, middleware.Metadata, error,
					) {
						req, ok := in.Request.(*smithyhttp.Request)
						if ok && req != nil {
							req.Header.Set(eksClusterIDHeader, clusterName)
						}
						return next.HandleFinalize(ctx, in)
					},
				), middleware.Before)
			})
		})
	})
	if err != nil {
		return "", fmt.Errorf("presign STS GetCallerIdentity for EKS: %w", err)
	}
	if strings.TrimSpace(out.URL) == "" {
		return "", fmt.Errorf("presigned EKS URL is empty")
	}
	return eksTokenPrefix + base64.RawURLEncoding.EncodeToString([]byte(out.URL)), nil
}

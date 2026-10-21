package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	ekstypes "github.com/aws/aws-sdk-go-v2/service/eks/types"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/config"
	"github.com/finos/common-cloud-controls/cloud-api/kubernetes/lifecycle"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"k8s.io/client-go/rest"
)

var _ ControlPlane = (*AWSService)(nil)

type AWSService struct {
	*managedService
	eks    *eks.Client
	awsCfg aws.Config
}

func NewAWSService(ctx context.Context, cfg types.Config) (*AWSService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("load AWS configuration for EKS: %w", err)
	}
	return newAWSService(ctx, cfg, awsCfg, nil), nil
}

func NewAWSServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AWSService, error) {
	accessKey := identity.Get("access_key_id")
	secretKey := identity.Get("secret_access_key")
	if accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("missing AWS keys for identity %q", identity.UserName)
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.CloudParams().Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, identity.Get("session_token"))),
	)
	if err != nil {
		return nil, fmt.Errorf("load AWS configuration for EKS identity %q: %w", identity.UserName, err)
	}
	return newAWSService(ctx, cfg, awsCfg, &identity), nil
}

func newAWSService(ctx context.Context, cfg types.Config, awsCfg aws.Config, identity *types.Identity) *AWSService {
	service := &AWSService{
		managedService: newManagedService(ctx, cfg, "aws"),
		eks:            eks.NewFromConfig(awsCfg),
		awsCfg:         awsCfg,
	}
	service.resolveREST = service.buildRESTConfig
	service.endpoint = service.endpointConfig
	service.region = service.clusterRegion
	service.updateMetadata = service.updateTags
	service.governance = service.governanceMetadata
	service.authConfig = service.clusterAuth
	service.encryption = service.encryptionStatus
	service.support = service.supportEvidence
	service.nodeIntegrity = service.nodeIntegrityEvidence
	service.autoscalers = service.nodegroupBounds
	return service
}

func (s *AWSService) describe(ctx context.Context, clusterID string) (*eks.DescribeClusterOutput, error) {
	name := strings.TrimSpace(clusterID)
	if name == "" {
		name = s.config.Get("kubernetes-cluster-name", "resource")
	}
	if name == "" {
		return nil, fmt.Errorf("EKS clusterID or kubernetes-cluster-name/resource config var is required")
	}
	output, err := s.eks.DescribeCluster(ctx, &eks.DescribeClusterInput{Name: aws.String(name)})
	if err != nil {
		return nil, fmt.Errorf("describe EKS cluster %q: %w", name, err)
	}
	if output.Cluster == nil {
		return nil, fmt.Errorf("EKS DescribeCluster returned no cluster for %q", name)
	}
	return output, nil
}

func (s *AWSService) endpointConfig(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	vpc := output.Cluster.ResourcesVpcConfig
	if vpc == nil {
		return nil, fmt.Errorf("EKS cluster %q has no resourcesVpcConfig", clusterID)
	}
	return map[string]interface{}{
		"PublicAccess": vpc.EndpointPublicAccess, "PrivateAccess": vpc.EndpointPrivateAccess,
		"AllowedCIDRs": vpc.PublicAccessCidrs, "EndpointHostname": endpointHostname(aws.ToString(output.Cluster.Endpoint)),
	}, nil
}

func (s *AWSService) clusterRegion(ctx context.Context, clusterID string) (string, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return "", err
	}
	arn := aws.ToString(output.Cluster.Arn)
	parts := strings.Split(arn, ":")
	if len(parts) > 3 && parts[3] != "" {
		return parts[3], nil
	}
	if s.config.CloudParams().Region != "" {
		return s.config.CloudParams().Region, nil
	}
	return "", fmt.Errorf("EKS cluster ARN did not contain a region")
}

func (s *AWSService) updateTags(ctx context.Context, clusterID string, patch map[string]interface{}) error {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return err
	}
	tags := make(map[string]string, len(patch))
	for key, value := range patch {
		tags[key] = fmt.Sprintf("%v", value)
	}
	if len(tags) == 0 {
		return fmt.Errorf("at least one EKS tag is required")
	}
	_, err = s.eks.TagResource(ctx, &eks.TagResourceInput{ResourceArn: output.Cluster.Arn, Tags: tags})
	if err != nil {
		return fmt.Errorf("tag EKS cluster: %w", err)
	}
	return nil
}

func (s *AWSService) governanceMetadata(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	required := splitConfigList(s.config.Get("required-metadata-keys"))
	var missing []string
	for _, key := range required {
		if strings.TrimSpace(output.Cluster.Tags[key]) == "" {
			missing = append(missing, key)
		}
	}
	return map[string]interface{}{"Tags": output.Cluster.Tags, "Labels": map[string]string{}, "MissingRequired": missing}, nil
}

func (s *AWSService) clusterAuth(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	mode := ""
	if output.Cluster.AccessConfig != nil {
		mode = string(output.Cluster.AccessConfig.AuthenticationMode)
	}
	return map[string]interface{}{
		"ManagedIdP": mode != "", "LegacyAuthEnabled": mode == "CONFIG_MAP",
		"LocalAccountsEnabled": false, "StaticClientCertsForHumans": false, "AuthenticationMode": mode,
	}, nil
}

func (s *AWSService) encryptionStatus(ctx context.Context, clusterID string) (map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	key := ""
	encrypted := false
	for _, config := range output.Cluster.EncryptionConfig {
		if contains(config.Resources, "secrets") {
			encrypted = true
			if config.Provider != nil {
				key = aws.ToString(config.Provider.KeyArn)
			}
		}
	}
	return map[string]interface{}{"SecretsEncrypted": encrypted, "KMSKeyID": key, "Provider": "aws-kms"}, nil
}

func (s *AWSService) awsLifecycle() *lifecycle.AWS {
	return &lifecycle.AWS{Ctx: s.ctx, EKS: s.eks}
}

func (s *AWSService) Start(resourceID string) error {
	return s.awsLifecycle().Start(s.lifecycleClusterID(resourceID))
}

func (s *AWSService) Stop(resourceID string) error {
	return s.awsLifecycle().Stop(s.lifecycleClusterID(resourceID))
}

func (s *AWSService) StartedDetails() ([]generic.StartedResource, error) {
	return s.awsLifecycle().StartedDetails()
}

func (s *AWSService) lifecycleClusterID(resourceID string) string {
	if id := strings.TrimSpace(resourceID); id != "" {
		return id
	}
	return strings.TrimSpace(s.config.Get("kubernetes-cluster-name", "resource"))
}

func (s *AWSService) buildRESTConfig() (*rest.Config, error) {
	output, err := s.describe(s.ctx, "")
	if err != nil {
		return nil, err
	}
	cluster := output.Cluster
	if cluster.Endpoint == nil || cluster.CertificateAuthority == nil || cluster.CertificateAuthority.Data == nil {
		return nil, fmt.Errorf("EKS cluster is missing endpoint or certificate authority data")
	}
	return config.AWS(s.ctx, s.awsCfg, aws.ToString(cluster.Endpoint), aws.ToString(cluster.CertificateAuthority.Data), aws.ToString(cluster.Name))
}

func splitConfigList(value string) []string {
	value = strings.Trim(value, "[]")
	if strings.TrimSpace(value) == "" {
		return nil
	}
	fields := strings.FieldsFunc(value, func(r rune) bool { return r == ',' || r == ' ' })
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		if trimmed := strings.Trim(strings.TrimSpace(field), `"'`); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

// supportedMinors lists Kubernetes minors in EKS standard or extended support.
func (s *AWSService) supportedMinors(ctx context.Context) (map[string]bool, error) {
	minors := map[string]bool{}
	var token *string
	for {
		out, err := s.eks.DescribeClusterVersions(ctx, &eks.DescribeClusterVersionsInput{IncludeAll: aws.Bool(true), NextToken: token})
		if err != nil {
			return nil, fmt.Errorf("describe EKS cluster versions: %w", err)
		}
		for _, version := range out.ClusterVersions {
			standard := version.VersionStatus == ekstypes.VersionStatusStandardSupport || version.Status == ekstypes.ClusterVersionStatusStandardSupport
			extended := version.VersionStatus == ekstypes.VersionStatusExtendedSupport || version.Status == ekstypes.ClusterVersionStatusExtendedSupport
			if standard || extended {
				minors[kubeMinor(aws.ToString(version.ClusterVersion))] = true
			}
		}
		if out.NextToken == nil {
			return minors, nil
		}
		token = out.NextToken
	}
}

func (s *AWSService) nodegroups(ctx context.Context, clusterName string) ([]ekstypes.Nodegroup, error) {
	var groups []ekstypes.Nodegroup
	var token *string
	for {
		list, err := s.eks.ListNodegroups(ctx, &eks.ListNodegroupsInput{ClusterName: aws.String(clusterName), NextToken: token})
		if err != nil {
			return nil, fmt.Errorf("list EKS node groups: %w", err)
		}
		for _, name := range list.Nodegroups {
			described, err := s.eks.DescribeNodegroup(ctx, &eks.DescribeNodegroupInput{ClusterName: aws.String(clusterName), NodegroupName: aws.String(name)})
			if err != nil {
				return nil, fmt.Errorf("describe EKS node group %q: %w", name, err)
			}
			if described.Nodegroup != nil {
				groups = append(groups, *described.Nodegroup)
			}
		}
		if list.NextToken == nil {
			return groups, nil
		}
		token = list.NextToken
	}
}

// amiSupported is false for end-of-life (AL2) and unverifiable (CUSTOM) AMI families.
func amiSupported(amiType string) bool {
	return amiType != "" && !strings.HasPrefix(amiType, "AL2_") && amiType != "CUSTOM"
}

func (s *AWSService) supportEvidence(ctx context.Context, clusterID string) (*supportEvidence, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	cluster := output.Cluster
	evidence := &supportEvidence{Source: "eks:DescribeClusterVersions,DescribeNodegroup,DescribeAddonVersions"}
	var errs []error

	if minors, err := s.supportedMinors(ctx); err != nil {
		errs = append(errs, err)
	} else {
		evidence.SupportedMinors = minors
	}

	if groups, err := s.nodegroups(ctx, aws.ToString(cluster.Name)); err != nil {
		errs = append(errs, err)
	} else if len(groups) == 0 {
		evidence.NodeImageReason = "cluster has no managed node groups; node image support cannot be verified from EKS APIs"
	} else {
		ok, reasons := true, []string{}
		for _, group := range groups {
			if !amiSupported(string(group.AmiType)) {
				ok = false
				reasons = append(reasons, fmt.Sprintf("node group %s uses unsupported or unverifiable AMI type %s", aws.ToString(group.NodegroupName), group.AmiType))
			}
		}
		evidence.NodeImageInSupport = boolRef(ok)
		evidence.NodeImageReason = strings.Join(reasons, "; ")
	}

	minor := kubeMinor(aws.ToString(cluster.Version))
	addons, err := s.eks.ListAddons(ctx, &eks.ListAddonsInput{ClusterName: cluster.Name})
	if err != nil {
		errs = append(errs, fmt.Errorf("list EKS add-ons: %w", err))
	} else {
		for _, name := range addons.Addons {
			addon, addonErr := s.addonEvidence(ctx, cluster.Name, name, minor)
			if addonErr != nil {
				errs = append(errs, addonErr)
				continue
			}
			evidence.Addons = append(evidence.Addons, addon)
		}
	}
	return evidence, errors.Join(errs...)
}

// addonEvidence checks the installed add-on version against the versions the
// publisher advertises as compatible with the cluster's Kubernetes minor.
func (s *AWSService) addonEvidence(ctx context.Context, clusterName *string, name, minor string) (addonEvidence, error) {
	described, err := s.eks.DescribeAddon(ctx, &eks.DescribeAddonInput{ClusterName: clusterName, AddonName: aws.String(name)})
	if err != nil {
		return addonEvidence{}, fmt.Errorf("describe EKS add-on %q: %w", name, err)
	}
	installed := described.Addon
	entry := addonEvidence{Name: name, Version: aws.ToString(installed.AddonVersion), Publisher: aws.ToString(installed.Publisher), Status: string(installed.Status)}
	versions, err := s.eks.DescribeAddonVersions(ctx, &eks.DescribeAddonVersionsInput{AddonName: aws.String(name), KubernetesVersion: aws.String(minor)})
	if err != nil {
		return addonEvidence{}, fmt.Errorf("describe EKS add-on versions for %q: %w", name, err)
	}
	for _, info := range versions.Addons {
		if aws.ToString(info.AddonName) != name {
			continue
		}
		entry.InSupport = len(info.AddonVersions) > 0
		for _, version := range info.AddonVersions {
			if aws.ToString(version.AddonVersion) == entry.Version {
				entry.Compatible = true
			}
		}
	}
	switch {
	case !entry.InSupport:
		entry.Reason = fmt.Sprintf("publisher advertises no versions of %s for Kubernetes %s", name, minor)
	case !entry.Compatible:
		entry.Reason = fmt.Sprintf("installed version %s is not advertised as compatible with Kubernetes %s", entry.Version, minor)
	}
	return entry, nil
}

// nodeIntegrityEvidence reports per-node-group image support and boot integrity.
// Bottlerocket enforces dm-verity verified boot; other EKS AMI families expose no
// measured-boot signal through EKS, so they report disabled.
func (s *AWSService) nodeIntegrityEvidence(ctx context.Context, clusterID string) ([]map[string]interface{}, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	groups, err := s.nodegroups(ctx, aws.ToString(output.Cluster.Name))
	if err != nil {
		return nil, err
	}
	minors, minorsErr := s.supportedMinors(ctx)
	nodes := []map[string]interface{}{}
	for _, group := range groups {
		ami := string(group.AmiType)
		source := "csp"
		if ami == "CUSTOM" || ami == "" {
			source = "custom"
		}
		supported := amiSupported(ami)
		reason := ""
		if minorsErr == nil && !minors[kubeMinor(aws.ToString(group.Version))] {
			supported = false
			reason = "node group Kubernetes version is outside EKS support"
		}
		bootIntegrity := strings.HasPrefix(ami, "BOTTLEROCKET_")
		if !bootIntegrity {
			reason = strings.TrimSpace(reason + " EKS exposes no verified/measured boot signal for AMI type " + ami)
		}
		nodes = append(nodes, map[string]interface{}{
			"Name": aws.ToString(group.NodegroupName), "ImageID": ami + "/" + aws.ToString(group.ReleaseVersion),
			"ImageSource": source, "ImageSupported": supported, "BootIntegrityEnabled": bootIntegrity, "Reason": reason,
		})
	}
	return nodes, nil
}

// nodegroupBounds exposes managed node group scaling limits.
func (s *AWSService) nodegroupBounds(ctx context.Context, clusterID string) ([]autoscalerBound, error) {
	output, err := s.describe(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	groups, err := s.nodegroups(ctx, aws.ToString(output.Cluster.Name))
	if err != nil {
		return nil, err
	}
	var bounds []autoscalerBound
	for _, group := range groups {
		if group.ScalingConfig == nil {
			continue
		}
		minSize, maxSize := int64(aws.ToInt32(group.ScalingConfig.MinSize)), int64(aws.ToInt32(group.ScalingConfig.MaxSize))
		bounds = append(bounds, autoscalerBound{
			Name: "nodegroup/" + aws.ToString(group.NodegroupName), Kind: "nodepool", Min: minSize, Max: maxSize, Enabled: maxSize > minSize,
		})
	}
	return bounds, nil
}

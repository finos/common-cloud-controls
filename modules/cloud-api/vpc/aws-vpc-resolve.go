package vpc

import (
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

// resolveVpcID returns an EC2 VPC ID, resolving tag:Name when a human-readable name is passed.
func (s *AWSVPCService) resolveVpcID(vpcIDOrName string) (string, error) {
	id := strings.TrimSpace(vpcIDOrName)
	if id == "" {
		return "", fmt.Errorf("vpcID is required")
	}
	if strings.HasPrefix(id, "vpc-") {
		return id, nil
	}
	if configured := strings.TrimSpace(s.config.Get("receiver-vpc-id")); strings.HasPrefix(configured, "vpc-") {
		resourceName := strings.TrimSpace(s.config.Get("resource"))
		// Alias only the configured receiver name — never rewrite requester IDs/names.
		if resourceName != "" && id == resourceName {
			return configured, nil
		}
	}
	out, err := s.client.DescribeVpcs(s.ctx, &ec2.DescribeVpcsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("tag:Name"),
				Values: []string{id},
			},
			{
				Name:   aws.String("tag:CFIControlSet"),
				Values: []string{"CCC.VPC"},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to resolve VPC name %q: %w", id, err)
	}
	if len(out.Vpcs) == 0 {
		return "", fmt.Errorf("no VPC found with Name tag %q and CFIControlSet=CCC.VPC", id)
	}
	if len(out.Vpcs) > 1 {
		return "", fmt.Errorf("multiple VPCs found with Name tag %q and CFIControlSet=CCC.VPC", id)
	}
	return aws.ToString(out.Vpcs[0].VpcId), nil
}

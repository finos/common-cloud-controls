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
	out, err := s.client.DescribeVpcs(s.ctx, &ec2.DescribeVpcsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("tag:Name"),
				Values: []string{id},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to resolve VPC name %q: %w", id, err)
	}
	if len(out.Vpcs) == 0 {
		return "", fmt.Errorf("no VPC found with Name tag %q", id)
	}
	if len(out.Vpcs) > 1 {
		return "", fmt.Errorf("multiple VPCs found with Name tag %q", id)
	}
	return aws.ToString(out.Vpcs[0].VpcId), nil
}

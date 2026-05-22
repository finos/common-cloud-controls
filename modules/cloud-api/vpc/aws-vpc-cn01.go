package vpc

import (
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func (s *AWSVPCService) CountDefaultVpcs() (int, error) {
	vpcs, err := s.describeDefaultVpcs()
	if err != nil {
		return 0, err
	}
	return len(vpcs), nil
}

func (s *AWSVPCService) IsDefaultVpc(vpcID string) (bool, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return false, fmt.Errorf("vpcID is required")
	}

	out, err := s.client.DescribeVpcs(s.ctx, &ec2.DescribeVpcsInput{
		VpcIds: []string{vpcIDStr},
	})
	if err != nil {
		return false, fmt.Errorf("failed to describe vpc %s: %w", vpcIDStr, err)
	}
	if len(out.Vpcs) == 0 {
		return false, fmt.Errorf("vpc %s not found", vpcIDStr)
	}

	return aws.ToBool(out.Vpcs[0].IsDefault), nil
}

func (s *AWSVPCService) EvaluateDefaultVpcControl(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := fmt.Sprintf("%v", vpcID)
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	isDefault, err := s.IsDefaultVpc(vpcIDStr)
	if err != nil {
		return nil, err
	}

	verdict := "PASS"
	resultClass := "PASS"
	compliant := true
	reason := "in-scope VPC is not default"
	if isDefault {
		verdict = "FAIL"
		resultClass = "FAIL"
		compliant = false
		reason = "in-scope VPC is default"
	}

	return map[string]interface{}{
		"Verdict":      verdict,
		"ResultClass":  resultClass,
		"Compliant":    compliant,
		"Reason":       reason,
		"VpcId":        vpcIDStr,
		"IsDefaultVpc": isDefault,
	}, nil
}

func (s *AWSVPCService) ListDefaultVpcs() ([]DefaultVPC, error) {
	vpcs, err := s.describeDefaultVpcs()
	if err != nil {
		return nil, err
	}

	out := make([]DefaultVPC, 0, len(vpcs))
	for _, vpc := range vpcs {
		out = append(out, DefaultVPC{
			VpcID:  aws.ToString(vpc.VpcId),
			Region: s.instance.Properties.Region,
		})
	}
	return out, nil
}

func (s *AWSVPCService) describeDefaultVpcs() ([]types.Vpc, error) {
	input := &ec2.DescribeVpcsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("is-default"),
				Values: []string{"true"},
			},
		},
	}

	resp, err := s.client.DescribeVpcs(s.ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe default VPCs: %w", err)
	}
	return resp.Vpcs, nil
}

package virtualmachines

import (
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func (s *AWSVirtualMachinesService) resolveInstanceID(instanceIDOrName string) (string, error) {
	id := strings.TrimSpace(instanceIDOrName)
	if id == "" {
		return "", fmt.Errorf("instance ID is required")
	}
	if strings.HasPrefix(id, "i-") {
		return id, nil
	}
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("tag:Name"),
				Values: []string{id},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to resolve instance name %q: %w", id, err)
	}
	for _, res := range out.Reservations {
		for _, inst := range res.Instances {
			if state := inst.State; state != nil && state.Name == types.InstanceStateNameTerminated {
				continue
			}
			if iid := aws.ToString(inst.InstanceId); iid != "" {
				return iid, nil
			}
		}
	}
	return "", fmt.Errorf("no running instance found with Name tag %q", id)
}

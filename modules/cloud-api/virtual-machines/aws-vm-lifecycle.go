package virtualmachines

import (
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	ec2types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

func (s *AWSVirtualMachinesService) Start(resourceID string) error {
	instanceID, err := s.resolveInstanceID(lifecycleResourceID(resourceID, s.config.Get("resource")))
	if err != nil {
		return err
	}
	state, err := s.instanceState(instanceID)
	if err != nil {
		return err
	}
	switch state {
	case ec2types.InstanceStateNameRunning:
		return nil
	case ec2types.InstanceStateNamePending:
		return s.waitInstanceState(instanceID, ec2types.InstanceStateNameRunning, 10*time.Minute)
	case ec2types.InstanceStateNameStopping:
		if err := s.waitInstanceState(instanceID, ec2types.InstanceStateNameStopped, 10*time.Minute); err != nil {
			return err
		}
	case ec2types.InstanceStateNameStopped:
		// continue to start
	default:
		return fmt.Errorf("cannot start EC2 instance %q in state %q", instanceID, state)
	}
	if _, err := s.client.StartInstances(s.ctx, &ec2.StartInstancesInput{
		InstanceIds: []string{instanceID},
	}); err != nil {
		return fmt.Errorf("start EC2 instance %q: %w", instanceID, err)
	}
	return s.waitInstanceState(instanceID, ec2types.InstanceStateNameRunning, 10*time.Minute)
}

func (s *AWSVirtualMachinesService) Stop(resourceID string) error {
	instanceID, err := s.resolveInstanceID(lifecycleResourceID(resourceID, s.config.Get("resource")))
	if err != nil {
		return err
	}
	state, err := s.instanceState(instanceID)
	if err != nil {
		return err
	}
	switch state {
	case ec2types.InstanceStateNameStopped:
		return nil
	case ec2types.InstanceStateNameStopping:
		return s.waitInstanceState(instanceID, ec2types.InstanceStateNameStopped, 10*time.Minute)
	case ec2types.InstanceStateNamePending, ec2types.InstanceStateNameRunning:
		// continue to stop
	default:
		return fmt.Errorf("cannot stop EC2 instance %q in state %q", instanceID, state)
	}
	if _, err := s.client.StopInstances(s.ctx, &ec2.StopInstancesInput{
		InstanceIds: []string{instanceID},
	}); err != nil {
		return fmt.Errorf("stop EC2 instance %q: %w", instanceID, err)
	}
	return s.waitInstanceState(instanceID, ec2types.InstanceStateNameStopped, 10*time.Minute)
}

func (s *AWSVirtualMachinesService) instanceState(instanceID string) (ec2types.InstanceStateName, error) {
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		InstanceIds: []string{instanceID},
	})
	if err != nil {
		return "", fmt.Errorf("describe EC2 instance %q: %w", instanceID, err)
	}
	for _, res := range out.Reservations {
		for _, inst := range res.Instances {
			if inst.State != nil {
				return inst.State.Name, nil
			}
		}
	}
	return "", fmt.Errorf("EC2 instance %q not found", instanceID)
}

func (s *AWSVirtualMachinesService) waitInstanceState(instanceID string, want ec2types.InstanceStateName, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		state, err := s.instanceState(instanceID)
		if err != nil {
			return err
		}
		if state == want {
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for EC2 instance %q to become %q", instanceID, want)
}

func lifecycleResourceID(explicit, fallback string) string {
	if id := strings.TrimSpace(explicit); id != "" {
		return id
	}
	return strings.TrimSpace(fallback)
}

func (s *AWSVirtualMachinesService) StartedDetails() ([]generic.StartedResource, error) {
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		Filters: []ec2types.Filter{
			{Name: aws.String("tag:CFIControlSet"), Values: []string{"CCC.VM"}},
			{Name: aws.String("instance-state-name"), Values: []string{"running", "pending"}},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("list started CCC.VM instances: %w", err)
	}
	var started []generic.StartedResource
	for _, res := range out.Reservations {
		for _, inst := range res.Instances {
			id := aws.ToString(inst.InstanceId)
			name := tagValue(inst.Tags, "Name")
			if name == "" {
				name = id
			}
			state := ""
			if inst.State != nil {
				state = string(inst.State.Name)
			}
			started = append(started, generic.StartedResource{
				ResourceID: name,
				Name:       name,
				State:      state,
				Detail:     id,
			})
		}
	}
	return started, nil
}

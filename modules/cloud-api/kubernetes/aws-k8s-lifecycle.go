package kubernetes

import (
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	ekstypes "github.com/aws/aws-sdk-go-v2/service/eks/types"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

func (s *AWSService) Start(resourceID string) error {
	cluster := s.lifecycleClusterID(resourceID)
	groups, err := s.listNodeGroups(cluster)
	if err != nil {
		return err
	}
	for _, group := range groups {
		if err := s.scaleNodeGroup(cluster, group, 1, 1, 2); err != nil {
			return err
		}
	}
	return s.waitNodeGroupsDesired(cluster, groups, 1, 20*time.Minute)
}

func (s *AWSService) Stop(resourceID string) error {
	cluster := s.lifecycleClusterID(resourceID)
	groups, err := s.listNodeGroups(cluster)
	if err != nil {
		return err
	}
	for _, group := range groups {
		if err := s.scaleNodeGroup(cluster, group, 0, 0, 2); err != nil {
			return err
		}
	}
	return s.waitNodeGroupsDesired(cluster, groups, 0, 20*time.Minute)
}

func (s *AWSService) lifecycleClusterID(resourceID string) string {
	if id := strings.TrimSpace(resourceID); id != "" {
		return id
	}
	if id := strings.TrimSpace(s.config.Get("cluster-name", "resource")); id != "" {
		return id
	}
	return ""
}

func (s *AWSService) listNodeGroups(cluster string) ([]string, error) {
	if cluster == "" {
		return nil, fmt.Errorf("clusterID/resource is required to start/stop EKS node groups")
	}
	var names []string
	var next *string
	for {
		out, err := s.eks.ListNodegroups(s.ctx, &eks.ListNodegroupsInput{
			ClusterName: aws.String(cluster),
			NextToken:   next,
		})
		if err != nil {
			return nil, fmt.Errorf("list EKS node groups for %q: %w", cluster, err)
		}
		names = append(names, out.Nodegroups...)
		if out.NextToken == nil || *out.NextToken == "" {
			break
		}
		next = out.NextToken
	}
	if len(names) == 0 {
		return nil, fmt.Errorf("EKS cluster %q has no node groups", cluster)
	}
	return names, nil
}

func (s *AWSService) scaleNodeGroup(cluster, group string, desired, min, max int32) error {
	out, err := s.eks.DescribeNodegroup(s.ctx, &eks.DescribeNodegroupInput{
		ClusterName:   aws.String(cluster),
		NodegroupName: aws.String(group),
	})
	if err != nil {
		return fmt.Errorf("describe EKS node group %q/%q: %w", cluster, group, err)
	}
	ng := out.Nodegroup
	if ng == nil || ng.ScalingConfig == nil {
		return fmt.Errorf("EKS node group %q/%q has no scaling config", cluster, group)
	}
	currentDesired := aws.ToInt32(ng.ScalingConfig.DesiredSize)
	currentMin := aws.ToInt32(ng.ScalingConfig.MinSize)
	currentMax := aws.ToInt32(ng.ScalingConfig.MaxSize)
	if currentMax < max {
		currentMax = max
	}
	if currentDesired == desired && currentMin == min {
		return nil
	}
	_, err = s.eks.UpdateNodegroupConfig(s.ctx, &eks.UpdateNodegroupConfigInput{
		ClusterName:   aws.String(cluster),
		NodegroupName: aws.String(group),
		ScalingConfig: &ekstypes.NodegroupScalingConfig{
			DesiredSize: aws.Int32(desired),
			MinSize:     aws.Int32(min),
			MaxSize:     aws.Int32(currentMax),
		},
	})
	if err != nil {
		return fmt.Errorf("scale EKS node group %q/%q to desired=%d: %w", cluster, group, desired, err)
	}
	return nil
}

func (s *AWSService) waitNodeGroupsDesired(cluster string, groups []string, desired int32, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		ready := 0
		for _, group := range groups {
			out, err := s.eks.DescribeNodegroup(s.ctx, &eks.DescribeNodegroupInput{
				ClusterName:   aws.String(cluster),
				NodegroupName: aws.String(group),
			})
			if err != nil {
				return fmt.Errorf("describe EKS node group %q/%q: %w", cluster, group, err)
			}
			ng := out.Nodegroup
			if ng == nil || ng.ScalingConfig == nil {
				continue
			}
			if ng.Status == ekstypes.NodegroupStatusActive && aws.ToInt32(ng.ScalingConfig.DesiredSize) == desired {
				ready++
			}
		}
		if ready == len(groups) {
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(15 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for EKS cluster %q node groups to reach desired=%d", cluster, desired)
}

func (s *AWSService) StartedDetails() ([]generic.StartedResource, error) {
	var names []string
	var next *string
	for {
		out, err := s.eks.ListClusters(s.ctx, &eks.ListClustersInput{NextToken: next})
		if err != nil {
			return nil, fmt.Errorf("list EKS clusters: %w", err)
		}
		names = append(names, out.Clusters...)
		if out.NextToken == nil || *out.NextToken == "" {
			break
		}
		next = out.NextToken
	}
	var started []generic.StartedResource
	for _, cluster := range names {
		if !strings.Contains(cluster, "finos-ccc-integration-k8s") {
			continue
		}
		desc, err := s.eks.DescribeCluster(s.ctx, &eks.DescribeClusterInput{Name: aws.String(cluster)})
		if err != nil {
			return nil, fmt.Errorf("describe EKS cluster %q: %w", cluster, err)
		}
		if desc.Cluster != nil && desc.Cluster.Tags != nil {
			if v, ok := desc.Cluster.Tags["CFIControlSet"]; ok && v != "CCC.K8S" {
				continue
			}
		}
		groups, err := s.listNodeGroups(cluster)
		if err != nil {
			// Cluster with no node groups is treated as parked.
			continue
		}
		var details []string
		online := false
		for _, group := range groups {
			out, err := s.eks.DescribeNodegroup(s.ctx, &eks.DescribeNodegroupInput{
				ClusterName:   aws.String(cluster),
				NodegroupName: aws.String(group),
			})
			if err != nil {
				return nil, err
			}
			desired := int32(0)
			if out.Nodegroup != nil && out.Nodegroup.ScalingConfig != nil {
				desired = aws.ToInt32(out.Nodegroup.ScalingConfig.DesiredSize)
			}
			details = append(details, fmt.Sprintf("%s=%d", group, desired))
			if desired > 0 {
				online = true
			}
		}
		if !online {
			continue
		}
		started = append(started, generic.StartedResource{
			ResourceID: cluster,
			Name:       cluster,
			State:      "nodes>0",
			Detail:     strings.Join(details, ","),
		})
	}
	return started, nil
}

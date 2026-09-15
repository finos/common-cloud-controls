package kubernetes

import (
	"fmt"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	container "google.golang.org/api/container/v1"
)

func (s *GCPService) Start(resourceID string) error {
	return s.scaleClusterNodePools(resourceID, 1, 1)
}

func (s *GCPService) Stop(resourceID string) error {
	return s.scaleClusterNodePools(resourceID, 0, 0)
}

func (s *GCPService) scaleClusterNodePools(resourceID string, nodeCount, minNodes int64) error {
	clusterID := strings.TrimSpace(resourceID)
	if clusterID == "" {
		clusterID = s.config.Get("cluster-name", "resource")
	}
	cluster, err := s.get(clusterID)
	if err != nil {
		return err
	}
	if len(cluster.NodePools) == 0 {
		return fmt.Errorf("GKE cluster %q has no node pools", clusterID)
	}
	name, err := s.clusterName(clusterID)
	if err != nil {
		return err
	}
	for _, pool := range cluster.NodePools {
		poolName := fmt.Sprintf("%s/nodePools/%s", name, pool.Name)
		if pool.Autoscaling != nil && pool.Autoscaling.Enabled {
			maxNodes := pool.Autoscaling.MaxNodeCount
			if maxNodes < minNodes+1 {
				maxNodes = minNodes + 1
			}
			if maxNodes < 1 {
				maxNodes = 1
			}
			op, err := s.gke.Projects.Locations.Clusters.NodePools.SetAutoscaling(poolName, &container.SetNodePoolAutoscalingRequest{
				Autoscaling: &container.NodePoolAutoscaling{
					Enabled:      true,
					MinNodeCount: minNodes,
					MaxNodeCount: maxNodes,
				},
			}).Context(s.ctx).Do()
			if err != nil {
				return fmt.Errorf("set GKE autoscaling for pool %q: %w", pool.Name, err)
			}
			if err := s.waitGKEOp(op.Name, 15*time.Minute); err != nil {
				return err
			}
		}
		op, err := s.gke.Projects.Locations.Clusters.NodePools.SetSize(poolName, &container.SetNodePoolSizeRequest{
			NodeCount: nodeCount,
		}).Context(s.ctx).Do()
		if err != nil {
			return fmt.Errorf("set GKE node pool %q size to %d: %w", pool.Name, nodeCount, err)
		}
		if err := s.waitGKEOp(op.Name, 20*time.Minute); err != nil {
			return err
		}
	}
	return nil
}

func (s *GCPService) waitGKEOp(opName string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		op, err := s.gke.Projects.Locations.Operations.Get(opName).Context(s.ctx).Do()
		if err != nil {
			return fmt.Errorf("get GKE operation %q: %w", opName, err)
		}
		if op.Status == "DONE" {
			if op.Error != nil && op.Error.Message != "" {
				return fmt.Errorf("GKE operation %q failed: %s", opName, op.Error.Message)
			}
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(10 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for GKE operation %q", opName)
}

func (s *GCPService) StartedDetails() ([]generic.StartedResource, error) {
	project := s.config.CloudParams().GcpProjectId
	location := s.config.Get("gcp-cluster-location", "gcp-location", "region")
	if project == "" {
		return nil, fmt.Errorf("gcp-project-id is required to list started GKE clusters")
	}
	parent := fmt.Sprintf("projects/%s/locations/-", project)
	if location != "" {
		parent = fmt.Sprintf("projects/%s/locations/%s", project, location)
	}
	resp, err := s.gke.Projects.Locations.Clusters.List(parent).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("list GKE clusters: %w", err)
	}
	var started []generic.StartedResource
	for _, cluster := range resp.Clusters {
		if cluster == nil {
			continue
		}
		if !isCCCGKEFixture(cluster) {
			continue
		}
		var details []string
		online := cluster.CurrentNodeCount > 0
		for _, pool := range cluster.NodePools {
			count := pool.InitialNodeCount
			details = append(details, fmt.Sprintf("%s=%d", pool.Name, count))
			if count > 0 {
				online = true
			}
		}
		if !online {
			continue
		}
		started = append(started, generic.StartedResource{
			ResourceID: cluster.Name,
			Name:       cluster.Name,
			State:      "nodes>0",
			Detail:     strings.Join(details, ","),
		})
	}
	return started, nil
}

func isCCCGKEFixture(cluster *container.Cluster) bool {
	if strings.Contains(cluster.Name, "finos-ccc-integration-k8s") {
		return true
	}
	if cluster.ResourceLabels != nil {
		if v := cluster.ResourceLabels["cficontrolset"]; strings.EqualFold(v, "ccc-k8s") || strings.EqualFold(v, "CCC.K8S") {
			return true
		}
	}
	return false
}

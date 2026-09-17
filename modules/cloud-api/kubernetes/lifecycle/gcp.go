package lifecycle

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	container "google.golang.org/api/container/v1"
)

// GCP scales GKE node pools for fixture start/stop.
type GCP struct {
	Ctx         context.Context
	GKE         *container.Service
	Project     string
	Location    string
	ClusterName func(clusterID string) (string, error)
	GetCluster  func(clusterID string) (*container.Cluster, error)
}

func (g *GCP) Start(clusterID string) error {
	return g.scaleNodePools(clusterID, 1, 1)
}

func (g *GCP) Stop(clusterID string) error {
	return g.scaleNodePools(clusterID, 0, 0)
}

func (g *GCP) scaleNodePools(clusterID string, nodeCount, minNodes int64) error {
	clusterID = strings.TrimSpace(clusterID)
	cluster, err := g.GetCluster(clusterID)
	if err != nil {
		return err
	}
	if len(cluster.NodePools) == 0 {
		return fmt.Errorf("GKE cluster %q has no node pools", clusterID)
	}
	name, err := g.ClusterName(clusterID)
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
			op, err := g.GKE.Projects.Locations.Clusters.NodePools.SetAutoscaling(poolName, &container.SetNodePoolAutoscalingRequest{
				Autoscaling: &container.NodePoolAutoscaling{
					Enabled:      true,
					MinNodeCount: minNodes,
					MaxNodeCount: maxNodes,
				},
			}).Context(g.Ctx).Do()
			if err != nil {
				return fmt.Errorf("set GKE autoscaling for pool %q: %w", pool.Name, err)
			}
			if err := g.waitOp(op.Name, 15*time.Minute); err != nil {
				return err
			}
		}
		op, err := g.GKE.Projects.Locations.Clusters.NodePools.SetSize(poolName, &container.SetNodePoolSizeRequest{
			NodeCount: nodeCount,
		}).Context(g.Ctx).Do()
		if err != nil {
			return fmt.Errorf("set GKE node pool %q size to %d: %w", pool.Name, nodeCount, err)
		}
		if err := g.waitOp(op.Name, 20*time.Minute); err != nil {
			return err
		}
	}
	return nil
}

func (g *GCP) waitOp(opName string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		op, err := g.GKE.Projects.Locations.Operations.Get(opName).Context(g.Ctx).Do()
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
		case <-g.Ctx.Done():
			return g.Ctx.Err()
		case <-time.After(10 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for GKE operation %q", opName)
}

func (g *GCP) StartedDetails() ([]generic.StartedResource, error) {
	if g.Project == "" {
		return nil, fmt.Errorf("gcp-project-id is required to list started GKE clusters")
	}
	parent := fmt.Sprintf("projects/%s/locations/-", g.Project)
	if g.Location != "" {
		parent = fmt.Sprintf("projects/%s/locations/%s", g.Project, g.Location)
	}
	resp, err := g.GKE.Projects.Locations.Clusters.List(parent).Context(g.Ctx).Do()
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

package lifecycle

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	container "google.golang.org/api/container/v1"
)

// GCP scales GKE node pools for fixture start/stop via SetSize only
// (no Cluster Autoscaler on the cheap fixture pool).
type GCP struct {
	Ctx         context.Context
	GKE         *container.Service
	Project     string
	Location    string
	ClusterName func(clusterID string) (string, error)
	GetCluster  func(clusterID string) (*container.Cluster, error)
}

func (g *GCP) Start(clusterID string) error {
	return g.scaleNodePools(clusterID, 1)
}

func (g *GCP) Stop(clusterID string) error {
	return g.scaleNodePools(clusterID, 0)
}

func (g *GCP) scaleNodePools(clusterID string, nodeCount int64) error {
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
	liveNodes := cluster.CurrentNodeCount
	for _, pool := range cluster.NodePools {
		autoscalingEnabled := pool.Autoscaling != nil && pool.Autoscaling.Enabled
		if !poolNeedsResize(pool.InitialNodeCount, nodeCount, autoscalingEnabled, liveNodes) {
			continue
		}
		poolName := fmt.Sprintf("%s/nodePools/%s", name, pool.Name)

		// Disable leftover autoscaling before SetSize so CA cannot undo a park.
		if autoscalingEnabled {
			op, err := g.GKE.Projects.Locations.Clusters.NodePools.SetAutoscaling(poolName, &container.SetNodePoolAutoscalingRequest{
				Autoscaling: &container.NodePoolAutoscaling{Enabled: false},
			}).Context(g.Ctx).Do()
			if err != nil {
				return fmt.Errorf("disable GKE autoscaling for pool %q: %w", pool.Name, err)
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

// poolNeedsResize is true when configured size, leftover autoscaling, or live
// cluster nodes disagree with the desired park/unpark target.
func poolNeedsResize(initialCount, nodeCount int64, autoscalingEnabled bool, liveNodes int64) bool {
	if autoscalingEnabled {
		return true
	}
	if initialCount != nodeCount {
		return true
	}
	if nodeCount == 0 && liveNodes > 0 {
		return true
	}
	if nodeCount > 0 && liveNodes == 0 {
		return true
	}
	return false
}

func (g *GCP) waitOp(opName string, timeout time.Duration) error {
	opName = qualifyGKEOpName(g.Project, g.Location, opName)
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

// qualifyGKEOpName turns a bare operation id into
// projects/{project}/locations/{location}/operations/{id}. The NodePools SetSize
// response sometimes returns only "operation-…", which Locations.Operations.Get
// rejects with HTTP 404.
func qualifyGKEOpName(project, location, opName string) string {
	opName = strings.TrimSpace(opName)
	if opName == "" || strings.HasPrefix(opName, "projects/") {
		return opName
	}
	opName = strings.TrimPrefix(opName, "operations/")
	if project == "" {
		return opName
	}
	if location == "" {
		location = "-"
	}
	return fmt.Sprintf("projects/%s/locations/%s/operations/%s", project, location, opName)
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

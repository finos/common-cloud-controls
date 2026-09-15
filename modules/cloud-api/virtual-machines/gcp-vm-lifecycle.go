package virtualmachines

import (
	"fmt"
	"strings"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"google.golang.org/api/compute/v1"
)

func (s *GCPVirtualMachinesService) Start(resourceID string) error {
	client, project, zone, name, err := s.resolveInstance(resourceID)
	if err != nil {
		return err
	}
	inst, err := client.Instances.Get(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return fmt.Errorf("get GCE instance %q: %w", name, err)
	}
	switch strings.ToUpper(inst.Status) {
	case "RUNNING":
		return nil
	case "STAGING":
		return s.waitInstanceStatus(client, project, zone, name, "RUNNING", 10*time.Minute)
	case "STOPPING", "SUSPENDING":
		if err := s.waitInstanceStatus(client, project, zone, name, "TERMINATED", 10*time.Minute); err != nil {
			return err
		}
	case "TERMINATED", "STOPPED":
		// continue to start
	default:
		return fmt.Errorf("cannot start GCE instance %q in status %q", name, inst.Status)
	}
	op, err := client.Instances.Start(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return fmt.Errorf("start GCE instance %q: %w", name, err)
	}
	if err := s.waitZoneOp(client, project, zone, op.Name, 10*time.Minute); err != nil {
		return err
	}
	return s.waitInstanceStatus(client, project, zone, name, "RUNNING", 10*time.Minute)
}

func (s *GCPVirtualMachinesService) Stop(resourceID string) error {
	client, project, zone, name, err := s.resolveInstance(resourceID)
	if err != nil {
		return err
	}
	inst, err := client.Instances.Get(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return fmt.Errorf("get GCE instance %q: %w", name, err)
	}
	switch strings.ToUpper(inst.Status) {
	case "TERMINATED", "STOPPED":
		return nil
	case "STOPPING":
		return s.waitInstanceStatus(client, project, zone, name, "TERMINATED", 10*time.Minute)
	case "RUNNING", "STAGING":
		// continue to stop
	default:
		return fmt.Errorf("cannot stop GCE instance %q in status %q", name, inst.Status)
	}
	op, err := client.Instances.Stop(project, zone, name).Context(s.ctx).Do()
	if err != nil {
		return fmt.Errorf("stop GCE instance %q: %w", name, err)
	}
	if err := s.waitZoneOp(client, project, zone, op.Name, 10*time.Minute); err != nil {
		return err
	}
	return s.waitInstanceStatus(client, project, zone, name, "TERMINATED", 10*time.Minute)
}

func (s *GCPVirtualMachinesService) resolveInstance(resourceID string) (*compute.Service, string, string, string, error) {
	name := lifecycleResourceID(resourceID, s.config.Get("resource"))
	project := s.config.CloudParams().GcpProjectId
	if name == "" || project == "" {
		return nil, "", "", "", fmt.Errorf("resource and gcp-project-id are required to start/stop GCE instances")
	}
	client, err := compute.NewService(s.ctx)
	if err != nil {
		return nil, "", "", "", fmt.Errorf("create Compute Engine client: %w", err)
	}
	zone := strings.TrimSpace(s.config.Get("zone", "gcp-zone"))
	if zone != "" {
		return client, project, zone, name, nil
	}
	agg, err := client.Instances.AggregatedList(project).Filter(fmt.Sprintf("name = %s", name)).Context(s.ctx).Do()
	if err != nil {
		return nil, "", "", "", fmt.Errorf("list GCE instances named %q: %w", name, err)
	}
	for scope, list := range agg.Items {
		if len(list.Instances) == 0 {
			continue
		}
		// scope is "zones/us-east1-b"
		parts := strings.Split(scope, "/")
		if len(parts) == 2 && parts[0] == "zones" {
			return client, project, parts[1], name, nil
		}
	}
	return nil, "", "", "", fmt.Errorf("no GCE instance named %q found in project %q (set zone/gcp-zone if needed)", name, project)
}

func (s *GCPVirtualMachinesService) waitInstanceStatus(client *compute.Service, project, zone, name, want string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	want = strings.ToUpper(want)
	for time.Now().Before(deadline) {
		inst, err := client.Instances.Get(project, zone, name).Context(s.ctx).Do()
		if err != nil {
			return fmt.Errorf("get GCE instance %q: %w", name, err)
		}
		if strings.EqualFold(inst.Status, want) {
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for GCE instance %q to become %q", name, want)
}

func (s *GCPVirtualMachinesService) waitZoneOp(client *compute.Service, project, zone, opName string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		op, err := client.ZoneOperations.Get(project, zone, opName).Context(s.ctx).Do()
		if err != nil {
			return fmt.Errorf("get GCE zone operation %q: %w", opName, err)
		}
		if op.Status == "DONE" {
			if op.Error != nil && len(op.Error.Errors) > 0 {
				return fmt.Errorf("GCE operation %q failed: %s", opName, op.Error.Errors[0].Message)
			}
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(3 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for GCE zone operation %q", opName)
}

func (s *GCPVirtualMachinesService) StartedDetails() ([]generic.StartedResource, error) {
	project := s.config.CloudParams().GcpProjectId
	if project == "" {
		return nil, fmt.Errorf("gcp-project-id is required to list started GCE instances")
	}
	client, err := compute.NewService(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("create Compute Engine client: %w", err)
	}
	// Prefer label from terraform; also match fixture name prefix.
	filter := `(labels.cficontrolset = "ccc-vm") OR (name = finos-ccc-integration-vm-main)`
	agg, err := client.Instances.AggregatedList(project).Filter(filter).Context(s.ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("list GCE CCC.VM instances: %w", err)
	}
	var started []generic.StartedResource
	for scope, list := range agg.Items {
		for _, inst := range list.Instances {
			if inst == nil {
				continue
			}
			status := strings.ToUpper(inst.Status)
			if status != "RUNNING" && status != "STAGING" {
				continue
			}
			zone := ""
			parts := strings.Split(scope, "/")
			if len(parts) == 2 {
				zone = parts[1]
			}
			started = append(started, generic.StartedResource{
				ResourceID: inst.Name,
				Name:       inst.Name,
				State:      inst.Status,
				Detail:     zone,
			})
		}
	}
	return started, nil
}

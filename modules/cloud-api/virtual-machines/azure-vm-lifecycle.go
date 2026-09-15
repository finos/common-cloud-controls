package virtualmachines

import (
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/compute/armcompute/v6"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

func (s *AzureVirtualMachinesService) Start(resourceID string) error {
	client, group, name, err := s.vmClient(resourceID)
	if err != nil {
		return err
	}
	power, err := s.vmPowerState(client, group, name)
	if err != nil {
		return err
	}
	if strings.EqualFold(power, "PowerState/running") {
		return nil
	}
	poller, err := client.BeginStart(s.ctx, group, name, nil)
	if err != nil {
		return fmt.Errorf("start Azure VM %q: %w", name, err)
	}
	if _, err := poller.PollUntilDone(s.ctx, nil); err != nil {
		return fmt.Errorf("wait for Azure VM %q start: %w", name, err)
	}
	return s.waitVMPowerState(client, group, name, "PowerState/running", 15*time.Minute)
}

func (s *AzureVirtualMachinesService) Stop(resourceID string) error {
	client, group, name, err := s.vmClient(resourceID)
	if err != nil {
		return err
	}
	power, err := s.vmPowerState(client, group, name)
	if err != nil {
		return err
	}
	// Deallocated (not merely stopped) avoids compute charges.
	if strings.EqualFold(power, "PowerState/deallocated") {
		return nil
	}
	poller, err := client.BeginDeallocate(s.ctx, group, name, nil)
	if err != nil {
		return fmt.Errorf("deallocate Azure VM %q: %w", name, err)
	}
	if _, err := poller.PollUntilDone(s.ctx, nil); err != nil {
		return fmt.Errorf("wait for Azure VM %q deallocate: %w", name, err)
	}
	return s.waitVMPowerState(client, group, name, "PowerState/deallocated", 15*time.Minute)
}

func (s *AzureVirtualMachinesService) vmClient(resourceID string) (*armcompute.VirtualMachinesClient, string, string, error) {
	name := lifecycleResourceID(resourceID, s.config.Get("resource"))
	subscription := s.config.CloudParams().AzureSubscriptionID
	group := s.config.CloudParams().AzureResourceGroup
	if name == "" || subscription == "" || group == "" {
		return nil, "", "", fmt.Errorf("resource, azure-subscription-id, and azure-resource-group are required to start/stop Azure VMs")
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, "", "", fmt.Errorf("create Azure credential for VM lifecycle: %w", err)
	}
	client, err := armcompute.NewVirtualMachinesClient(subscription, cred, nil)
	if err != nil {
		return nil, "", "", fmt.Errorf("create Azure VM client: %w", err)
	}
	return client, group, name, nil
}

func (s *AzureVirtualMachinesService) vmPowerState(client *armcompute.VirtualMachinesClient, group, name string) (string, error) {
	view, err := client.InstanceView(s.ctx, group, name, nil)
	if err != nil {
		return "", fmt.Errorf("get Azure VM %q instance view: %w", name, err)
	}
	for _, st := range view.Statuses {
		if st == nil || st.Code == nil {
			continue
		}
		if strings.HasPrefix(*st.Code, "PowerState/") {
			return *st.Code, nil
		}
	}
	return "", fmt.Errorf("Azure VM %q has no PowerState in instance view", name)
}

func (s *AzureVirtualMachinesService) waitVMPowerState(client *armcompute.VirtualMachinesClient, group, name, want string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		power, err := s.vmPowerState(client, group, name)
		if err != nil {
			return err
		}
		if strings.EqualFold(power, want) {
			return nil
		}
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
	return fmt.Errorf("timed out waiting for Azure VM %q to become %q", name, want)
}

func (s *AzureVirtualMachinesService) StartedDetails() ([]generic.StartedResource, error) {
	subscription := s.config.CloudParams().AzureSubscriptionID
	group := s.config.CloudParams().AzureResourceGroup
	if subscription == "" || group == "" {
		return nil, fmt.Errorf("azure-subscription-id and azure-resource-group are required to list started Azure VMs")
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("create Azure credential for VM lifecycle: %w", err)
	}
	client, err := armcompute.NewVirtualMachinesClient(subscription, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("create Azure VM client: %w", err)
	}
	pager := client.NewListPager(group, nil)
	var started []generic.StartedResource
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("list Azure VMs in %q: %w", group, err)
		}
		for _, vm := range page.Value {
			if vm == nil || vm.Name == nil {
				continue
			}
			name := *vm.Name
			if !isCCCVMFixture(name, vm.Tags) {
				continue
			}
			power, err := s.vmPowerState(client, group, name)
			if err != nil {
				return nil, err
			}
			if !strings.EqualFold(power, "PowerState/running") && !strings.EqualFold(power, "PowerState/starting") {
				continue
			}
			started = append(started, generic.StartedResource{
				ResourceID: name,
				Name:       name,
				State:      power,
				Detail:     group,
			})
		}
	}
	return started, nil
}

func isCCCVMFixture(name string, tags map[string]*string) bool {
	if strings.Contains(name, "finos-ccc-integration-vm") {
		return true
	}
	if tags == nil {
		return false
	}
	if v, ok := tags["CFIControlSet"]; ok && v != nil && *v == "CCC.VM" {
		return true
	}
	if v, ok := tags["Name"]; ok && v != nil && strings.Contains(*v, "finos-ccc-integration-vm") {
		return true
	}
	return false
}

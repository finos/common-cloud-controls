package vpc

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/compute/armcompute/v6"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/network/armnetwork/v6"
)

type azureComputeClients struct {
	vms  *armcompute.VirtualMachinesClient
	nics *armnetwork.InterfacesClient
}

var azureComputeClientCache sync.Map

func (s *AzureVPCService) azureComputeClients() (*azureComputeClients, error) {
	subscriptionID := strings.TrimSpace(s.config.CloudParams().AzureSubscriptionID)
	if subscriptionID == "" {
		subscriptionID = strings.TrimSpace(s.config.Get("azure-subscription-id"))
	}
	if subscriptionID == "" {
		return nil, fmt.Errorf("azure-subscription-id is required")
	}

	if cached, ok := azureComputeClientCache.Load(subscriptionID); ok {
		return cached.(*azureComputeClients), nil
	}

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure credential: %w", err)
	}

	vmsClient, err := armcompute.NewVirtualMachinesClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create virtual machines client: %w", err)
	}
	nicsClient, err := armnetwork.NewInterfacesClient(subscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create network interfaces client: %w", err)
	}

	clients := &azureComputeClients{vms: vmsClient, nics: nicsClient}
	azureComputeClientCache.Store(subscriptionID, clients)
	return clients, nil
}

func (s *AzureVPCService) SelectPublicSubnetForTest(vpcID string) (map[string]interface{}, error) {
	vpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", vpcID))
	if vpcIDStr == "" {
		return nil, fmt.Errorf("vpcID is required")
	}

	vnetName, err := s.resolveVNetName(vpcIDStr)
	if err != nil {
		return nil, err
	}

	vnet, err := s.networks.Get(s.ctx, s.resourceGroup, vnetName, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get virtual network %q: %w", vnetName, err)
	}

	rows := make([]map[string]interface{}, 0)
	if vnet.Properties != nil {
		for _, subnet := range vnet.Properties.Subnets {
			if subnet == nil || subnet.Name == nil {
				continue
			}
			name := strings.TrimSpace(*subnet.Name)
			if !cn02IsPublicSubnetName(name) {
				continue
			}
			subnetID := ""
			if subnet.ID != nil {
				subnetID = strings.TrimSpace(*subnet.ID)
			}
			if subnetID == "" {
				continue
			}
			rows = append(rows, map[string]interface{}{
				"SubnetId":            subnetID,
				"RouteTableId":        "",
				"MapPublicIpOnLaunch": false,
			})
		}
	}

	return cn02SelectFirstPublicSubnet(vpcIDStr, rows)
}

func (s *AzureVPCService) CreateTestResourceInSubnet(subnetID string) (map[string]interface{}, error) {
	subnetIDStr := strings.TrimSpace(fmt.Sprintf("%v", subnetID))
	if subnetIDStr == "" {
		return nil, fmt.Errorf("subnetID is required")
	}

	clients, err := s.azureComputeClients()
	if err != nil {
		return nil, err
	}

	location := strings.TrimSpace(s.config.CloudParams().Region)
	if location == "" {
		return nil, fmt.Errorf("region is required for Azure test resource creation")
	}

	vmName := fmt.Sprintf("cfi-vpc-test-%s", azureShortID())
	nicName := vmName + "-nic"
	password, err := azureTestVMPassword()
	if err != nil {
		return nil, err
	}

	nicParams := armnetwork.Interface{
		Location: to.Ptr(location),
		Properties: &armnetwork.InterfacePropertiesFormat{
			IPConfigurations: []*armnetwork.InterfaceIPConfiguration{
				{
					Name: to.Ptr("ipconfig1"),
					Properties: &armnetwork.InterfaceIPConfigurationPropertiesFormat{
						Subnet: &armnetwork.Subnet{ID: to.Ptr(subnetIDStr)},
					},
				},
			},
		},
		Tags: map[string]*string{
			"ManagedBy":     to.Ptr("CCC-CFI-Compliance"),
			"CFIControlSet": to.Ptr("CCC.VPC"),
			"CFITest":       to.Ptr("true"),
		},
	}

	nicPoller, err := clients.nics.BeginCreateOrUpdate(s.ctx, s.resourceGroup, nicName, nicParams, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create test NIC in subnet %s: %w", subnetIDStr, err)
	}
	nicResp, err := nicPoller.PollUntilDone(s.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed waiting for test NIC %s: %w", nicName, err)
	}
	nicID := strings.TrimSpace(azureString(nicResp.ID))

	vmSize := azureTestVMSize()
	vmParams := armcompute.VirtualMachine{
		Location: to.Ptr(location),
		Properties: &armcompute.VirtualMachineProperties{
			HardwareProfile: &armcompute.HardwareProfile{VMSize: to.Ptr(armcompute.VirtualMachineSizeTypes(vmSize))},
			StorageProfile: &armcompute.StorageProfile{
				ImageReference: &armcompute.ImageReference{
					Publisher: to.Ptr("Canonical"),
					Offer:     to.Ptr("0001-com-ubuntu-server-jammy"),
					SKU:       to.Ptr("22_04-lts-gen2"),
					Version:   to.Ptr("latest"),
				},
				OSDisk: &armcompute.OSDisk{
					Name:         to.Ptr(vmName + "-osdisk"),
					CreateOption: to.Ptr(armcompute.DiskCreateOptionTypesFromImage),
					ManagedDisk:  &armcompute.ManagedDiskParameters{StorageAccountType: to.Ptr(armcompute.StorageAccountTypesStandardLRS)},
				},
			},
			OSProfile: &armcompute.OSProfile{
				ComputerName:  to.Ptr(vmName),
				AdminUsername: to.Ptr("cfiadmin"),
				AdminPassword: to.Ptr(password),
				LinuxConfiguration: &armcompute.LinuxConfiguration{
					DisablePasswordAuthentication: to.Ptr(false),
				},
			},
			NetworkProfile: &armcompute.NetworkProfile{
				NetworkInterfaces: []*armcompute.NetworkInterfaceReference{
					{ID: to.Ptr(nicID), Properties: &armcompute.NetworkInterfaceReferenceProperties{Primary: to.Ptr(true)}},
				},
			},
		},
		Tags: map[string]*string{
			"Name":          to.Ptr("cfi-vpc-test-resource"),
			"ManagedBy":     to.Ptr("CCC-CFI-Compliance"),
			"CFIControlSet": to.Ptr("CCC.VPC"),
			"CFITest":       to.Ptr("true"),
		},
	}

	vmPoller, err := clients.vms.BeginCreateOrUpdate(s.ctx, s.resourceGroup, vmName, vmParams, nil)
	if err != nil {
		_ = s.azureDeleteNIC(clients, nicName)
		return nil, fmt.Errorf("failed to create test VM in subnet %s: %w", subnetIDStr, err)
	}
	if _, err := vmPoller.PollUntilDone(s.ctx, nil); err != nil {
		_ = s.azureDeleteNIC(clients, nicName)
		return nil, fmt.Errorf("failed waiting for test VM %s: %w", vmName, err)
	}

	return map[string]interface{}{
		"ResourceId":   vmName,
		"ResourceType": "Microsoft.Compute/virtualMachines",
		"SubnetId":     subnetIDStr,
		"NicName":      nicName,
		"InstanceType": vmSize,
	}, nil
}

func (s *AzureVPCService) GetResourceExternalIpAssignment(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	clients, err := s.azureComputeClients()
	if err != nil {
		return nil, err
	}

	vm, err := clients.vms.Get(s.ctx, s.resourceGroup, resourceIDStr, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get test VM %q: %w", resourceIDStr, err)
	}

	publicIP := ""
	subnetID := ""
	if vm.Properties != nil && vm.Properties.NetworkProfile != nil {
		for _, nicRef := range vm.Properties.NetworkProfile.NetworkInterfaces {
			if nicRef == nil || nicRef.ID == nil {
				continue
			}
			nicName := azureResourceNameFromID(*nicRef.ID)
			nic, nicErr := clients.nics.Get(s.ctx, s.resourceGroup, nicName, nil)
			if nicErr != nil {
				return nil, fmt.Errorf("failed to get NIC for VM %q: %w", resourceIDStr, nicErr)
			}
			if nic.Properties != nil {
				for _, ipCfg := range nic.Properties.IPConfigurations {
					if ipCfg == nil || ipCfg.Properties == nil {
						continue
					}
					if ipCfg.Properties.Subnet != nil && ipCfg.Properties.Subnet.ID != nil {
						subnetID = strings.TrimSpace(*ipCfg.Properties.Subnet.ID)
					}
					if ipCfg.Properties.PublicIPAddress != nil && ipCfg.Properties.PublicIPAddress.ID != nil {
						publicIP = strings.TrimSpace(*ipCfg.Properties.PublicIPAddress.ID)
					}
				}
			}
			break
		}
	}

	return map[string]interface{}{
		"ResourceId":    resourceIDStr,
		"ResourceType":  "Microsoft.Compute/virtualMachines",
		"HasExternalIp": publicIP != "",
		"ExternalIp":    publicIP,
		"State":         "running",
		"SubnetId":      subnetID,
	}, nil
}

func (s *AzureVPCService) DeleteTestResource(resourceID string) (map[string]interface{}, error) {
	resourceIDStr := strings.TrimSpace(fmt.Sprintf("%v", resourceID))
	if resourceIDStr == "" {
		return nil, fmt.Errorf("resourceID is required")
	}

	clients, err := s.azureComputeClients()
	if err != nil {
		return nil, err
	}

	vm, err := clients.vms.Get(s.ctx, s.resourceGroup, resourceIDStr, nil)
	if err != nil {
		if isAzureResourceNotFound(err) {
			return map[string]interface{}{
				"ResourceId": resourceIDStr,
				"Deleted":    true,
				"Reason":     "resource already absent",
			}, nil
		}
		return nil, fmt.Errorf("failed to get test VM %q: %w", resourceIDStr, err)
	}

	nicNames := make([]string, 0)
	if vm.Properties != nil && vm.Properties.NetworkProfile != nil {
		for _, nicRef := range vm.Properties.NetworkProfile.NetworkInterfaces {
			if nicRef != nil && nicRef.ID != nil {
				nicNames = append(nicNames, azureResourceNameFromID(*nicRef.ID))
			}
		}
	}

	delPoller, err := clients.vms.BeginDelete(s.ctx, s.resourceGroup, resourceIDStr, nil)
	if err != nil {
		if isAzureResourceNotFound(err) {
			return map[string]interface{}{"ResourceId": resourceIDStr, "Deleted": true, "Reason": "resource already absent"}, nil
		}
		return nil, fmt.Errorf("failed to delete test VM %q: %w", resourceIDStr, err)
	}
	if _, err := delPoller.PollUntilDone(s.ctx, nil); err != nil {
		return map[string]interface{}{
			"ResourceId":    resourceIDStr,
			"Deleted":       false,
			"CleanupStatus": "deletion-requested",
			"Reason":        err.Error(),
		}, nil
	}

	for _, nicName := range nicNames {
		_ = s.azureDeleteNIC(clients, nicName)
	}

	return map[string]interface{}{
		"ResourceId": resourceIDStr,
		"Deleted":    true,
		"Reason":     "deleted",
	}, nil
}

func (s *AzureVPCService) GenerateTestTraffic(vpcID string) (map[string]interface{}, error) {
	out, err := generateTestTraffic(s, vpcID)
	if err != nil {
		return nil, err
	}
	if out["ResourceType"] == nil {
		out["ResourceType"] = "Microsoft.Compute/virtualMachines"
	}
	return out, nil
}

func (s *AzureVPCService) azureDeleteNIC(clients *azureComputeClients, nicName string) error {
	poller, err := clients.nics.BeginDelete(s.ctx, s.resourceGroup, nicName, nil)
	if err != nil {
		return err
	}
	_, err = poller.PollUntilDone(context.Background(), nil)
	return err
}

func azureResourceNameFromID(id string) string {
	parts := strings.Split(strings.TrimSpace(id), "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func azureString(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

func azureShortID() string {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func azureTestVMSize() string {
	for _, key := range []string{"CN_TEST_INSTANCE_TYPE", "CN02_TEST_INSTANCE_TYPE", "TEST_INSTANCE_TYPE"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return "Standard_B1s"
}

func azureTestVMPassword() (string, error) {
	if v := strings.TrimSpace(os.Getenv("CN_TEST_VM_ADMIN_PASSWORD")); v != "" {
		return v, nil
	}
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to generate test VM password: %w", err)
	}
	return "Cfi" + hex.EncodeToString(buf) + "!9", nil
}

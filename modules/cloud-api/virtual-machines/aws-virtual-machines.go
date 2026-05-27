package virtualmachines

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	ec2types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

var _ Service = (*AWSVirtualMachinesService)(nil)

type AWSVirtualMachinesService struct {
	client *ec2.Client
	ctx    context.Context
	config types.Config
}

func NewAWSVirtualMachinesService(ctx context.Context, cfg types.Config) (*AWSVirtualMachinesService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}
	return &AWSVirtualMachinesService{
		client: ec2.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func NewAWSVirtualMachinesServiceWithCredentials(ctx context.Context, cfg types.Config, identity types.Identity) (*AWSVirtualMachinesService, error) {
	accessKeyID := identity.Get("access_key_id")
	secretAccessKey := identity.Get("secret_access_key")
	sessionToken := identity.Get("session_token")
	if accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("missing AWS keys for identity %q", identity.UserName)
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(cfg.CloudParams().Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, sessionToken)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config with credentials: %w", err)
	}
	return &AWSVirtualMachinesService{
		client: ec2.NewFromConfig(awsCfg),
		ctx:    ctx,
		config: cfg,
	}, nil
}

func (s *AWSVirtualMachinesService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		Filters: []ec2types.Filter{
			{Name: aws.String("tag:CFIControlSet"), Values: []string{"CCC.VM"}},
			{Name: aws.String("instance-state-name"), Values: []string{"running", "stopped", "stopping", "pending"}},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list VM instances: %w", err)
	}
	var resources []types.TestParams
	resourceFilter := s.config.Get("resource")
	for _, res := range out.Reservations {
		for _, inst := range res.Instances {
			id := aws.ToString(inst.InstanceId)
			name := tagValue(inst.Tags, "Name")
			if name == "" {
				name = id
			}
			if resourceFilter != "" && resourceFilter != name && resourceFilter != id {
				continue
			}
			host := strings.TrimSpace(aws.ToString(inst.PublicIpAddress))
			if host == "" {
				host = strings.TrimSpace(aws.ToString(inst.PrivateIpAddress))
			}
			resources = append(resources, types.TestParams{
				UID:                 id,
				ResourceName:        name,
				HostName:            host,
				PortNumber:          s.config.Get("portNumber", "test-listener-port"),
				Protocol:            "tcp",
				ProviderServiceType: "ec2:instance",
				ServiceType:         "virtual-machines",
				CatalogTypes:        []string{"CCC.VM"},
				TagFilter:           []string{"@Behavioural", "@virtual-machines"},
				Config:              s.config,
			})
		}
	}
	if len(resources) == 0 && resourceFilter != "" {
		resources = append(resources, types.TestParams{
			UID:                 resourceFilter,
			ResourceName:        resourceFilter,
			HostName:            s.config.Get("hostName"),
			PortNumber:          s.config.Get("portNumber", "test-listener-port"),
			Protocol:            "tcp",
			ProviderServiceType: "ec2:instance",
			ServiceType:         "virtual-machines",
			CatalogTypes:        []string{"CCC.VM"},
			TagFilter:           []string{"@Behavioural", "@virtual-machines"},
			Config:              s.config,
		})
	}
	return resources, nil
}

func (s *AWSVirtualMachinesService) CheckUserProvisioned() error {
	_, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{MaxResults: aws.Int32(1)})
	if err != nil {
		return fmt.Errorf("credentials not ready for EC2: %w", err)
	}
	return nil
}

func (s *AWSVirtualMachinesService) ElevateAccessForInspection() error { return nil }
func (s *AWSVirtualMachinesService) ResetAccess() error                { return nil }
func (s *AWSVirtualMachinesService) TearDown() error                   { return nil }

func (s *AWSVirtualMachinesService) UpdateResourcePolicy() error {
	instanceID := s.config.Get("resource")
	if instanceID == "" {
		return fmt.Errorf("resource config var is required for UpdateResourcePolicy")
	}
	_, err := s.client.CreateTags(s.ctx, &ec2.CreateTagsInput{
		Resources: []string{instanceID},
		Tags: []ec2types.Tag{
			{Key: aws.String("ccc_compliance_test"), Value: aws.String(time.Now().UTC().Format(time.RFC3339))},
		},
	})
	return err
}

func (s *AWSVirtualMachinesService) TriggerDataWrite(resourceID string) error {
	_, err := s.client.CreateTags(s.ctx, &ec2.CreateTagsInput{
		Resources: []string{resourceID},
		Tags: []ec2types.Tag{
			{Key: aws.String("ccc_data_write_probe"), Value: aws.String(time.Now().UTC().Format(time.RFC3339Nano))},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to trigger VM data-write event: %w", err)
	}
	return nil
}

func (s *AWSVirtualMachinesService) TriggerDataRead(resourceID string) error {
	_, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{
		InstanceIds: []string{resourceID},
	})
	if err != nil {
		return fmt.Errorf("failed to trigger VM data-read event: %w", err)
	}
	return nil
}

func (s *AWSVirtualMachinesService) GetResourceRegion(_ string) (string, error) {
	return s.config.CloudParams().Region, nil
}

func (s *AWSVirtualMachinesService) GetReplicationStatus(_ string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("replication status not applicable for virtual-machines")
}

func (s *AWSVirtualMachinesService) GetVolumeEncryptionStatus(instanceID string) (*VolumeEncryptionResult, error) {
	out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{InstanceIds: []string{instanceID}})
	if err != nil {
		return nil, fmt.Errorf("failed to describe instance %q: %w", instanceID, err)
	}
	var volumeIDs []string
	for _, res := range out.Reservations {
		for _, inst := range res.Instances {
			for _, mapping := range inst.BlockDeviceMappings {
				if mapping.Ebs != nil && mapping.Ebs.VolumeId != nil {
					volumeIDs = append(volumeIDs, aws.ToString(mapping.Ebs.VolumeId))
				}
			}
		}
	}
	if len(volumeIDs) == 0 {
		return nil, fmt.Errorf("no EBS volumes found for instance %q", instanceID)
	}
	vols, err := s.client.DescribeVolumes(s.ctx, &ec2.DescribeVolumesInput{VolumeIds: volumeIDs})
	if err != nil {
		return nil, fmt.Errorf("failed to describe volumes: %w", err)
	}
	result := &VolumeEncryptionResult{Volumes: make([]VolumeEncryptionStatus, 0, len(vols.Volumes))}
	for _, vol := range vols.Volumes {
		result.Volumes = append(result.Volumes, VolumeEncryptionStatus{
			VolumeID:            aws.ToString(vol.VolumeId),
			Encrypted:           aws.ToBool(vol.Encrypted),
			EncryptionAlgorithm: volumeEncryptionAlgorithm(vol),
			KMSKeyID:            aws.ToString(vol.KmsKeyId),
		})
	}
	return result, nil
}

func (s *AWSVirtualMachinesService) AttemptInboundConnection(instanceID string, port int) (*ConnectionAttemptResult, error) {
	host := strings.TrimSpace(s.config.Get("hostName"))
	if host == "" {
		out, err := s.client.DescribeInstances(s.ctx, &ec2.DescribeInstancesInput{InstanceIds: []string{instanceID}})
		if err != nil {
			return nil, fmt.Errorf("failed to resolve VM host for %q: %w", instanceID, err)
		}
		for _, res := range out.Reservations {
			for _, inst := range res.Instances {
				host = strings.TrimSpace(aws.ToString(inst.PublicIpAddress))
				if host == "" {
					host = strings.TrimSpace(aws.ToString(inst.PrivateIpAddress))
				}
				if host != "" {
					break
				}
			}
		}
	}
	if host == "" {
		return nil, fmt.Errorf("hostName not set and could not discover instance IP for %q", instanceID)
	}
	if port <= 0 {
		return nil, fmt.Errorf("port must be > 0")
	}

	address := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", address, 3*time.Second)
	if err != nil {
		return &ConnectionAttemptResult{
			Connected: false,
			Error:     err.Error(),
		}, nil
	}
	remote := conn.RemoteAddr().String()
	_ = conn.Close()
	return &ConnectionAttemptResult{
		Connected:  true,
		RemoteAddr: remote,
	}, nil
}

func tagValue(tags []ec2types.Tag, key string) string {
	for _, t := range tags {
		if aws.ToString(t.Key) == key {
			return aws.ToString(t.Value)
		}
	}
	return ""
}

func volumeEncryptionAlgorithm(vol ec2types.Volume) string {
	if aws.ToString(vol.KmsKeyId) != "" {
		return "aws:kms"
	}
	if aws.ToBool(vol.Encrypted) {
		return "AES256"
	}
	return ""
}

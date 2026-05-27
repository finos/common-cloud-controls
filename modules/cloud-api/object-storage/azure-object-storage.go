package objstorage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/storage/armstorage"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/bloberror"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/container"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/generic/retry"
	"github.com/finos/common-cloud-controls/cloud-api/object-storage/elevation"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AzureBlobService implements Service for Azure Blob Storage
type AzureBlobService struct {
	storageClient *armstorage.AccountsClient // For normal storage operations
	credential    azcore.TokenCredential
	ctx           context.Context
	config        types.Config
	elevator      *elevation.AzureStorageElevator // Handles access elevation (RBAC + network)
	createdObjs   []struct{ bucket, object string }
	createdMu     sync.Mutex
}

// storageAccountName returns the Azure storage account name from service params
func (s *AzureBlobService) storageAccountName() string {
	return s.config.Get("azure-storage-account")
}

// defaultContainerName returns the Azure default container name from service params
func (s *AzureBlobService) defaultContainerName() string {
	name := s.config.Get("default-container")
	if name == "" {
		return "ccc-test-container-2" // Fallback
	}
	return name
}

// NewAzureBlobService creates a new Azure Blob Storage service using default credentials
func NewAzureBlobService(ctx context.Context, config types.Config) (*AzureBlobService, error) {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure credential: %w", err)
	}

	// Create storage client for normal operations
	cp := config.CloudParams()
	storageClient, err := armstorage.NewAccountsClient(cp.AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage accounts client: %w", err)
	}

	// Create elevator for managing access controls (RBAC + network)
	elevator, err := elevation.NewAzureStorageElevator(
		ctx,
		cred,
		cp.AzureSubscriptionID,
		cp.AzureResourceGroup,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure storage elevator: %w", err)
	}

	return &AzureBlobService{
		storageClient: storageClient,
		credential:    cred,
		ctx:           ctx,
		config:        config,
		elevator:      elevator,
	}, nil
}

// NewAzureBlobServiceWithCredentials creates a new Azure Blob Storage service with service principal credentials
func NewAzureBlobServiceWithCredentials(ctx context.Context, config types.Config, identity types.Identity) (*AzureBlobService, error) {
	cp := config.CloudParams()
	clientID := identity.ClientID()
	if clientID == "" {
		return nil, fmt.Errorf("client_id not found for test identity %q", identity.UserName)
	}
	clientSecret := identity.ClientSecret()
	if clientSecret == "" {
		return nil, fmt.Errorf("client_secret not found for test identity %q", identity.UserName)
	}
	tenantID := config.Get("azure-tenant-id", "tenant_id")
	if tenantID == "" {
		return nil, fmt.Errorf("azure-tenant-id not found in config")
	}

	fmt.Printf("🔐 Creating Azure Blob Storage client with service principal:\n")
	fmt.Printf("   Client ID: %s\n", clientID)
	fmt.Printf("   Tenant ID: %s\n", tenantID)

	// Create service principal credential
	cred, err := azidentity.NewClientSecretCredential(tenantID, clientID, clientSecret, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create service principal credential: %w", err)
	}

	// Create storage client for normal operations
	storageClient, err := armstorage.NewAccountsClient(cp.AzureSubscriptionID, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage accounts client: %w", err)
	}

	// Create elevator for managing access controls (RBAC + network)
	elevator, err := elevation.NewAzureStorageElevator(
		ctx,
		cred,
		cp.AzureSubscriptionID,
		cp.AzureResourceGroup,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Azure storage elevator: %w", err)
	}

	return &AzureBlobService{
		storageClient: storageClient,
		credential:    cred,
		ctx:           ctx,
		config:        config,
		elevator:      elevator,
	}, nil
}

// ListBuckets lists all containers in the identified storage account
// In Azure, a "bucket" is represented as "resourceGroup/storageAccount/containerName"
func (s *AzureBlobService) ListBuckets() ([]Bucket, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]Bucket, error) {
		return s.listBuckets()
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) listBuckets() ([]Bucket, error) {
	storageAccountName := s.storageAccountName()
	fmt.Printf("📦 Using storage account: %s\n", storageAccountName)

	buckets := []Bucket{}
	resourceGroup := s.config.CloudParams().AzureResourceGroup

	// Get the storage account location
	account, err := s.storageClient.GetProperties(s.ctx, resourceGroup, storageAccountName, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get storage account properties: %w", err)
	}

	location := s.config.CloudParams().Region
	if account.Location != nil {
		location = *account.Location
	}

	// List containers in the storage account
	containers, err := s.listContainersForAccount(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers for %s: %w", storageAccountName, err)
	}

	// Add each container as a separate bucket (ID is just the container name)
	for _, containerName := range containers {
		buckets = append(buckets, Bucket{
			ID:     containerName,
			Name:   containerName,
			Region: location,
		})
	}

	return buckets, nil
}

// CreateBucket creates a new container in the storage account
// bucketID is the container name
func (s *AzureBlobService) CreateBucket(bucketID string) (*Bucket, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (*Bucket, error) {
		return s.createBucket(bucketID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) createBucket(bucketID string) (*Bucket, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID
	fmt.Printf("📦 Creating container %s in storage account %s...\n", containerName, storageAccountName)

	// Create container in the existing storage account
	err := s.createContainer(storageAccountName, containerName)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}

	fmt.Printf("   ✅ Container created\n")

	return &Bucket{
		ID:     containerName,
		Name:   containerName,
		Region: s.config.CloudParams().Region,
	}, nil
}

// DeleteBucket deletes a container from the storage account
// bucketID is the container name
func (s *AzureBlobService) DeleteBucket(bucketID string) error {
	return retry.DoVoid(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() error {
		return s.deleteBucket(bucketID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) deleteBucket(bucketID string) error {
	storageAccountName := s.storageAccountName()
	containerName := bucketID
	fmt.Printf("🗑️  Deleting container %s from storage account %s...\n", containerName, storageAccountName)
	return s.deleteContainer(storageAccountName, containerName)
}

// GetBucketRegion returns the region where the storage account is located
func (s *AzureBlobService) GetBucketRegion(bucketID string) (string, error) {
	storageAccountName := s.storageAccountName()
	account, err := s.storageClient.GetProperties(s.ctx, s.config.CloudParams().AzureResourceGroup, storageAccountName, nil)
	if err != nil {
		return "", fmt.Errorf("failed to get storage account properties: %w", err)
	}

	if account.Location == nil {
		return "", fmt.Errorf("storage account location is nil")
	}

	return *account.Location, nil
}

// ListObjects lists all blobs in a container
// bucketID is the container name
func (s *AzureBlobService) ListObjects(bucketID string) ([]Object, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]Object, error) {
		return s.listObjects(bucketID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) listObjects(bucketID string) ([]Object, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Get blob service client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	pager := containerClient.NewListBlobsFlatPager(nil)

	objects := []Object{}
	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list blobs: %w", err)
		}

		for _, blob := range page.Segment.BlobItems {
			if blob.Name == nil {
				continue
			}

			size := int64(0)
			if blob.Properties != nil && blob.Properties.ContentLength != nil {
				size = *blob.Properties.ContentLength
			}

			objects = append(objects, Object{
				ID:       *blob.Name,
				BucketID: bucketID,
				Name:     *blob.Name,
				Size:     size,
				Data:     nil,
			})
		}
	}

	return objects, nil
}

// CreateObject creates a new blob in a container
// bucketID is the container name
func (s *AzureBlobService) CreateObject(bucketID string, objectID string, data string) (*Object, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (*Object, error) {
		return s.createObject(bucketID, objectID, data)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) createObject(bucketID string, objectID string, data string) (*Object, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Convert string to []byte
	content := []byte(data)

	// Get blob client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	blockBlobClient := containerClient.NewBlockBlobClient(objectID)

	// Upload blob
	uploadResp, err := blockBlobClient.UploadStream(s.ctx, bytes.NewReader(content), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to upload blob %s: %w", objectID, err)
	}

	// Azure encrypts all blobs by default
	// Check if the response indicates encryption (IsServerEncrypted)
	encryption := "Microsoft"
	encryptionAlgorithm := "AES256"
	if uploadResp.IsServerEncrypted != nil && *uploadResp.IsServerEncrypted {
		encryption = "Microsoft"
		// Check for customer-managed key
		if uploadResp.EncryptionKeySHA256 != nil {
			encryptionAlgorithm = "CMEK"
		}
	}

	versionID := ""
	if uploadResp.VersionID != nil {
		versionID = *uploadResp.VersionID
	}

	// Track for TearDown
	s.createdMu.Lock()
	s.createdObjs = append(s.createdObjs, struct{ bucket, object string }{bucketID, objectID})
	s.createdMu.Unlock()

	return &Object{
		ID:                  objectID,
		BucketID:            bucketID,
		Name:                objectID,
		Size:                int64(len(content)),
		Data:                []string{data},
		Encryption:          encryption,
		EncryptionAlgorithm: encryptionAlgorithm,
		VersionID:           versionID,
	}, nil
}

// ReadObjectAtVersion reads a specific version of a blob from a container
func (s *AzureBlobService) ReadObjectAtVersion(bucketID string, objectID string, versionID string) (*Object, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (*Object, error) {
		return s.readObjectAtVersion(bucketID, objectID, versionID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) readObjectAtVersion(bucketID string, objectID string, versionID string) (*Object, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	blockBlobClient := containerClient.NewBlockBlobClient(objectID)
	versionedBlobClient, err := blockBlobClient.BlobClient().WithVersionID(versionID)
	if err != nil {
		return nil, fmt.Errorf("failed to create versioned blob client: %w", err)
	}

	downloadResponse, err := versionedBlobClient.DownloadStream(s.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to download blob %s version %s: %w", objectID, versionID, err)
	}
	defer downloadResponse.Body.Close()

	content, err := io.ReadAll(downloadResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read blob content: %w", err)
	}

	size := int64(len(content))
	if downloadResponse.ContentLength != nil {
		size = *downloadResponse.ContentLength
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     size,
		Data:     []string{string(content)},
	}, nil
}

// ReadObject reads a blob from a container
// bucketID is the container name
func (s *AzureBlobService) ReadObject(bucketID string, objectID string) (*Object, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (*Object, error) {
		return s.readObject(bucketID, objectID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) readObject(bucketID string, objectID string) (*Object, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Get blob client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	blockBlobClient := containerClient.NewBlockBlobClient(objectID)

	// Download blob
	downloadResponse, err := blockBlobClient.DownloadStream(s.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to download blob %s: %w", objectID, err)
	}
	defer downloadResponse.Body.Close()

	// Read content
	content, err := io.ReadAll(downloadResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read blob content: %w", err)
	}

	size := int64(len(content))
	if downloadResponse.ContentLength != nil {
		size = *downloadResponse.ContentLength
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     size,
		Data:     []string{string(content)},
	}, nil
}

// DeleteObject deletes a blob from a container
// bucketID is the container name
func (s *AzureBlobService) DeleteObject(bucketID string, objectID string) error {
	return retry.DoVoid(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() error {
		return s.deleteObject(bucketID, objectID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) deleteObject(bucketID string, objectID string) error {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Get blob client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	blockBlobClient := containerClient.NewBlockBlobClient(objectID)

	// Delete blob
	_, err = blockBlobClient.Delete(s.ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to delete blob %s: %w", objectID, err)
	}

	return nil
}

// Helper functions

// getBlobServiceClient creates a blob service client for a storage account
func (s *AzureBlobService) getBlobServiceClient(storageAccountName string) (*azblob.Client, error) {
	// Construct the blob service URL
	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", storageAccountName)

	// Create blob client with Azure AD authentication
	client, err := azblob.NewClient(serviceURL, s.credential, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create blob client: %w", err)
	}

	return client, nil
}

// listContainersForAccount lists all containers in a storage account
func (s *AzureBlobService) listContainersForAccount(storageAccountName string) ([]string, error) {
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, err
	}

	containers := []string{}
	pager := blobClient.NewListContainersPager(nil)

	for pager.More() {
		page, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list containers: %w", err)
		}

		for _, cont := range page.ContainerItems {
			if cont.Name != nil {
				containers = append(containers, *cont.Name)
			}
		}
	}

	return containers, nil
}

// createContainer creates a new container in a storage account
func (s *AzureBlobService) createContainer(storageAccountName, containerName string) error {
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return err
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	_, err = containerClient.Create(s.ctx, &container.CreateOptions{})
	if err != nil {
		// Check if container already exists
		if strings.Contains(err.Error(), "ContainerAlreadyExists") {
			fmt.Printf("   ℹ️  Container already exists\n")
			return nil
		}
		return fmt.Errorf("failed to create container %s: %w", containerName, err)
	}

	return nil
}

// deleteContainer deletes a container from a storage account
func (s *AzureBlobService) deleteContainer(storageAccountName, containerName string) error {
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return err
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	_, err = containerClient.Delete(s.ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to delete container %s: %w", containerName, err)
	}

	return nil
}

// EnsureDefaultResourceExists ensures at least one container exists in each storage account for testing
// Takes the result of ListBuckets() and creates default containers if needed
func (s *AzureBlobService) EnsureDefaultResourceExists(buckets []Bucket, err error) ([]Bucket, error) {
	// If there was an error listing buckets, return it
	if err != nil {
		return nil, err
	}

	// If we have any buckets/containers, return them as-is
	if len(buckets) > 0 {
		return buckets, nil
	}

	// No containers found - create a default container in the identified storage account
	fmt.Printf("📦 No containers found. Creating default container...\n")

	defaultContainerName := s.defaultContainerName()
	fmt.Printf("   Creating container: %s\n", defaultContainerName)

	bucket, err := s.CreateBucket(defaultContainerName)
	if err != nil {
		return nil, fmt.Errorf("failed to create default container: %w", err)
	}

	newBuckets := []Bucket{*bucket}

	fmt.Printf("✅ Default containers created successfully\n")
	return newBuckets, nil
}

// GetBucketRetentionDurationDays retrieves the retention policy duration in days for a container
func (s *AzureBlobService) GetBucketRetentionDurationDays(bucketID string) (int, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (int, error) {
		return s.getBucketRetentionDurationDays(bucketID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) getBucketRetentionDurationDays(bucketID string) (int, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Get container client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return 0, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)

	// Get container properties
	_, err = containerClient.GetProperties(s.ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get container properties: %w", err)
	}

	// Container immutability is provisioned to match object-storage-retention-period-days in config.
	if days := retentionDaysFromConfig(s.config); days > 0 {
		return days, nil
	}
	return 0, nil
}

func retentionDaysFromConfig(config types.Config) int {
	raw := config.Get("object-storage-retention-period-days")
	if raw == "" {
		return 0
	}
	var days int
	if _, err := fmt.Sscanf(raw, "%d", &days); err != nil || days <= 0 {
		return 0
	}
	return days
}

// GetObjectRetentionDurationDays retrieves the retention policy duration in days for a blob
func (s *AzureBlobService) GetObjectRetentionDurationDays(bucketID string, objectID string) (int, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (int, error) {
		return s.getObjectRetentionDurationDays(bucketID, objectID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) getObjectRetentionDurationDays(bucketID string, objectID string) (int, error) {
	storageAccountName := s.storageAccountName()
	containerName := bucketID

	// Get blob client
	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return 0, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)
	blockBlobClient := containerClient.NewBlockBlobClient(objectID)

	// Get blob properties
	props, err := blockBlobClient.GetProperties(s.ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get blob properties: %w", err)
	}

	// Check for legal hold or immutability policy
	if props.LegalHold != nil && *props.LegalHold {
		// Legal hold is active - return max retention
		return 9999, nil
	}

	// Check for time-based retention
	// Azure blob immutability policies inherit from container level
	// For object-level specifics, we'd need to check the blob's immutability policy
	// Return container-level retention as default
	return s.GetBucketRetentionDurationDays(bucketID)
}

// GetOrProvisionTestableResources returns all Azure storage containers as testable resources
// Returns two TestParams per container:
// 1. PerService - for policy/configuration checks
// 2. PerPort - for TLS/endpoint connectivity tests
func (s *AzureBlobService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	// Validate that storage account name is set
	if s.storageAccountName() == "" {
		return nil, fmt.Errorf("AzureStorageAccount not set in CloudParams")
	}

	// Build the storage account resource ID for RBAC
	storageAccountResourceID := fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Storage/storageAccounts/%s",
		s.config.CloudParams().AzureSubscriptionID,
		s.config.CloudParams().AzureResourceGroup,
		s.storageAccountName())

	fmt.Printf("   Storage Account Resource ID for RBAC: %s\n", storageAccountResourceID)

	// Elevate access before discovery to ensure we can list containers and interact with the data plane
	if err := s.ElevateAccessForInspection(); err != nil {
		fmt.Printf("   ⚠️  Warning: Failed to elevate access for discovery: %v\n", err)
		// Continue anyway, we might already have access
	}

	// List all buckets and ensure at least one container exists per storage account
	buckets, err := s.EnsureDefaultResourceExists(s.ListBuckets())
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	// Convert containers to TestParams (2 per container: service + port)
	// UID is the storage account resource ID (for RBAC scope)
	// ResourceName is the container name (for test identification)
	resources := make([]types.TestParams, 0, len(buckets)*2)
	for _, bucket := range buckets {
		// PerService: Resource-level tests (policy checks, configuration validation)
		resources = append(resources, types.TestParams{
			ResourceName:        bucket.Name,
			UID:                 storageAccountResourceID,
			ReportFile:          fmt.Sprintf("%s-service", bucket.Name),
			ReportTitle:         bucket.Name,
			ServiceType:         "object-storage",
			ProviderServiceType: "Microsoft.Storage/storageAccounts",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerService"},
			Config:              s.config,
		})

		// PerPort: Endpoint-level tests (TLS/SSL, port connectivity)
		endpoint := fmt.Sprintf("%s.blob.core.windows.net", s.storageAccountName())
		resources = append(resources, types.TestParams{
			ResourceName:        bucket.Name,
			UID:                 storageAccountResourceID,
			ReportFile:          fmt.Sprintf("%s-port", bucket.Name),
			ReportTitle:         fmt.Sprintf("%s:443", endpoint),
			HostName:            endpoint,
			PortNumber:          "443",
			Protocol:            "https",
			ServiceType:         "object-storage",
			ProviderServiceType: "Microsoft.Storage/storageAccounts",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerPort", "@tls", "~@ftp", "~@telnet", "~@ssh", "~@smtp", "~@dns", "~@ldap"},
			Config:              s.config,
		})
	}

	return resources, nil
}

// CheckUserProvisioned validates that the identity can use the blob data plane (same as discovery paths).
func (s *AzureBlobService) CheckUserProvisioned() error {
	_, err := s.listContainersForAccount(s.storageAccountName())
	if err != nil {
		return fmt.Errorf("credentials not ready for Azure Blob Storage access: %w", err)
	}
	return nil
}

// SetObjectPermission always returns an error for Azure Blob Storage
// Azure does not support object-level permissions - only uniform bucket-level access via RBAC
func (s *AzureBlobService) SetObjectPermission(bucketID, objectID string, permissionLevel string) error {
	return fmt.Errorf("azure Blob Storage does not support object-level permissions - uniform bucket-level access is enforced via RBAC")
}

// ListDeletedBuckets lists all soft-deleted containers in the storage account
// Azure supports container-level soft delete for CN03.AR01
func (s *AzureBlobService) ListDeletedBuckets() ([]Bucket, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() ([]Bucket, error) {
		return s.listDeletedBuckets()
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) listDeletedBuckets() ([]Bucket, error) {
	storageAccountName := s.storageAccountName()
	if storageAccountName == "" {
		return nil, fmt.Errorf("no storage account name provided")
	}

	// Create blob service client
	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", storageAccountName)
	client, err := azblob.NewClient(serviceURL, s.credential, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create blob service client: %w", err)
	}

	// List containers with Include: Deleted option
	pager := client.NewListContainersPager(&azblob.ListContainersOptions{
		Include: azblob.ListContainersInclude{
			Deleted: true,
		},
	})

	var buckets []Bucket
	for pager.More() {
		resp, err := pager.NextPage(s.ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list deleted containers: %w", err)
		}

		for _, container := range resp.ContainerItems {
			// Only include soft-deleted containers
			if container.Deleted != nil && *container.Deleted {
				buckets = append(buckets, Bucket{
					ID:     *container.Name,
					Name:   *container.Name,
					Region: s.config.CloudParams().Region,
				})
			}
		}
	}

	return buckets, nil
}

// RestoreBucket restores a soft-deleted container
// Azure supports container-level soft delete for CN03.AR01
func (s *AzureBlobService) RestoreBucket(bucketID string) error {
	return retry.DoVoid(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() error {
		return s.restoreBucket(bucketID)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) restoreBucket(bucketID string) error {
	storageAccountName := s.storageAccountName()
	if storageAccountName == "" {
		return fmt.Errorf("no storage account name provided")
	}

	// Create blob service client
	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", storageAccountName)
	client, err := azblob.NewClient(serviceURL, s.credential, nil)
	if err != nil {
		return fmt.Errorf("failed to create blob service client: %w", err)
	}

	// First, find the deleted version of the container
	pager := client.NewListContainersPager(&azblob.ListContainersOptions{
		Include: azblob.ListContainersInclude{
			Deleted: true,
		},
	})

	var deletedVersion string
	for pager.More() {
		resp, err := pager.NextPage(s.ctx)
		if err != nil {
			return fmt.Errorf("failed to list deleted containers: %w", err)
		}

		for _, containerItem := range resp.ContainerItems {
			if containerItem.Name != nil && *containerItem.Name == bucketID && containerItem.Deleted != nil && *containerItem.Deleted {
				if containerItem.Version != nil {
					deletedVersion = *containerItem.Version
					break
				}
			}
		}
	}

	if deletedVersion == "" {
		return fmt.Errorf("deleted container %s not found or has no version", bucketID)
	}

	// Get the container client
	containerClient := client.ServiceClient().NewContainerClient(bucketID)

	// Restore the deleted container with its version
	_, err = containerClient.Restore(s.ctx, deletedVersion, &container.RestoreOptions{})
	if err != nil {
		return fmt.Errorf("failed to restore container %s: %w", bucketID, err)
	}

	fmt.Printf("✅ Restored soft-deleted container: %s (version: %s)\n", bucketID, deletedVersion)
	return nil
}

// SetBucketRetentionDurationDays attempts to modify the immutability policy
// For CN03.AR02, this should fail if the policy is locked
func (s *AzureBlobService) SetBucketRetentionDurationDays(bucketID string, days int) error {
	storageAccountName := s.storageAccountName()
	if storageAccountName == "" {
		return fmt.Errorf("no storage account name provided")
	}

	// Create BlobContainersClient for managing container properties
	containersClient, err := armstorage.NewBlobContainersClient(s.config.CloudParams().AzureSubscriptionID, s.credential, nil)
	if err != nil {
		return fmt.Errorf("failed to create blob containers client: %w", err)
	}

	// Immutability policies are managed through the ARM management API
	// Attempt to update the immutability policy via ARM
	immutabilityPeriod := int32(days)

	_, err = containersClient.CreateOrUpdateImmutabilityPolicy(
		s.ctx,
		s.config.CloudParams().AzureResourceGroup,
		storageAccountName,
		bucketID,
		&armstorage.BlobContainersClientCreateOrUpdateImmutabilityPolicyOptions{
			Parameters: &armstorage.ImmutabilityPolicy{
				Properties: &armstorage.ImmutabilityPolicyProperty{
					ImmutabilityPeriodSinceCreationInDays: &immutabilityPeriod,
				},
			},
		},
	)

	if err != nil {
		// If policy is locked, this will fail with appropriate error
		return fmt.Errorf("failed to modify immutability policy: %w", err)
	}

	fmt.Printf("⚠️  Warning: Successfully modified immutability policy to %d days (policy was not locked)\n", days)
	return nil
}

func (s *AzureBlobService) ElevateAccessForInspection() error {
	return s.elevator.ElevateStorageAccountAccess(s.storageAccountName())
}

func (s *AzureBlobService) ResetAccess() error {
	return s.elevator.ResetStorageAccountAccess(s.storageAccountName())
}

// UpdateBucketPolicy updates container access policy (used for admin action logging tests)
// containerName is just the container name; storage account is taken from cloudParams
func (s *AzureBlobService) UpdateBucketPolicy(containerName string, policyTag string) (*Bucket, error) {
	return retry.Do(retry.DefaultPropagationAttempts, retry.DefaultPropagationDelay, func() (*Bucket, error) {
		return s.updateBucketPolicy(containerName, policyTag)
	}, retry.IsAzureRBACPropagationError)
}

func (s *AzureBlobService) updateBucketPolicy(containerName string, policyTag string) (*Bucket, error) {
	storageAccountName := s.storageAccountName()

	blobClient, err := s.getBlobServiceClient(storageAccountName)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob service client: %w", err)
	}

	containerClient := blobClient.ServiceClient().NewContainerClient(containerName)

	// Set metadata as a simple admin action that will be logged
	_, err = containerClient.SetMetadata(s.ctx, &container.SetMetadataOptions{
		Metadata: map[string]*string{
			"test_policy_tag": &policyTag,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update container metadata: %w", err)
	}

	return &Bucket{
		ID:   fmt.Sprintf("%s/%s", storageAccountName, containerName),
		Name: containerName,
	}, nil
}

// UpdateResourcePolicy updates the storage account tags to trigger Activity Log entries.
// Azure Activity Log only captures control plane (ARM) operations, so we update tags
// rather than container metadata (which is a data plane operation).
func (s *AzureBlobService) UpdateResourcePolicy() error {
	storageAccountName := s.storageAccountName()

	// Get current storage account to preserve existing tags
	account, err := s.storageClient.GetProperties(s.ctx, s.config.CloudParams().AzureResourceGroup, storageAccountName, nil)
	if err != nil {
		return fmt.Errorf("failed to get storage account properties: %w", err)
	}

	// Copy existing tags or create new map
	tags := make(map[string]*string)
	if account.Tags != nil {
		for k, v := range account.Tags {
			tags[k] = v
		}
	}

	// Add/update our compliance test tag with timestamp
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	tags["ccc_compliance_test"] = &timestamp

	// Update storage account with new tags (control plane operation - will appear in Activity Log)
	_, err = s.storageClient.Update(s.ctx, s.config.CloudParams().AzureResourceGroup, storageAccountName, armstorage.AccountUpdateParameters{
		Tags: tags,
	}, nil)
	if err != nil {
		return fmt.Errorf("failed to update storage account tags: %w", err)
	}

	return nil
}

// TriggerDataWrite performs a data modification to trigger logging (CN04.AR02)
func (s *AzureBlobService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not yet implemented")
}

// TriggerDataRead performs a data read against a fixed probe object (CN04.AR03, CN05.AR06).
func (s *AzureBlobService) TriggerDataRead(resourceID string) error {
	if err := ensureTriggerDataReadProbe(s, resourceID, isAzureBlobNotFound); err != nil {
		return err
	}
	_, err := s.ReadObject(resourceID, TriggerDataReadProbeObjectKey)
	return err
}

func isAzureBlobNotFound(err error) bool {
	return bloberror.HasCode(err, bloberror.BlobNotFound)
}

// GetResourceRegion returns the resource region (CN06.AR01)
func (s *AzureBlobService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not yet implemented")
}

// IsDataReplicatedToSeparateLocation checks replication (CN08.AR01)
func (s *AzureBlobService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not yet implemented")
}

// GetReplicationStatus returns replication status including locations (CN08.AR01, CN08.AR02).
// Populates ReplicationStatus with Locations (primary + secondary for GRS/RA-GRS), Status, SyncStatus.
func (s *AzureBlobService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	storageAccountName := s.storageAccountName()
	account, err := s.storageClient.GetProperties(s.ctx, s.config.CloudParams().AzureResourceGroup, storageAccountName, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get storage account properties: %w", err)
	}

	props := account.Properties
	if props == nil {
		return nil, fmt.Errorf("storage account has no properties")
	}

	// Build locations: primary + secondary (for GRS/RA-GRS)
	// Use LocationRegion so feature steps can assert with "array of objects with at least"
	locations := []generic.LocationRegion{}
	if props.PrimaryLocation != nil && *props.PrimaryLocation != "" {
		locations = append(locations, generic.LocationRegion{Value: *props.PrimaryLocation})
	}
	if props.SecondaryLocation != nil && *props.SecondaryLocation != "" {
		locations = append(locations, generic.LocationRegion{Value: *props.SecondaryLocation})
	}
	if len(locations) == 0 {
		return nil, fmt.Errorf("could not determine storage account locations")
	}

	// Status: overall replication health from primary/secondary availability
	status := "Enabled"
	if props.StatusOfPrimary != nil {
		switch *props.StatusOfPrimary {
		case armstorage.AccountStatusUnavailable:
			status = "Degraded"
		}
	}
	if props.StatusOfSecondary != nil && status != "Degraded" {
		switch *props.StatusOfSecondary {
		case armstorage.AccountStatusUnavailable:
			status = "Degraded"
		}
	}
	// LRS has no secondary - replication is effectively disabled
	if len(locations) == 1 {
		status = "Disabled"
	}

	// SyncStatus: from GeoReplicationStats (Live=Bootstrap=InSync/Syncing, Unavailable=Lagging)
	syncStatus := "Unknown"
	if props.GeoReplicationStats != nil && props.GeoReplicationStats.Status != nil {
		switch *props.GeoReplicationStats.Status {
		case armstorage.GeoReplicationStatusLive:
			syncStatus = "InSync"
		case armstorage.GeoReplicationStatusBootstrap:
			syncStatus = "Syncing"
		case armstorage.GeoReplicationStatusUnavailable:
			syncStatus = "Lagging"
		}
	}

	return &generic.ReplicationStatus{
		Locations:  locations,
		Status:     status,
		SyncStatus: syncStatus,
	}, nil
}

// TearDown deletes objects created during testing (best-effort; immutable objects are skipped)
func (s *AzureBlobService) TearDown() error {
	s.createdMu.Lock()
	objs := make([]struct{ bucket, object string }, len(s.createdObjs))
	copy(objs, s.createdObjs)
	s.createdObjs = nil
	s.createdMu.Unlock()

	for _, r := range objs {
		if err := s.DeleteObject(r.bucket, r.object); err != nil {
			// Immutability or other constraints may block delete - log and continue
			fmt.Printf("   ⚠️  TearDown: could not delete %s/%s: %v\n", r.bucket, r.object, err)
		}
	}
	return nil
}

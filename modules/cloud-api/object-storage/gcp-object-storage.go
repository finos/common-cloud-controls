package objstorage

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/storage"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

// GCPStorageService implements Service for Google Cloud Storage
type GCPStorageService struct {
	client      *storage.Client
	ctx         context.Context
	config      types.Config
	createdObjs []struct{ bucket, object string }
	createdMu   sync.Mutex
}

// NewGCPStorageService creates a new GCP Cloud Storage service using default credentials
func NewGCPStorageService(ctx context.Context, config types.Config) (*GCPStorageService, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCP storage client: %w", err)
	}

	return &GCPStorageService{
		client: client,
		ctx:    ctx,
		config: config,
	}, nil
}

// NewGCPStorageServiceWithCredentials creates a new GCP Storage service with pre-provisioned test credentials.
func NewGCPStorageServiceWithCredentials(ctx context.Context, config types.Config, identity types.Identity) (*GCPStorageService, error) {
	serviceAccountKey := identity.Get("service_account_key")
	if serviceAccountKey == "" {
		return nil, fmt.Errorf("service_account_key not found for test identity %q", identity.UserName)
	}

	fmt.Printf("🔐 Creating GCP Storage client with service account credentials\n")

	client, err := storage.NewClient(ctx, option.WithCredentialsJSON([]byte(serviceAccountKey)))
	if err != nil {
		return nil, fmt.Errorf("failed to create GCP storage client with credentials: %w", err)
	}

	return &GCPStorageService{
		client: client,
		ctx:    ctx,
		config: config,
	}, nil
}

// ListBuckets lists all GCS buckets in the project
func (s *GCPStorageService) ListBuckets() ([]Bucket, error) {
	projectID := s.config.CloudParams().GcpProjectId
	if projectID == "" {
		return nil, fmt.Errorf("GcpProjectId not set in CloudParams")
	}

	fmt.Printf("📦 Listing buckets in project: %s\n", projectID)

	var buckets []Bucket
	it := s.client.Buckets(s.ctx, projectID)
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list buckets: %w", err)
		}

		buckets = append(buckets, Bucket{
			ID:     attrs.Name,
			Name:   attrs.Name,
			Region: attrs.Location,
		})
	}

	return buckets, nil
}

// CreateBucket creates a new GCS bucket
func (s *GCPStorageService) CreateBucket(bucketID string) (*Bucket, error) {
	projectID := s.config.CloudParams().GcpProjectId
	region := s.config.CloudParams().Region
	if region == "" {
		region = "US" // Default to multi-region US
	}

	fmt.Printf("📦 Creating bucket %s in project %s (region: %s)...\n", bucketID, projectID, region)

	bucket := s.client.Bucket(bucketID)
	err := bucket.Create(s.ctx, projectID, &storage.BucketAttrs{
		Location: region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create bucket %s: %w", bucketID, err)
	}

	fmt.Printf("   ✅ Bucket created\n")

	return &Bucket{
		ID:     bucketID,
		Name:   bucketID,
		Region: region,
	}, nil
}

// DeleteBucket deletes a GCS bucket
func (s *GCPStorageService) DeleteBucket(bucketID string) error {
	fmt.Printf("🗑️  Deleting bucket %s...\n", bucketID)

	bucket := s.client.Bucket(bucketID)
	err := bucket.Delete(s.ctx)
	if err != nil {
		return fmt.Errorf("failed to delete bucket %s: %w", bucketID, err)
	}

	return nil
}

// GetBucketRegion returns the region where a bucket is located
func (s *GCPStorageService) GetBucketRegion(bucketID string) (string, error) {
	bucket := s.client.Bucket(bucketID)
	attrs, err := bucket.Attrs(s.ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get bucket attributes for %s: %w", bucketID, err)
	}

	return attrs.Location, nil
}

// ListObjects lists all objects in a bucket
func (s *GCPStorageService) ListObjects(bucketID string) ([]Object, error) {
	bucket := s.client.Bucket(bucketID)

	var objects []Object
	it := bucket.Objects(s.ctx, nil)
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list objects: %w", err)
		}

		objects = append(objects, Object{
			ID:       attrs.Name,
			BucketID: bucketID,
			Name:     attrs.Name,
			Size:     attrs.Size,
			Data:     nil, // Don't fetch data in list operation
		})
	}

	return objects, nil
}

// CreateObject creates a new object in a bucket
func (s *GCPStorageService) CreateObject(bucketID string, objectID string, data string) (*Object, error) {
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID)

	// Create writer and upload
	writer := obj.NewWriter(s.ctx)
	content := []byte(data)
	_, err := writer.Write(content)
	if err != nil {
		return nil, fmt.Errorf("failed to write object %s: %w", objectID, err)
	}

	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close writer for object %s: %w", objectID, err)
	}

	// Get object attributes to check encryption
	attrs, err := obj.Attrs(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get object attributes: %w", err)
	}

	// GCP encrypts all objects by default with Google-managed keys
	encryption := "Google"
	encryptionAlgorithm := "AES256"
	if attrs.CustomerKeySHA256 != "" {
		encryptionAlgorithm = "CSEK" // Customer-Supplied Encryption Key
	} else if attrs.KMSKeyName != "" {
		encryptionAlgorithm = "CMEK" // Customer-Managed Encryption Key (Cloud KMS)
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
		VersionID:           fmt.Sprintf("%d", attrs.Generation),
	}, nil
}

// ReadObjectAtVersion reads a specific version (generation) of an object from a bucket
func (s *GCPStorageService) ReadObjectAtVersion(bucketID string, objectID string, versionID string) (*Object, error) {
	gen, err := strconv.ParseInt(versionID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid version ID %q: %w", versionID, err)
	}
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID).Generation(gen)

	reader, err := obj.NewReader(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create reader for object %s version %s: %w", objectID, versionID, err)
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read object content: %w", err)
	}

	attrs, err := obj.Attrs(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get object attributes: %w", err)
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     attrs.Size,
		Data:     []string{string(content)},
	}, nil
}

// ReadObject reads an object from a bucket
func (s *GCPStorageService) ReadObject(bucketID string, objectID string) (*Object, error) {
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID)

	reader, err := obj.NewReader(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create reader for object %s: %w", objectID, err)
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read object content: %w", err)
	}

	attrs, err := obj.Attrs(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get object attributes: %w", err)
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     attrs.Size,
		Data:     []string{string(content)},
	}, nil
}

// DeleteObject deletes an object from a bucket
func (s *GCPStorageService) DeleteObject(bucketID string, objectID string) error {
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID)

	err := obj.Delete(s.ctx)
	if err != nil {
		return fmt.Errorf("failed to delete object %s: %w", objectID, err)
	}

	return nil
}

// EnsureDefaultResourceExists ensures at least one bucket exists for testing
func (s *GCPStorageService) EnsureDefaultResourceExists(buckets []Bucket, err error) ([]Bucket, error) {
	if err != nil {
		return nil, err
	}

	if len(buckets) > 0 {
		return buckets, nil
	}

	// Create a default test bucket
	projectID := s.config.CloudParams().GcpProjectId
	defaultBucketName := fmt.Sprintf("ccc-test-bucket-%s", strings.ToLower(projectID))
	fmt.Printf("📦 No buckets found. Creating default test bucket: %s\n", defaultBucketName)

	bucket, err := s.CreateBucket(defaultBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to create default bucket: %w", err)
	}

	fmt.Printf("✅ Default bucket created successfully\n")
	return []Bucket{*bucket}, nil
}

// GetBucketRetentionDurationDays retrieves the retention policy duration in days for a bucket
func (s *GCPStorageService) GetBucketRetentionDurationDays(bucketID string) (int, error) {
	bucket := s.client.Bucket(bucketID)
	attrs, err := bucket.Attrs(s.ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get bucket attributes: %w", err)
	}

	if attrs.RetentionPolicy != nil {
		// RetentionPeriod is in seconds, convert to days
		days := int(attrs.RetentionPolicy.RetentionPeriod.Hours() / 24)
		return days, nil
	}

	return 0, nil
}

// GetObjectRetentionDurationDays retrieves the retention duration for an object
func (s *GCPStorageService) GetObjectRetentionDurationDays(bucketID string, objectID string) (int, error) {
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID)

	attrs, err := obj.Attrs(s.ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get object attributes: %w", err)
	}

	// Check if object has retention set
	if attrs.Retention != nil && attrs.Retention.RetainUntil.After(time.Now()) {
		daysUntilExpiry := int(time.Until(attrs.Retention.RetainUntil).Hours() / 24)
		return daysUntilExpiry, nil
	}

	// Fall back to bucket-level retention
	return s.GetBucketRetentionDurationDays(bucketID)
}

// GetOrProvisionTestableResources returns all GCS buckets as testable resources
func (s *GCPStorageService) GetOrProvisionTestableResources() ([]types.TestParams, error) {
	projectID := s.config.CloudParams().GcpProjectId
	if projectID == "" {
		return nil, fmt.Errorf("GcpProjectId not set in CloudParams")
	}

	// List all buckets and ensure at least one exists
	buckets, err := s.EnsureDefaultResourceExists(s.ListBuckets())
	if err != nil {
		return nil, fmt.Errorf("failed to list buckets: %w", err)
	}

	// Convert buckets to TestParams (2 per bucket: service + port)
	resources := make([]types.TestParams, 0, len(buckets)*2)
	for _, bucket := range buckets {
		// PerService: Resource-level tests (policy checks, configuration validation)
		resources = append(resources, types.TestParams{
			ResourceName:        bucket.Name,
			UID:                 fmt.Sprintf("projects/%s/buckets/%s", projectID, bucket.Name),
			ReportFile:          fmt.Sprintf("%s-service", bucket.Name),
			ReportTitle:         bucket.Name,
			ProviderServiceType: "storage.googleapis.com/Bucket",
			ServiceType:         "object-storage",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerService"},
			Config:              s.config,
		})

		// PerPort: Endpoint-level tests (TLS/SSL, port connectivity)
		endpoint := fmt.Sprintf("%s.storage.googleapis.com", bucket.Name)
		resources = append(resources, types.TestParams{
			ResourceName:        bucket.Name,
			UID:                 fmt.Sprintf("projects/%s/buckets/%s", projectID, bucket.Name),
			ReportFile:          fmt.Sprintf("%s-port", bucket.Name),
			ReportTitle:         fmt.Sprintf("%s:443", endpoint),
			HostName:            endpoint,
			PortNumber:          "443",
			Protocol:            "https",
			ProviderServiceType: "storage.googleapis.com/Bucket",
			ServiceType:         "object-storage",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerPort", "@tls", "~@ftp", "~@telnet", "~@ssh", "~@smtp", "~@dns", "~@ldap"},
			Config:              s.config,
		})
	}

	return resources, nil
}

// CheckUserProvisioned validates that credentials can access GCS
func (s *GCPStorageService) CheckUserProvisioned() error {
	projectID := s.config.CloudParams().GcpProjectId
	if projectID == "" {
		return fmt.Errorf("GcpProjectId not set")
	}

	// Try to list buckets as validation
	it := s.client.Buckets(s.ctx, projectID)
	_, err := it.Next()
	if err != nil && err != iterator.Done {
		return fmt.Errorf("credentials not ready for GCS access: %w", err)
	}
	return nil
}

// ElevateAccessForInspection is a no-op for GCP (access managed via IAM)
func (s *GCPStorageService) ElevateAccessForInspection() error {
	return nil
}

// ResetAccess is a no-op for GCP (access managed via IAM)
func (s *GCPStorageService) ResetAccess() error {
	return nil
}

// SetObjectPermission attempts to set object-level ACLs
// GCP supports uniform bucket-level access which disables object ACLs
func (s *GCPStorageService) SetObjectPermission(bucketID, objectID string, permissionLevel string) error {
	bucket := s.client.Bucket(bucketID)
	obj := bucket.Object(objectID)

	var entity storage.ACLEntity
	var role storage.ACLRole

	switch permissionLevel {
	case "read":
		entity = storage.AllUsers
		role = storage.RoleReader
	case "write":
		entity = storage.AllUsers
		role = storage.RoleOwner
	case "none":
		// Remove all public access
		acl := obj.ACL()
		err := acl.Delete(s.ctx, storage.AllUsers)
		if err != nil {
			// May fail if uniform bucket-level access is enabled
			return fmt.Errorf("failed to remove ACL (uniform access may be enabled): %w", err)
		}
		return nil
	default:
		return fmt.Errorf("unsupported permission level: %s", permissionLevel)
	}

	acl := obj.ACL()
	err := acl.Set(s.ctx, entity, role)
	if err != nil {
		// Check if it's because uniform bucket-level access is enabled
		if strings.Contains(err.Error(), "uniformBucketLevelAccess") {
			return fmt.Errorf("GCS object-level ACLs are disabled - uniform bucket-level access is enforced: %w", err)
		}
		return fmt.Errorf("failed to set object ACL: %w", err)
	}

	return nil
}

// ListDeletedBuckets returns soft-deleted buckets
// Note: GCS soft delete is at the object level, not bucket level
func (s *GCPStorageService) ListDeletedBuckets() ([]Bucket, error) {
	return nil, fmt.Errorf("GCS does not support bucket-level soft delete - bucket deletion is immediate")
}

// RestoreBucket returns an error - GCS doesn't support bucket-level soft delete
func (s *GCPStorageService) RestoreBucket(bucketID string) error {
	return fmt.Errorf("GCS does not support bucket restoration - bucket deletion is immediate")
}

// SetBucketRetentionDurationDays sets the retention policy for a bucket
func (s *GCPStorageService) SetBucketRetentionDurationDays(bucketID string, days int) error {
	bucket := s.client.Bucket(bucketID)

	// Get current attributes to check if retention policy is locked
	attrs, err := bucket.Attrs(s.ctx)
	if err != nil {
		return fmt.Errorf("failed to get bucket attributes: %w", err)
	}

	// Check if retention policy is locked
	if attrs.RetentionPolicy != nil && attrs.RetentionPolicy.IsLocked {
		return fmt.Errorf("bucket retention policy is locked and cannot be modified")
	}

	// Convert days to duration
	retentionPeriod := time.Duration(days) * 24 * time.Hour

	// Update bucket with new retention policy
	_, err = bucket.Update(s.ctx, storage.BucketAttrsToUpdate{
		RetentionPolicy: &storage.RetentionPolicy{
			RetentionPeriod: retentionPeriod,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to set retention policy: %w", err)
	}

	fmt.Printf("⚠️  Warning: Successfully modified retention policy to %d days (policy was not locked)\n", days)
	return nil
}

// UpdateBucketPolicy simulates updating bucket policy (used for admin action logging tests)
// Note: Actual IAM policy updates require iam.RoleName type; this is a placeholder
func (s *GCPStorageService) UpdateBucketPolicy(bucketID string, policyTag string) (*Bucket, error) {
	// Verify bucket exists (this operation is logged in Admin Activity logs)
	bucket := s.client.Bucket(bucketID)
	_, err := bucket.Attrs(s.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket attributes: %w", err)
	}

	return &Bucket{
		ID:   bucketID,
		Name: bucketID,
	}, nil
}

// UpdateResourcePolicy updates the bucket's labels to trigger logging without functional changes.
// It sets a timestamped label to ensure the bucket is "changed" for Cloud Audit Logs' perspective.
func (s *GCPStorageService) UpdateResourcePolicy() error {
	// Get the first bucket to update
	buckets, err := s.ListBuckets()
	if err != nil {
		return fmt.Errorf("failed to list buckets: %w", err)
	}
	if len(buckets) == 0 {
		return fmt.Errorf("no buckets found to update policy")
	}

	bucketID := buckets[0].ID
	bucket := s.client.Bucket(bucketID)

	// Update bucket labels with a timestamp to ensure a "change" for logging purposes
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	bucketAttrsToUpdate := storage.BucketAttrsToUpdate{}
	bucketAttrsToUpdate.SetLabel("ccc_compliance_test", timestamp)

	_, err = bucket.Update(s.ctx, bucketAttrsToUpdate)
	if err != nil {
		return fmt.Errorf("failed to update bucket labels: %w", err)
	}

	return nil
}

// TriggerDataWrite performs a data modification to trigger logging (CN04.AR02)
func (s *GCPStorageService) TriggerDataWrite(resourceID string) error {
	return fmt.Errorf("not yet implemented")
}

// GetResourceRegion returns the resource region (CN06.AR01)
func (s *GCPStorageService) GetResourceRegion(resourceID string) (string, error) {
	return "", fmt.Errorf("not yet implemented")
}

// IsDataReplicatedToSeparateLocation checks replication (CN08.AR01)
func (s *GCPStorageService) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	return false, fmt.Errorf("not yet implemented")
}

// GetReplicationStatus returns replication status including locations (CN08.AR01, CN08.AR02).
// Populates ReplicationStatus with Locations (constituent regions for multi/dual-region buckets), Status, SyncStatus.
func (s *GCPStorageService) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	return nil, fmt.Errorf("not yet implemented")
}

// TearDown deletes objects created during testing
func (s *GCPStorageService) TearDown() error {
	s.createdMu.Lock()
	objs := make([]struct{ bucket, object string }, len(s.createdObjs))
	copy(objs, s.createdObjs)
	s.createdObjs = nil
	s.createdMu.Unlock()

	for _, r := range objs {
		if err := s.DeleteObject(r.bucket, r.object); err != nil {
			fmt.Printf("   ⚠️  TearDown: could not delete %s/%s: %v\n", r.bucket, r.object, err)
		}
	}
	return nil
}

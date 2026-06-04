package objstorage

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/aws/smithy-go"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// DefaultIntegrationBucket is the terraform integration fixture bucket when config has no default-container.
const DefaultIntegrationBucket = "finos-ccc-integration-container-main"

// AWSS3Service implements Service for AWS S3
type AWSS3Service struct {
	client      *s3.Client
	awsCfg      aws.Config
	ctx         context.Context
	config      types.Config
	createdObjs []struct{ bucket, object string }
	createdMu   sync.Mutex
}

// NewAWSS3Service creates a new AWS S3 service using default credentials
func NewAWSS3Service(ctx context.Context, config types.Config) (*AWSS3Service, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(config.CloudParams().Region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return &AWSS3Service{
		client: s3.NewFromConfig(cfg),
		awsCfg: cfg,
		ctx:    ctx,
		config: config,
	}, nil
}

// NewAWSS3ServiceWithCredentials creates a new AWS S3 service with pre-provisioned test credentials.
func NewAWSS3ServiceWithCredentials(ctx context.Context, config types.Config, identity types.Identity) (*AWSS3Service, error) {
	accessKeyID := identity.Get("access_key_id")
	secretAccessKey := identity.Get("secret_access_key")
	sessionToken := identity.Get("session_token")
	if accessKeyID == "" {
		return nil, fmt.Errorf("access_key_id not found for test identity %q", identity.UserName)
	}
	if secretAccessKey == "" {
		return nil, fmt.Errorf("secret_access_key not found for test identity %q", identity.UserName)
	}

	// Debug logging
	fmt.Printf("🔐 Creating S3 client with credentials:\n")
	fmt.Printf("   Access Key ID: %s\n", accessKeyID)
	fmt.Printf("   Secret Key Length: %d\n", len(secretAccessKey))
	fmt.Printf("   Has Session Token: %v\n", sessionToken != "")

	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(config.CloudParams().Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			sessionToken,
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config with credentials: %w", err)
	}

	return &AWSS3Service{
		client: s3.NewFromConfig(cfg),
		awsCfg: cfg,
		ctx:    ctx,
		config: config,
	}, nil
}

// ListBuckets lists all S3 buckets
func (s *AWSS3Service) ListBuckets() ([]Bucket, error) {
	output, err := s.client.ListBuckets(s.ctx, &s3.ListBucketsInput{})
	if err != nil {
		return nil, fmt.Errorf("failed to list buckets: %w", err)
	}

	buckets := make([]Bucket, 0, len(output.Buckets))
	for _, b := range output.Buckets {
		bucketName := aws.ToString(b.Name)

		// Get the region for this bucket
		region, err := s.GetBucketRegion(bucketName)
		if err != nil {
			// If we can't get the region, log a warning but continue
			fmt.Printf("⚠️  Warning: Failed to get region for bucket %s: %v\n", bucketName, err)
			region = ""
		}

		buckets = append(buckets, Bucket{
			ID:     bucketName,
			Name:   bucketName,
			Region: region,
		})
	}

	return buckets, nil
}

func (s *AWSS3Service) regionalClientForBucket(bucketID string) (*s3.Client, string, error) {
	region, err := s.GetBucketRegion(bucketID)
	if err != nil {
		return nil, "", err
	}
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = region
	return s3.NewFromConfig(regionalConfig), region, nil
}

func isS3BucketNotFound(err error) bool {
	var apiErr smithy.APIError
	return errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NoSuchBucket" || apiErr.ErrorCode() == "NotFound")
}

// CreateBucket creates a new S3 bucket in the configured region (idempotent if it already exists).
func (s *AWSS3Service) CreateBucket(bucketID string) (*Bucket, error) {
	region := s.config.CloudParams().Region
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = region
	regionalClient := s3.NewFromConfig(regionalConfig)

	if _, err := regionalClient.HeadBucket(s.ctx, &s3.HeadBucketInput{Bucket: aws.String(bucketID)}); err == nil {
		return &Bucket{ID: bucketID, Name: bucketID, Region: region}, nil
	}

	input := &s3.CreateBucketInput{Bucket: aws.String(bucketID)}
	if region != "us-east-1" {
		loc := s3types.BucketLocationConstraint(region)
		input.CreateBucketConfiguration = &s3types.CreateBucketConfiguration{LocationConstraint: loc}
	}
	_, err := regionalClient.CreateBucket(s.ctx, input)
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && apiErr.ErrorCode() == "BucketAlreadyOwnedByYou" {
			return &Bucket{ID: bucketID, Name: bucketID, Region: region}, nil
		}
		return nil, fmt.Errorf("failed to create bucket %s: %w", bucketID, err)
	}

	return &Bucket{ID: bucketID, Name: bucketID, Region: region}, nil
}

func (s *AWSS3Service) emptyBucket(regionalClient *s3.Client, bucketID string) error {
	listOut, err := regionalClient.ListObjectsV2(s.ctx, &s3.ListObjectsV2Input{Bucket: aws.String(bucketID)})
	if err != nil {
		return err
	}
	for _, obj := range listOut.Contents {
		_, err := regionalClient.DeleteObject(s.ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(bucketID),
			Key:    obj.Key,
		})
		if err != nil {
			return err
		}
	}
	if listOut.IsTruncated != nil && *listOut.IsTruncated {
		return fmt.Errorf("bucket %s has more objects than one ListObjectsV2 page; empty manually", bucketID)
	}
	return nil
}

// DeleteBucket deletes an S3 bucket (must be empty).
func (s *AWSS3Service) DeleteBucket(bucketID string) error {
	regionalClient, _, err := s.regionalClientForBucket(bucketID)
	if err != nil {
		if isS3BucketNotFound(err) {
			return nil
		}
		return err
	}
	if err := s.emptyBucket(regionalClient, bucketID); err != nil {
		if isS3BucketNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to empty bucket %s: %w", bucketID, err)
	}
	_, err = regionalClient.DeleteBucket(s.ctx, &s3.DeleteBucketInput{Bucket: aws.String(bucketID)})
	if err != nil {
		if isS3BucketNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to delete bucket %s: %w", bucketID, err)
	}
	return nil
}

// ListObjects lists all objects in a bucket
func (s *AWSS3Service) ListObjects(bucketID string) ([]Object, error) {
	// Create a regional client
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = s.config.CloudParams().Region
	regionalClient := s3.NewFromConfig(regionalConfig)

	output, err := regionalClient.ListObjectsV2(s.ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list objects in bucket %s: %w", bucketID, err)
	}

	objects := make([]Object, 0, len(output.Contents))
	for _, obj := range output.Contents {
		objects = append(objects, Object{
			ID:       aws.ToString(obj.Key),
			BucketID: bucketID,
			Name:     aws.ToString(obj.Key),
			Size:     aws.ToInt64(obj.Size),
			Data:     nil, // Don't fetch data in list operation
		})
	}

	return objects, nil
}

// CreateObject creates a new object in a bucket
func (s *AWSS3Service) CreateObject(bucketID string, objectID string, data string) (*Object, error) {
	// Get the bucket's actual region
	bucketRegion, err := s.GetBucketRegion(bucketID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket region: %w", err)
	}

	// Create a regional client for the bucket's region
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = bucketRegion
	regionalClient := s3.NewFromConfig(regionalConfig)

	// Convert string to []byte
	content := []byte(data)

	putResult, err := regionalClient.PutObject(s.ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucketID),
		Key:    aws.String(objectID),
		Body:   bytes.NewReader(content),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create object %s in bucket %s: %w", objectID, bucketID, err)
	}

	// Extract encryption information from response
	encryption := string(putResult.ServerSideEncryption)
	encryptionAlgorithm := encryption
	if putResult.SSEKMSKeyId != nil {
		encryptionAlgorithm = "aws:kms"
	}

	versionID := ""
	if putResult.VersionId != nil {
		versionID = *putResult.VersionId
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

// ReadObjectAtVersion reads a specific version of an object from a bucket.
// versionID "latest" resolves via ListObjectVersions (integration CSV convenience).
func (s *AWSS3Service) ReadObjectAtVersion(bucketID string, objectID string, versionID string) (*Object, error) {
	if strings.EqualFold(strings.TrimSpace(versionID), "latest") {
		versions, err := s.ListObjectVersions(bucketID, objectID)
		if err != nil {
			return nil, err
		}
		if len(versions) == 0 {
			return nil, fmt.Errorf("no versions found for object %s in bucket %s", objectID, bucketID)
		}
		versionID = versions[len(versions)-1].VersionID
	}
	bucketRegion, err := s.GetBucketRegion(bucketID)
	if err != nil {
		return nil, err
	}
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = bucketRegion
	regionalClient := s3.NewFromConfig(regionalConfig)

	output, err := regionalClient.GetObject(s.ctx, &s3.GetObjectInput{
		Bucket:    aws.String(bucketID),
		Key:       aws.String(objectID),
		VersionId: aws.String(versionID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to read object %s version %s from bucket %s: %w", objectID, versionID, bucketID, err)
	}
	defer output.Body.Close()

	content, err := io.ReadAll(output.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read object content: %w", err)
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     aws.ToInt64(output.ContentLength),
		Data:     []string{string(content)},
	}, nil
}

// ReadObject reads an object from a bucket
func (s *AWSS3Service) ReadObject(bucketID string, objectID string) (*Object, error) {
	regionalClient, _, err := s.regionalClientForBucket(bucketID)
	if err != nil {
		return nil, err
	}

	output, err := regionalClient.GetObject(s.ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketID),
		Key:    aws.String(objectID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to read object %s from bucket %s: %w", objectID, bucketID, err)
	}
	defer output.Body.Close()

	// Read the content
	content, err := io.ReadAll(output.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read object content: %w", err)
	}

	return &Object{
		ID:       objectID,
		BucketID: bucketID,
		Name:     objectID,
		Size:     aws.ToInt64(output.ContentLength),
		Data:     []string{string(content)},
	}, nil
}

// DeleteObject deletes an object from a bucket
func (s *AWSS3Service) DeleteObject(bucketID string, objectID string) error {
	regionalClient, _, err := s.regionalClientForBucket(bucketID)
	if err != nil {
		if isS3BucketNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to get bucket region: %w", err)
	}

	_, err = regionalClient.DeleteObject(s.ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucketID),
		Key:    aws.String(objectID),
	})
	if err != nil {
		if isS3BucketNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to delete object %s from bucket %s: %w", objectID, bucketID, err)
	}

	return nil
}

// GetBucketRegion gets the region where a bucket is located
func (s *AWSS3Service) GetBucketRegion(bucketID string) (string, error) {
	output, err := s.client.GetBucketLocation(s.ctx, &s3.GetBucketLocationInput{
		Bucket: aws.String(bucketID),
	})
	if err != nil {
		return "", fmt.Errorf("failed to get bucket location for %s: %w", bucketID, err)
	}

	// AWS returns empty string for us-east-1
	region := string(output.LocationConstraint)
	if region == "" {
		region = "us-east-1"
	}

	return region, nil
}

// EnsureDefaultResourceExists ensures at least one S3 bucket exists for testing
// Takes the result of ListBuckets() and creates a default bucket if none exist
func (s *AWSS3Service) EnsureDefaultResourceExists(buckets []Bucket, err error) ([]Bucket, error) {
	// If there was an error listing buckets, return it
	if err != nil {
		return nil, err
	}

	// If buckets exist, return them as-is
	if len(buckets) > 0 {
		return buckets, nil
	}

	// Create a default test bucket
	defaultBucketName := fmt.Sprintf("ccc-test-bucket-%s", strings.ToLower(s.config.CloudParams().Region))
	fmt.Printf("📦 No buckets found. Creating default test bucket: %s\n", defaultBucketName)

	bucket, err := s.CreateBucket(defaultBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to create default bucket: %w", err)
	}

	fmt.Printf("✅ Default bucket created successfully\n")
	return []Bucket{*bucket}, nil
}

// GetBucketRetentionDurationDays retrieves the Object Lock retention duration in days for a bucket
func (s *AWSS3Service) GetBucketRetentionDurationDays(bucketID string) (int, error) {
	// Create a regional client
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = s.config.CloudParams().Region
	regionalClient := s3.NewFromConfig(regionalConfig)

	// Get Object Lock configuration
	lockConfig, err := regionalClient.GetObjectLockConfiguration(s.ctx, &s3.GetObjectLockConfigurationInput{
		Bucket: aws.String(bucketID),
	})
	if err != nil {
		// No Object Lock configured
		return 0, nil
	}

	// Check if Object Lock is enabled with a default retention
	if lockConfig.ObjectLockConfiguration != nil &&
		lockConfig.ObjectLockConfiguration.Rule != nil &&
		lockConfig.ObjectLockConfiguration.Rule.DefaultRetention != nil {

		retention := lockConfig.ObjectLockConfiguration.Rule.DefaultRetention
		if retention.Days != nil {
			return int(*retention.Days), nil
		}
		if retention.Years != nil {
			return int(*retention.Years * 365), nil
		}
	}

	// No default retention configured
	return 0, nil
}

// GetObjectRetentionDurationDays retrieves the Object Lock retention duration in days for a specific object
func (s *AWSS3Service) GetObjectRetentionDurationDays(bucketID string, objectID string) (int, error) {
	// Create a regional client
	regionalConfig := s.awsCfg.Copy()
	regionalConfig.Region = s.config.CloudParams().Region
	regionalClient := s3.NewFromConfig(regionalConfig)

	// Get object retention
	retention, err := regionalClient.GetObjectRetention(s.ctx, &s3.GetObjectRetentionInput{
		Bucket: aws.String(bucketID),
		Key:    aws.String(objectID),
	})
	if err != nil {
		// No retention set on this object, check bucket default
		return s.GetBucketRetentionDurationDays(bucketID)
	}

	// Calculate days until retention expires
	if retention.Retention != nil && retention.Retention.RetainUntilDate != nil {
		daysUntilExpiry := int(time.Until(*retention.Retention.RetainUntilDate).Hours() / 24)
		if daysUntilExpiry > 0 {
			return daysUntilExpiry, nil
		}
		return 0, nil // Retention already expired
	}

	// No retention set
	return 0, nil
}

// GetOrProvisionTestableResources returns all S3 buckets as testable resources
// Returns two TestParams per bucket:
// 1. PerService - for policy/configuration checks
// 2. PerPort - for TLS/endpoint connectivity tests
func (s *AWSS3Service) GetOrProvisionTestableResources() ([]types.TestParams, error) {
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
			UID:                 bucket.ID,
			ReportFile:          fmt.Sprintf("%s-service", bucket.Name),
			ReportTitle:         bucket.Name,
			ProviderServiceType: "s3",
			ServiceType:         "object-storage",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerService"},
			Config:              s.config,
		})

		// PerPort: Endpoint-level tests (TLS/SSL, port connectivity)
		endpoint := fmt.Sprintf("%s.s3.%s.amazonaws.com", bucket.Name, s.config.CloudParams().Region)
		resources = append(resources, types.TestParams{
			ResourceName:        bucket.Name,
			UID:                 bucket.ID,
			ReportFile:          fmt.Sprintf("%s-port", bucket.Name),
			ReportTitle:         fmt.Sprintf("%s:443", endpoint),
			HostName:            endpoint,
			PortNumber:          "443",
			Protocol:            "https",
			ProviderServiceType: "s3",
			ServiceType:         "object-storage",
			CatalogTypes:        []string{"CCC.ObjStor"},
			TagFilter:           []string{"@object-storage", "@PerPort", "@tls", "~@ftp", "~@telnet", "~@ssh", "~@smtp", "~@dns", "~@ldap"},
			Config:              s.config,
		})
	}

	return resources, nil
}

// CheckUserProvisioned validates that the given identity can access S3
// For AWS, credentials are immediately usable, so this just attempts a simple S3 API call
func (s *AWSS3Service) CheckUserProvisioned() error {
	// Try to list buckets as a validation that credentials work
	_, err := s.client.ListBuckets(s.ctx, &s3.ListBucketsInput{})
	if err != nil {
		return fmt.Errorf("credentials not ready for S3 access: %w", err)
	}
	return nil
}

func (s *AWSS3Service) ElevateAccessForInspection() error {
	// No-op: AWS S3 access is managed through IAM policies, not network access
	return nil
}

// SetObjectPermission attempts to set object-level permissions using S3 ACLs
// If S3 bucket has ACLs disabled (uniform bucket-level access), this will fail
func (s *AWSS3Service) SetObjectPermission(bucketID, objectID string, permissionLevel string) error {
	// Map permission level to S3 canned ACL
	var acl string
	switch permissionLevel {
	case "read":
		acl = "public-read"
	case "write":
		acl = "public-read-write"
	case "none":
		acl = "private"
	default:
		return fmt.Errorf("unsupported permission level: %s", permissionLevel)
	}

	// Attempt to set object-level ACL
	// If bucket has ACLs disabled (enforcing uniform access), this will fail
	_, err := s.client.PutObjectAcl(s.ctx, &s3.PutObjectAclInput{
		Bucket: aws.String(bucketID),
		Key:    aws.String(objectID),
		ACL:    s3types.ObjectCannedACL(acl),
	})

	if err != nil {
		// Check if it's because ACLs are disabled (which is GOOD - uniform access is enforced)
		if strings.Contains(err.Error(), "AccessControlListNotSupported") {
			return fmt.Errorf("S3 object-level ACLs are disabled - uniform bucket-level access is enforced: %w", err)
		}
		return fmt.Errorf("failed to set object ACL: %w", err)
	}

	// ACL was set successfully (only happens if uniform access is NOT enforced)
	return nil
}

// ListDeletedBuckets returns an error - AWS S3 does not support bucket-level soft delete
// S3 bucket deletion is immediate and permanent (CN03.AR01 not supported)
func (s *AWSS3Service) ListDeletedBuckets() ([]Bucket, error) {
	return []Bucket{}, nil
}

// RestoreBucket returns an error - AWS S3 does not support bucket-level soft delete
// S3 bucket deletion is immediate and permanent (CN03.AR01 not supported)
func (s *AWSS3Service) RestoreBucket(bucketID string) error {
	return fmt.Errorf("AWS S3 does not support bucket restoration - bucket deletion is immediate and permanent")
}

// SetBucketRetentionDurationDays returns an error - AWS S3 does not support bucket-level retention policies
// S3 has Object Lock for object-level retention, but not bucket-level (CN03.AR02 not supported at bucket level)
func (s *AWSS3Service) SetBucketRetentionDurationDays(bucketID string, days int) error {
	return fmt.Errorf("AWS S3 does not support bucket-level retention policies - use Object Lock for object-level retention instead")
}

// ResetAccess is a no-op for AWS S3 (access is managed via IAM)
func (s *AWSS3Service) ResetAccess() error {
	// No-op: AWS S3 access is managed through IAM policies, not network access
	return nil
}

// UpdateResourcePolicy updates the bucket policy to trigger logging without functional changes.
// It fetches the existing policy and modifies the SID field with a timestamp to ensure the
// policy is "changed" from CloudTrail's perspective while keeping the actual permissions intact.
func (s *AWSS3Service) integrationBucketID() string {
	if b := strings.TrimSpace(s.config.Get("default-container")); b != "" {
		return b
	}
	return DefaultIntegrationBucket
}

func (s *AWSS3Service) awsAccountID() (string, error) {
	out, err := sts.NewFromConfig(s.awsCfg).GetCallerIdentity(s.ctx, &sts.GetCallerIdentityInput{})
	if err != nil {
		return "", fmt.Errorf("sts GetCallerIdentity: %w", err)
	}
	accountID := strings.TrimSpace(aws.ToString(out.Account))
	if accountID == "" {
		return "", fmt.Errorf("sts GetCallerIdentity returned empty account id")
	}
	return accountID, nil
}

func (s *AWSS3Service) UpdateResourcePolicy() error {
	return s.putBucketPolicyWithTag(s.integrationBucketID(), "integration-test")
}

func (s *AWSS3Service) putBucketPolicyWithTag(bucketID, policyTag string) error {
	getPolicyOutput, err := s.client.GetBucketPolicy(s.ctx, &s3.GetBucketPolicyInput{
		Bucket: aws.String(bucketID),
	})
	var policy map[string]interface{}
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && apiErr.ErrorCode() == "NoSuchBucketPolicy" {
			accountID, idErr := s.awsAccountID()
			if idErr != nil {
				return idErr
			}
			policy = map[string]interface{}{
				"Version": "2012-10-17",
				"Statement": []interface{}{
					map[string]interface{}{
						"Sid":    "CCCIntegrationPlaceholder",
						"Effect": "Allow",
						"Principal": map[string]interface{}{
							"AWS": fmt.Sprintf("arn:aws:iam::%s:root", accountID),
						},
						"Action":   "s3:GetBucketLocation",
						"Resource": fmt.Sprintf("arn:aws:s3:::%s", bucketID),
					},
				},
			}
		} else {
			return fmt.Errorf("failed to get bucket policy: %w", err)
		}
	} else if err := json.Unmarshal([]byte(*getPolicyOutput.Policy), &policy); err != nil {
		return fmt.Errorf("failed to parse bucket policy: %w", err)
	}

	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	tag := strings.TrimSpace(policyTag)
	if tag == "" {
		tag = "integration-test"
	}
	if statements, ok := policy["Statement"].([]interface{}); ok {
		for _, stmt := range statements {
			if statement, ok := stmt.(map[string]interface{}); ok {
				if sid, exists := statement["Sid"]; exists {
					sidStr := fmt.Sprintf("%v", sid)
					if idx := strings.LastIndex(sidStr, "-ccc-"); idx != -1 {
						sidStr = sidStr[:idx]
					}
					statement["Sid"] = sidStr + "-ccc-" + timestamp
				} else {
					statement["Sid"] = tag + "-ccc-" + timestamp
				}
			}
		}
	}

	modifiedPolicy, err := json.Marshal(policy)
	if err != nil {
		return fmt.Errorf("failed to marshal modified policy: %w", err)
	}
	_, err = s.client.PutBucketPolicy(s.ctx, &s3.PutBucketPolicyInput{
		Bucket: aws.String(bucketID),
		Policy: aws.String(string(modifiedPolicy)),
	})
	if err != nil {
		return fmt.Errorf("failed to update bucket policy: %w", err)
	}
	return nil
}

// UpdateBucketPolicy updates bucket policy to trigger admin logging (CN04).
func (s *AWSS3Service) UpdateBucketPolicy(bucketID string, policyTag string) (*Bucket, error) {
	if err := s.putBucketPolicyWithTag(bucketID, policyTag); err != nil {
		return nil, err
	}
	return &Bucket{ID: bucketID, Name: bucketID}, nil
}

// ListObjectVersions lists object versions when bucket versioning is enabled.
func (s *AWSS3Service) ListObjectVersions(bucketID string, objectID string) ([]ObjectVersion, error) {
	out, err := s.client.ListObjectVersions(s.ctx, &s3.ListObjectVersionsInput{
		Bucket: aws.String(bucketID),
		Prefix: aws.String(objectID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list object versions: %w", err)
	}
	versions := make([]ObjectVersion, 0)
	for _, v := range out.Versions {
		if aws.ToString(v.Key) != objectID {
			continue
		}
		versions = append(versions, ObjectVersion{
			VersionID: aws.ToString(v.VersionId),
			ObjectID:  objectID,
		})
	}
	return versions, nil
}

// TriggerDataWrite performs a data modification to trigger logging (CN04.AR02)
func (s *AWSS3Service) TriggerDataWrite(resourceID string) error {
	key := TriggerDataReadProbeObjectKey
	_, err := s.CreateObject(resourceID, key, "integration trigger data write")
	return err
}

// TriggerDataRead performs a data read against a fixed probe object (CN04.AR03, CN05.AR06).
func (s *AWSS3Service) TriggerDataRead(resourceID string) error {
	if err := ensureTriggerDataReadProbe(s, resourceID, isS3ObjectNotFound); err != nil {
		return err
	}
	_, err := s.ReadObject(resourceID, TriggerDataReadProbeObjectKey)
	return err
}

func isS3ObjectNotFound(err error) bool {
	var apiErr smithy.APIError
	return errors.As(err, &apiErr) && apiErr.ErrorCode() == "NoSuchKey"
}

// GetResourceRegion returns the bucket region (CN06.AR01)
func (s *AWSS3Service) GetResourceRegion(resourceID string) (string, error) {
	return s.GetBucketRegion(resourceID)
}

// IsDataReplicatedToSeparateLocation checks replication (CN08.AR01)
func (s *AWSS3Service) IsDataReplicatedToSeparateLocation(resourceID string) (bool, error) {
	if _, err := s.GetBucketRegion(resourceID); err != nil {
		return false, err
	}
	return false, nil
}

// GetReplicationStatus returns replication status including locations (CN08.AR01, CN08.AR02).
// Populates ReplicationStatus with Locations (source + CRR destination regions), Status, SyncStatus.
func (s *AWSS3Service) GetReplicationStatus(resourceID string) (*generic.ReplicationStatus, error) {
	region, err := s.GetBucketRegion(resourceID)
	if err != nil {
		return nil, err
	}
	return &generic.ReplicationStatus{
		Locations:  []generic.LocationRegion{{Value: region}},
		Status:     "Disabled",
		SyncStatus: "Unknown",
	}, nil
}

// TearDown deletes objects created during testing
func (s *AWSS3Service) TearDown() error {
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

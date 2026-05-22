package objstorage

import (
	"github.com/finos/common-cloud-controls/cloud-api/generic"
)

// serviceParamString retrieves a string value from service params by camelCase key
func serviceParamString(serviceParams map[string]interface{}, key string) string {
	if serviceParams == nil {
		return ""
	}
	if v, ok := serviceParams[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// Bucket represents a storage bucket/container
type Bucket struct {
	ID     string // Unique identifier (name for AWS S3, Azure Storage Account + Container)
	Name   string // Human-readable name
	Region string // Geographic region
}

// ObjectVersion represents a version of an object when versioning is enabled
type ObjectVersion struct {
	VersionID string // Unique version identifier
	ObjectID  string // Object key/name
}

// Object represents a stored object/blob
type Object struct {
	ID                  string   // Unique identifier (key/path)
	BucketID            string   // Parent bucket identifier
	Name                string   // Object name/key
	Size                int64    // Size in bytes
	Data                []string // Object content (for small objects)
	Encryption          string   // Encryption status (e.g., "SSE-S3", "SSE-KMS", "AES256")
	EncryptionAlgorithm string   // Encryption algorithm (e.g., "AES256", "aws:kms")
	VersionID           string   // Version identifier (when versioning is enabled)
}

// Service provides operations for object storage testing
// This interface abstracts S3, Azure Blob Storage, and GCS operations
type Service interface {
	generic.Service // Extends the base Service interface

	// Bucket operations
	ListBuckets() ([]Bucket, error)
	CreateBucket(bucketID string) (*Bucket, error)
	DeleteBucket(bucketID string) error
	GetBucketRegion(bucketID string) (string, error)
	GetBucketRetentionDurationDays(bucketID string) (int, error)
	SetBucketRetentionDurationDays(bucketID string, days int) error
	ListDeletedBuckets() ([]Bucket, error)
	RestoreBucket(bucketID string) error
	UpdateBucketPolicy(bucketID string, policyTag string) (*Bucket, error)

	// Object operations
	ListObjects(bucketID string) ([]Object, error)
	CreateObject(bucketID string, objectID string, data string) (*Object, error)
	ReadObject(bucketID string, objectID string) (*Object, error)
	ReadObjectAtVersion(bucketID string, objectID string, versionID string) (*Object, error)
	DeleteObject(bucketID string, objectID string) error
	GetObjectRetentionDurationDays(bucketID string, objectID string) (int, error)

	// SetObjectPermission attempts to set object-level permissions
	// AWS: Should fail if uniform bucket-level access is enforced (ACLs disabled)
	// Azure: Always fails (doesn't support object-level permissions)
	SetObjectPermission(bucketID string, objectID string, permissionLevel string) error

	// ListObjectVersions lists all versions of an object (when versioning is enabled)
	ListObjectVersions(bucketID string, objectID string) ([]ObjectVersion, error)
}

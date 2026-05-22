package types

// CloudProvider identifies a supported cloud in factories, login refresh, and runners.
type CloudProvider string

const (
	ProviderAWS   CloudProvider = "aws"
	ProviderAzure CloudProvider = "azure"
	ProviderGCP   CloudProvider = "gcp"
)

// TestParams holds the parameters for port / service testing
// This is the single shared structure used by both cloud api and reporters
type TestParams struct {
	PortNumber          string                 // Leave blank if not applicable (e.g., for services without specific ports)
	HostName            string                 // Hostname or endpoint
	Protocol            string                 // Protocol (e.g., "tcp", "https")
	ServiceType         string                 // Type of service (e.g., "s3", "rds", "storage") - DEPRECATED, use ProviderServiceType
	ProviderServiceType string                 // Cloud provider-specific service type (e.g., "s3", "rds", "Microsoft.Storage/storageAccounts")
	CatalogTypes        []string               // CCC catalog types to test with (e.g., "CCC.ObjStor", "CCC.RDMS", "CCC.VM", "CCC.Core")
	TagFilter           []string               // Tag filters to AND together (e.g., ["@CCC.Core", "@CCC.ObjStor"])
	Labels              []string               // Tags/labels from the resource
	UID                 string                 // Unique identifier (ARN, resource ID, etc.)
	ResourceName        string                 // Human-readable resource name extracted from ARN or resource ID
	ReportFile          string                 // Base filename for output report (without extension), e.g., "bucket-name-service"
	ReportTitle         string                 // Human-readable title for reports, e.g., "my-bucket" or "my-bucket.s3.us-east-1.amazonaws.com:443"
	Instance            InstanceConfig         // Instance configuration
	Props               map[string]interface{} // Additional runtime properties set during test execution
}

// CloudParams holds the cloud provider and instance-level configuration
type CloudParams struct {
	Provider            string `yaml:"provider,omitempty"`
	Region              string `yaml:"region,omitempty"`
	AzureResourceGroup  string `yaml:"azure-resource-group,omitempty"`
	AzureSubscriptionID string `yaml:"azure-subscription-id,omitempty"`
	GcpProjectId        string `yaml:"gcp-project-id,omitempty"`
}

// Attachment holds a named piece of content attached to a test step
type Attachment struct {
	Name      string // Human-readable label
	MediaType string // e.g. "application/json", "text/plain"
	Data      []byte // Raw content
}

// AttachmentProvider is implemented by anything that can supply and manage test attachments
type AttachmentProvider interface {
	GetAttachments() []Attachment
	ClearAttachments()
}

// ServiceTypes contains all known service types.
// These are also used as tags on tests relevant to that service.
var ServiceTypes = []string{
	"object-storage",
	"block-storage",
	"relational-database",
	"iam",
	"load-balancer",
	"security-group",
	"vpc",
}

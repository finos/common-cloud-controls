package genai

import "github.com/finos/common-cloud-controls/cloud-api/generic"

// Filter direction arguments for ApplyContentFilter.
const (
	FilterDirectionInput  = "input"
	FilterDirectionOutput = "output"
)

// FilterResult is returned by ApplyContentFilter (guardrail / content-filter probes).
type FilterResult struct {
	Blocked   bool
	Sanitized bool
	Reason    string
}

// GuardrailTerms lists blocked words configured on a guardrail or deployment.
type GuardrailTerms struct {
	InputTerms  []string
	OutputTerms []string
}

// GuardrailConfig describes filter enablement on a guardrail or deployment.
type GuardrailConfig struct {
	InputFilterEnabled  bool
	OutputFilterEnabled bool
}

// ModelVersion describes the pinned model on an inference endpoint.
type ModelVersion struct {
	VersionID string
	IsPinned  bool
}

// ToolResult is returned by InvokeTool.
type ToolResult struct {
	Allowed bool
	Error   string
}

// ToolPermissions describes IAM / managed-identity scope for a registered tool.
type ToolPermissions struct {
	Actions        []string
	OverPrivileged bool
}

// IngestResult is returned by IngestDocument.
type IngestResult struct {
	Action       string // rejected, redacted, flagged, indexed
	DocumentID   string
	DeniedReason string
}

// InvokeResult is returned by InvokeModel — one cloud inference call with input and output guardrails.
type InvokeResult struct {
	InputBlocked     bool
	InputSanitized   bool
	InputValidated   bool
	OutputBlocked    bool
	OutputRedacted   bool
	OutputValidated  bool
	Reason           string
	Completion       string
	ModelVersionUsed string
}

// EncryptionConfiguration describes encryption at rest on a knowledge base or artifact store.
type EncryptionConfiguration struct {
	EncryptionEnabled bool
	KMSKeyID          string
}

// Service provides generative-AI behavioural operations for CCC.GenAI.
//
// Config keys (privateer services.*.vars — implementations read via types.Config.Get):
//   - resource — inference endpoint logical name (from GetOrProvisionTestableResources; not passed in features)
//   - guardrail-id — configured guardrail / content-filter (not passed in features)
//   - blocked-input-terms, blocked-output-terms — probe tokens (must match terraform fixture)
//   - benign-probe-prompt, input-block-probe-prompt, output-block-probe-prompt — invoke probes
//   - benign-output-probe-text — synthetic completion for output filter SANITY
//   - kb-id, approved-source-id, unvetted-source-id, acceptable-sources
//   - ingest-poison-document-id — document ref for CN04 poison ingest
//   - pinned-model-version — expected explicit model / deployment version (CN07)
//   - plugin-tool-name, plugin-allowed-action, plugin-denied-action
type Service interface {
	generic.Service

	// ApplyContentFilter runs the configured guardrail (config "guardrail-id") on text without a model invoke.
	// direction is FilterDirectionInput or FilterDirectionOutput.
	ApplyContentFilter(text, direction string) (*FilterResult, error)

	// GetGuardrailBlockedTerms returns word-list terms on the configured guardrail.
	GetGuardrailBlockedTerms() (*GuardrailTerms, error)

	// GetGuardrailConfiguration describes whether input and output filters are enabled on the configured guardrail.
	GetGuardrailConfiguration() (*GuardrailConfig, error)

	// InvokeModel runs inference on the configured endpoint (config "resource") with input and output guardrails.
	// Implementations map to the provider's single invoke API (Bedrock Converse, Azure chat completions, Vertex generateContent, etc.).
	InvokeModel(prompt string) (*InvokeResult, error)

	// GetDeployedModelVersion returns the pinned model / deployment id on the configured endpoint.
	GetDeployedModelVersion() (*ModelVersion, error)

	// GetKnowledgeBaseSources lists connector / source ids registered on a knowledge base.
	GetKnowledgeBaseSources(kbID string) ([]string, error)

	// IngestDocument ingests documentRef from sourceID into kbID.
	// documentRef is a logical id (e.g. ingest-poison-document-id) resolved by the implementation.
	IngestDocument(kbID, sourceID, documentRef string) (*IngestResult, error)

	// InvokeTool runs toolName on the configured endpoint with the given action (allowed vs escalated probe).
	InvokeTool(toolName, action string) (*ToolResult, error)

	// GetToolPrincipalPermissions describes the tool execution principal on the configured endpoint (optional CN06 describe).
	GetToolPrincipalPermissions(toolName string) (*ToolPermissions, error)

	// GetEncryptionConfiguration describes encryption at rest on a KB or backing store (Core CN02, CN11).
	GetEncryptionConfiguration(resourceID string) (*EncryptionConfiguration, error)

	// SetGuardrailBlockedTerms replaces blocked terms on the configured guardrail (integration / admin path; terraform preferred for behavioural tests).
	SetGuardrailBlockedTerms(terms GuardrailTerms) (*GuardrailTerms, error)
}

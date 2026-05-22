package types

// PolicyResult contains the complete result of a policy check
type PolicyResult struct {
	// Policy metadata
	PolicyPath      string `json:"policy_path" yaml:"policy_path"`
	Name            string `json:"name" yaml:"name"`
	ServiceType     string `json:"service_type" yaml:"service_type"`
	RequirementText string `json:"requirement_text" yaml:"requirement_text"`
	ValidityScore   int    `json:"validity_score" yaml:"validity_score"`
	ValidityComment string `json:"validity_commentary" yaml:"validity_commentary"`

	// Query execution
	QueryTemplate string `json:"query_template" yaml:"query_template"`
	QueryExecuted string `json:"query_executed" yaml:"query_executed"`
	QueryOutput   string `json:"query_output" yaml:"query_output"`
	QueryError    string `json:"query_error,omitempty" yaml:"query_error,omitempty"`

	// Overall result
	Passed bool `json:"passed" yaml:"passed"`

	// Individual rule results
	RuleResults []RuleResult `json:"rule_results" yaml:"rule_results"`
}

// RuleResult contains the result of evaluating a single rule
type RuleResult struct {
	JSONPath       string   `json:"jsonpath" yaml:"jsonpath"`
	ExpectedValues []string `json:"expected_values" yaml:"expected_values"`
	ValidationRule string   `json:"validation_rule" yaml:"validation_rule"`
	Description    string   `json:"description" yaml:"description"`

	// Evaluation results
	ActualValue string `json:"actual_value" yaml:"actual_value"`
	Passed      bool   `json:"passed" yaml:"passed"`
	Error       string `json:"error,omitempty" yaml:"error,omitempty"`
}

// PolicyDefinition represents the structure of a policy YAML file
type PolicyDefinition struct {
	Name               string `yaml:"name"`
	ServiceType        string `yaml:"service_type"`
	RequirementText    string `yaml:"requirement_text"`
	ValidityScore      int    `yaml:"validity_score"`
	ValidityCommentary string `yaml:"validity_commentary"`
	Query              string `yaml:"query"`
	Rules              []Rule `yaml:"rules"`
}

// Rule represents a single validation rule in a policy
type Rule struct {
	JSONPath       string `yaml:"jsonpath"`
	ExpectedValues []any  `yaml:"expected_values"`
	ValidationRule string `yaml:"validation_rule"`
	Description    string `yaml:"description"`
	Todo           string `yaml:"todo,omitempty"`
}

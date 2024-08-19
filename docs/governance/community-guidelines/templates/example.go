package example

type Taxonomy struct {
	ServiceTypes      []ServiceType
	CommonFeatures    []Feature
	CommonControls    []Feature
	CommonThreats     []Feature
}

type ServiceType struct {
	ID                string`yaml:"id"`
	Title             string`yaml:"title"`
	Description       string`yaml:"description"`
	ServiceCategories []ServiceCategory
}

type ServiceCategory struct {
	VersionNumber   string`yaml:"version_number"`
	ID              string`yaml:"id"`
	Title           string`yaml:"title"`
	Type            string`yaml:"type"`
	Description     string`yaml:"description"`
	ServiceExamples []string`yaml:"service_examples"`
	Features        []Feature
	Controls        []Control
	Threats         []Threat
}

type Feature struct {
	ID          string`yaml:"id"`
	Title       string`yaml:"title"`
	Description string`yaml:"description"`
}

type Control struct {
	ID               string`yaml:"id"`
	FeatureID        string`yaml:"feature_id"`
	Title            string`yaml:"title"`
	Objective        string`yaml:"objective"`
	NISTCSF          string`yaml:"nist_csf"`
	MitreATTACK      string`yaml:"mitre_attack"`
	ControlMappings  map[string][]string`yaml:"control_mappings"`
	TestRequirements map[string]string`yaml:"test_requirements"`
}

type Threat struct {
	ID          string`yaml:"id"`
	Title       string`yaml:"title"`
	Description string`yaml:"description"`
	FeatureID   string`yaml:"feature_id"`
	MitreATTACK []string`yaml:"mitre_attack"`
	ThreatModels []string`yaml:"threat_models"`
}
package reporters

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/cucumber/godog/formatters"
	messages "github.com/cucumber/messages/go/v21"
)

// OCSFFormatter is a godog formatter that generates OCSF JSON reports
type OCSFFormatter struct {
	out             io.Writer
	findings        []OCSFFinding
	currentFeature  string
	currentScenario *OCSFFinding
	scenarioStarted bool
	startTime       time.Time
	params          *TestParams // Optional test parameters
}

// OCSFFinding represents a single OCSF finding/result
type OCSFFinding struct {
	Message      string          `json:"message"`
	ExclusionTag string          `json:"-"` // NotTested, NotTestable, Duplicate - used for status override
	Metadata     OCSFMetadata    `json:"metadata"`
	SeverityID   int             `json:"severity_id"`
	Severity     string          `json:"severity"`
	Status       string          `json:"status"`
	StatusCode   string          `json:"status_code"`
	StatusDetail string          `json:"status_detail"`
	StatusID     int             `json:"status_id"`
	Unmapped     OCSFUnmapped    `json:"unmapped"`
	ActivityName string          `json:"activity_name"`
	ActivityID   int             `json:"activity_id"`
	FindingInfo  OCSFFindingInfo `json:"finding_info"`
	CategoryName string          `json:"category_name"`
	CategoryUID  int             `json:"category_uid"`
	ClassName    string          `json:"class_name"`
	ClassUID     int             `json:"class_uid"`
	Time         int64           `json:"time"`
	TimeDT       string          `json:"time_dt"`
	TypeUID      int             `json:"type_uid"`
	TypeName     string          `json:"type_name"`
	Resources    []OCSFResource  `json:"resources,omitempty"`
}

// OCSFMetadata represents the metadata section
type OCSFMetadata struct {
	EventCode string      `json:"event_code"`
	Product   OCSFProduct `json:"product"`
	Profiles  []string    `json:"profiles"`
	Version   string      `json:"version"`
}

// OCSFProduct represents the product information
type OCSFProduct struct {
	Name       string `json:"name"`
	UID        string `json:"uid"`
	VendorName string `json:"vendor_name"`
	Version    string `json:"version"`
}

// OCSFUnmapped represents the unmapped section
type OCSFUnmapped struct {
	Compliance map[string][]string `json:"compliance"`
}

// OCSFFindingInfo represents the finding_info section
type OCSFFindingInfo struct {
	CreatedTime   int64    `json:"created_time"`
	CreatedTimeDT string   `json:"created_time_dt"`
	Desc          string   `json:"desc"`
	Title         string   `json:"title"`
	Types         []string `json:"types"`
	UID           string   `json:"uid"`
}

// OCSFResource represents a resource being tested
type OCSFResource struct {
	CloudPartition string            `json:"cloud_partition,omitempty"`
	Region         string            `json:"region,omitempty"`
	Data           OCSFResourceData  `json:"data"`
	Group          OCSFResourceGroup `json:"group,omitempty"`
	Labels         []string          `json:"labels,omitempty"`
	Name           string            `json:"name"`
	Type           string            `json:"type"`
	UID            string            `json:"uid"`
}

// OCSFResourceData represents the data section of a resource
type OCSFResourceData struct {
	Details  string               `json:"details"`
	Metadata OCSFResourceMetadata `json:"metadata"`
}

// OCSFResourceMetadata represents metadata about the resource
type OCSFResourceMetadata struct {
	ARN      string   `json:"arn,omitempty"`
	Name     string   `json:"name"`
	Status   string   `json:"status,omitempty"`
	Findings []string `json:"findings"`
	Tags     []string `json:"tags"`
	Type     string   `json:"type"`
	Region   string   `json:"region,omitempty"`
}

// OCSFResourceGroup represents the group section of a resource
type OCSFResourceGroup struct {
	Name string `json:"name"`
}

// Feature captures feature information
func (f *OCSFFormatter) Feature(gd *messages.GherkinDocument, uri string, c []byte) {
	if gd.Feature != nil {
		name := gd.Feature.Name
		if parts := strings.Split(name, " - "); len(parts) > 0 {
			name = strings.TrimSpace(parts[0])
		}
		f.currentFeature = name
	}
}

// applyExclusionStatusOverride sets status from exclusion tags: NotTested=FAIL, NotTestable/Duplicate=PASS
func applyExclusionStatusOverride(finding *OCSFFinding) {
	switch finding.ExclusionTag {
	case "NotTested":
		finding.StatusCode = "FAIL"
		finding.Status = "Update"
		finding.StatusID = 2
	case "NotTestable", "Duplicate":
		finding.StatusCode = "PASS"
		finding.Status = "New"
		finding.StatusID = 1
	}
}

// Pickle captures pickle (scenario) information
func (f *OCSFFormatter) Pickle(pickle *messages.Pickle) {
	// Save the previous scenario if one was in progress
	if f.scenarioStarted && f.currentScenario != nil {
		applyExclusionStatusOverride(f.currentScenario)
		f.findings = append(f.findings, *f.currentScenario)
	}

	// Initialize a new finding for this scenario
	now := time.Now()

	// Extract tags from pickle
	var tagNames []string
	productName := "CCC-Complete"
	exclusionTag := ""
	for _, tag := range pickle.Tags {
		tagNames = append(tagNames, tag.Name)
		if tag.Name == "@Policy" {
			productName = "CCC-Complete (Policy)"
		} else if tag.Name == "@Behavioural" {
			productName = "CCC-Complete (Behavioural)"
		} else if tag.Name == "@NotTested" {
			exclusionTag = "NotTested"
		} else if tag.Name == "@NotTestable" {
			exclusionTag = "NotTestable"
		} else if tag.Name == "@Duplicate" {
			exclusionTag = "Duplicate"
		}
	}

	message := pickle.Name
	eventCode := pickle.Name
	if exclusionTag != "" {
		message = message + " - " + exclusionTag
		eventCode = eventCode + " - " + exclusionTag
	}

	finding := &OCSFFinding{
		Message:      message,
		ExclusionTag: exclusionTag,
		Metadata: OCSFMetadata{
			EventCode: eventCode,
			Product: OCSFProduct{
				Name:       productName,
				UID:        productName,
				VendorName: "FINOS",
				Version:    "0.1",
			},
			Profiles: tagNames,
			Version:  "1.4.0",
		},
		SeverityID: 1,
		Severity:   "Informational",
		Status:     "New",
		StatusCode: "PASS", // Default to PASS, will be updated if any step fails
		StatusID:   1,
		Unmapped: OCSFUnmapped{
			Compliance: map[string][]string{
				"CCC": {f.currentFeature},
			},
		},
		ActivityName: "Test",
		ActivityID:   1,
		FindingInfo: OCSFFindingInfo{
			CreatedTime:   now.Unix(),
			CreatedTimeDT: now.Format(time.RFC3339),
			Desc:          fmt.Sprintf("Compliance test scenario: %s", message),
			Title:         message,
			Types:         []string{},
			UID:           fmt.Sprintf("ccc-test-%s-%d", pickle.Id, now.Unix()),
		},
		CategoryName: "Findings",
		CategoryUID:  2,
		ClassName:    "Compliance Finding",
		ClassUID:     2004,
		Time:         now.Unix(),
		TimeDT:       now.Format(time.RFC3339),
		TypeUID:      200401,
		TypeName:     "Compliance Finding: Test",
	}

	// Add resources section if params are available
	if f.params != nil && (f.params.UID != "" || f.params.HostName != "") {
		resourceName := f.params.HostName
		resourceUID := f.params.UID
		if resourceUID == "" {
			resourceUID = fmt.Sprintf("%s:%s", f.params.HostName, f.params.PortNumber)
		}
		if resourceName == "" {
			resourceName = resourceUID
		}

		resource := OCSFResource{
			CloudPartition: f.params.Instance.Properties.Provider,
			Region:         f.params.Instance.Properties.Region,
			Data: OCSFResourceData{
				Details: fmt.Sprintf("%s service on %s:%s", f.params.Protocol, f.params.HostName, f.params.PortNumber),
				Metadata: OCSFResourceMetadata{
					Name:     resourceName,
					Status:   "ACTIVE",
					Findings: []string{},
					Tags:     []string{},
					Type:     f.params.ServiceType,
					Region:   f.params.Instance.Properties.Region,
				},
			},
			Group: OCSFResourceGroup{
				Name: f.params.ServiceType,
			},
			Labels: f.params.Labels,
			Name:   resourceName,
			Type:   f.params.ServiceType,
			UID:    resourceUID,
		}

		finding.Resources = []OCSFResource{resource}
	}

	f.currentScenario = finding
	f.scenarioStarted = true
}

// TestRunStarted is required by the formatters.Formatter interface
func (f *OCSFFormatter) TestRunStarted() {
	f.startTime = time.Now()
}

// TestRunFinished captures test run completion
func (f *OCSFFormatter) TestRunFinished(msg *messages.TestRunFinished) {
	// Finalize any pending scenario
	if f.scenarioStarted && f.currentScenario != nil {
		applyExclusionStatusOverride(f.currentScenario)
		f.findings = append(f.findings, *f.currentScenario)
		f.scenarioStarted = false
	}
}

// Summary generates and writes the final OCSF JSON report
func (f *OCSFFormatter) Summary() {
	// Finalize any pending scenario
	if f.scenarioStarted && f.currentScenario != nil {
		applyExclusionStatusOverride(f.currentScenario)
		f.findings = append(f.findings, *f.currentScenario)
		f.scenarioStarted = false
	}

	// Marshal to JSON with pretty printing
	jsonData, err := json.MarshalIndent(f.findings, "", "    ")
	if err != nil {
		fmt.Fprintf(f.out, "Error generating OCSF report: %v\n", err)
		return
	}

	fmt.Fprint(f.out, string(jsonData))
}

// Defined is required by the formatters.Formatter interface
func (f *OCSFFormatter) Defined(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition) {
	// No action needed
}

// Passed is required by the formatters.Formatter interface
func (f *OCSFFormatter) Passed(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition) {
	// Append step to status detail
	if f.currentScenario != nil {
		if f.currentScenario.StatusDetail != "" {
			f.currentScenario.StatusDetail += "\n"
		}
		f.currentScenario.StatusDetail += fmt.Sprintf("✓ %s", step.Text)
	}
}

// Skipped is required by the formatters.Formatter interface
func (f *OCSFFormatter) Skipped(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition) {
	if f.currentScenario != nil {
		// Only set SKIP if not already FAIL (don't overwrite failure status)
		if f.currentScenario.StatusCode == "PASS" {
			f.currentScenario.StatusCode = "SKIP"
		}
		if f.currentScenario.StatusDetail != "" {
			f.currentScenario.StatusDetail += "\n"
		}
		f.currentScenario.StatusDetail += fmt.Sprintf("⊘ %s (skipped)", step.Text)
	}
}

// Undefined is required by the formatters.Formatter interface
func (f *OCSFFormatter) Undefined(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition) {
	if f.currentScenario != nil {
		// Undefined steps are failures - always set to FAIL
		if f.currentScenario.StatusCode != "FAIL" {
			f.currentScenario.StatusCode = "FAIL"
			f.currentScenario.SeverityID = 3
			f.currentScenario.Severity = "Medium"
		}
		if f.currentScenario.StatusDetail != "" {
			f.currentScenario.StatusDetail += "\n"
		}
		f.currentScenario.StatusDetail += fmt.Sprintf("? %s (undefined)", step.Text)
	}
}

// Failed is required by the formatters.Formatter interface
func (f *OCSFFormatter) Failed(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition, err error) {
	if f.currentScenario != nil {
		f.currentScenario.StatusCode = "FAIL"
		f.currentScenario.SeverityID = 3
		f.currentScenario.Severity = "Medium"
		if f.currentScenario.StatusDetail != "" {
			f.currentScenario.StatusDetail += "\n"
		}
		if err != nil {
			f.currentScenario.StatusDetail += fmt.Sprintf("✗ %s - Error: %s", step.Text, err.Error())
		} else {
			f.currentScenario.StatusDetail += fmt.Sprintf("✗ %s", step.Text)
		}
	}
}

// Pending is required by the formatters.Formatter interface
func (f *OCSFFormatter) Pending(pickle *messages.Pickle, step *messages.PickleStep, def *formatters.StepDefinition) {
	if f.currentScenario != nil {
		// Only set PENDING if not already FAIL (don't overwrite failure status)
		if f.currentScenario.StatusCode != "FAIL" {
			f.currentScenario.StatusCode = "PENDING"
		}
		if f.currentScenario.StatusDetail != "" {
			f.currentScenario.StatusDetail += "\n"
		}
		f.currentScenario.StatusDetail += fmt.Sprintf("⋯ %s (pending)", step.Text)
	}
}

// NewOCSFFormatterWithParams creates a new OCSF formatter with test parameters
func NewOCSFFormatterWithParams(suite string, out io.Writer, params TestParams) formatters.Formatter {
	return &OCSFFormatter{
		out:      out,
		findings: make([]OCSFFinding, 0),
		params:   &params,
	}
}

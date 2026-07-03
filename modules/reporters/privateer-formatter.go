package reporters

import (
	"io"
	"strings"
	"sync"

	"github.com/cucumber/godog/formatters"
	messages "github.com/cucumber/messages/go/v21"
)

// PrivateerScenarioResult is one Godog scenario outcome for Privateer/Gemara reporting.
type PrivateerScenarioResult struct {
	RequirementID string // e.g. CCC.Core.CN05.AR01 (from feature name or tags)
	ControlID     string // e.g. CCC.Core.CN05
	Scenario      string
	Badge         string // NotTested, NotTestable, Duplicate
	IsPolicy      bool
	Passed        bool
}

var privateerCollector struct {
	mu      sync.Mutex
	results []PrivateerScenarioResult
}

// ResetPrivateerCollector clears collected scenario results. Call before a Godog run.
func ResetPrivateerCollector() {
	privateerCollector.mu.Lock()
	privateerCollector.results = nil
	privateerCollector.mu.Unlock()
}

// PrivateerResults returns a snapshot of collected results and clears the collector.
func PrivateerResults() []PrivateerScenarioResult {
	privateerCollector.mu.Lock()
	out := make([]PrivateerScenarioResult, len(privateerCollector.results))
	copy(out, privateerCollector.results)
	privateerCollector.results = nil
	privateerCollector.mu.Unlock()
	return out
}

// privateerResultsPeek returns collected results without clearing (used while steps execute).
func privateerResultsPeek() []PrivateerScenarioResult {
	privateerCollector.mu.Lock()
	out := make([]PrivateerScenarioResult, len(privateerCollector.results))
	copy(out, privateerCollector.results)
	privateerCollector.mu.Unlock()
	return out
}

func appendPrivateerResult(r PrivateerScenarioResult) {
	privateerCollector.mu.Lock()
	privateerCollector.results = append(privateerCollector.results, r)
	privateerCollector.mu.Unlock()
}

// PrivateerFormatter collects Godog scenario results for Privateer orchestrator output.
type PrivateerFormatter struct {
	currentFeature string
	current        *PrivateerScenarioResult
}

// NewPrivateerFormatter creates a formatter that records scenario outcomes for Privateer.
func NewPrivateerFormatter(_ string, _ io.Writer) formatters.Formatter {
	return &PrivateerFormatter{}
}

func (f *PrivateerFormatter) Feature(gd *messages.GherkinDocument, _ string, _ []byte) {
	if gd.Feature != nil {
		f.currentFeature = strings.TrimSpace(gd.Feature.Name)
	}
}

func (f *PrivateerFormatter) Pickle(pickle *messages.Pickle) {
	if f.current != nil {
		f.finalize()
	}

	isPolicy := false
	exclusionTag := ""
	for _, tag := range pickle.Tags {
		switch tag.Name {
		case "@Policy":
			isPolicy = true
		case "@NotTested":
			exclusionTag = "NotTested"
		case "@NotTestable":
			exclusionTag = "NotTestable"
		case "@Duplicate":
			exclusionTag = "Duplicate"
		}
	}

	reqID := requirementIDFromFeature(f.currentFeature)
	if reqID == "" {
		reqID = requirementIDFromTags(pickle.Tags)
	}

	f.current = &PrivateerScenarioResult{
		RequirementID: reqID,
		ControlID:     ControlIDFromRequirement(reqID),
		Scenario:      pickle.Name,
		Badge:         exclusionTag,
		IsPolicy:      isPolicy,
		Passed:        true,
	}
}

func (f *PrivateerFormatter) finalize() {
	if f.current == nil {
		return
	}
	r := *f.current
	switch r.Badge {
	case "NotTested":
		r.Passed = false
	case "NotTestable", "Duplicate":
		r.Passed = true
	default:
		// Passed stays as set by step callbacks; default true until failure
	}
	appendPrivateerResult(r)
	f.current = nil
}

func (f *PrivateerFormatter) TestRunStarted() {}

func (f *PrivateerFormatter) TestRunFinished(_ *messages.TestRunFinished) {}

func (f *PrivateerFormatter) Summary() {
	if f.current != nil {
		f.finalize()
	}
}

func (f *PrivateerFormatter) Defined(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition) {
}

func (f *PrivateerFormatter) Passed(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition) {}

func (f *PrivateerFormatter) Skipped(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition) {
	if f.current != nil {
		f.current.Passed = false
	}
}

func (f *PrivateerFormatter) Undefined(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition) {
	if f.current != nil {
		f.current.Passed = false
	}
}

func (f *PrivateerFormatter) Failed(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition, _ error) {
	if f.current != nil {
		f.current.Passed = false
	}
}

func (f *PrivateerFormatter) Pending(_ *messages.Pickle, _ *messages.PickleStep, _ *formatters.StepDefinition) {
	if f.current != nil {
		f.current.Passed = false
	}
}

func requirementIDFromFeature(featureName string) string {
	if featureName == "" {
		return ""
	}
	if parts := strings.Split(featureName, " - "); len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return featureName
}

func requirementIDFromTags(tags []*messages.PickleTag) string {
	for _, tag := range tags {
		t := strings.TrimPrefix(tag.Name, "@")
		if strings.HasPrefix(t, controlPattern) && strings.Contains(t, ".AR") {
			return t
		}
	}
	return ""
}

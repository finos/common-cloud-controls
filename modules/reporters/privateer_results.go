package reporters

import (
	"fmt"
	"strings"

	"github.com/gemaraproj/go-gemara"
)

// ControlIDFromRequirement returns the control id for an AR requirement id.
// e.g. CCC.Core.CN05.AR01 -> CCC.Core.CN05
func ControlIDFromRequirement(requirementID string) string {
	if requirementID == "" {
		return ""
	}
	if i := strings.LastIndex(requirementID, "."); i > 0 {
		suffix := requirementID[i+1:]
		if strings.HasPrefix(suffix, "AR") {
			return requirementID[:i]
		}
	}
	return requirementID
}

// ResultForScenario maps one Godog scenario outcome for an AR (exact scenario name match).
func ResultForScenario(requirementID, scenarioName string) (gemara.Result, string, gemara.ConfidenceLevel) {
	if requirementID == "" || scenarioName == "" {
		return gemara.Unknown, "missing requirement or scenario name", gemara.Undetermined
	}
	for _, s := range privateerResultsPeek() {
		if s.RequirementID != requirementID || s.Scenario != scenarioName {
			continue
		}
		msg := scenarioName
		if s.Badge != "" {
			msg += " (" + s.Badge + ")"
		}
		if s.Passed {
			return gemara.Passed, msg, gemara.Medium
		}
		return gemara.Failed, msg, gemara.Medium
	}
	return gemara.NotRun, fmt.Sprintf("scenario not executed: %s", scenarioName), gemara.Undetermined
}

// ResultForRequirement maps collected Godog results to a Gemara assessment outcome for a catalog AR.
func ResultForRequirement(requirementID string) (gemara.Result, string, gemara.ConfidenceLevel) {
	if requirementID == "" {
		return gemara.Unknown, "missing requirement id", gemara.Undetermined
	}

	scenarios := scenariosForRequirement(privateerResultsPeek(), requirementID)
	if len(scenarios) == 0 {
		return gemara.NotRun, fmt.Sprintf("no Godog scenarios executed for %s", requirementID), gemara.Undetermined
	}

	var failed []string
	var passed int
	for _, s := range scenarios {
		if s.Passed {
			passed++
			continue
		}
		label := s.RequirementID
		if label == "" {
			label = requirementID
		}
		if s.Scenario != "" {
			label = label + ": " + s.Scenario
		}
		if s.Badge != "" {
			label = label + " (" + s.Badge + ")"
		}
		failed = append(failed, label)
	}

	if len(failed) > 0 {
		return gemara.Failed,
			fmt.Sprintf("%d/%d scenario(s) failed for %s: %s", len(failed), len(scenarios), requirementID, strings.Join(failed, "; ")),
			gemara.Medium
	}
	return gemara.Passed,
		fmt.Sprintf("%d scenario(s) passed for %s", passed, requirementID),
		gemara.Medium
}

// ScenariosByRequirement groups collected Godog results by AR id (requirement id).
func ScenariosByRequirement() map[string][]PrivateerScenarioResult {
	grouped := make(map[string][]PrivateerScenarioResult)
	for _, r := range privateerResultsPeek() {
		grouped[r.RequirementID] = append(grouped[r.RequirementID], r)
	}
	return grouped
}

func scenariosForRequirement(results []PrivateerScenarioResult, requirementID string) []PrivateerScenarioResult {
	var matched []PrivateerScenarioResult
	for _, r := range results {
		if r.RequirementID == requirementID {
			matched = append(matched, r)
		}
	}
	return matched
}

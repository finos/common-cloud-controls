package main

import (
	"fmt"
	"log"
	"sync"

	"github.com/finos/common-cloud-controls/reporters"
	"github.com/gemaraproj/go-gemara"
	"github.com/privateerproj/privateer-sdk/command"
	"github.com/privateerproj/privateer-sdk/pluginkit"
)

// godogScenarioStep returns a step that reads a pre-collected Godog result (suite must run before Mobilize).
func godogScenarioStep(requirementID, scenarioName string) gemara.AssessmentStep {
	return func(_ interface{}) (gemara.Result, string, gemara.ConfidenceLevel) {
		return reporters.ResultForScenario(requirementID, scenarioName)
	}
}

func noGodogCoverageStep(requirementID string) gemara.AssessmentStep {
	return func(_ interface{}) (gemara.Result, string, gemara.ConfidenceLevel) {
		return gemara.NotRun,
			fmt.Sprintf("no Godog scenarios executed for %s", requirementID),
			gemara.Undetermined
	}
}

// behaviouralStepsFromCollector builds steps from PrivateerFormatter results (after Godog has run).
func behaviouralStepsFromCollector(catalogARs []string) (map[string][]gemara.AssessmentStep, error) {
	pluginkit.ClearAssessmentStepDisplayNames()
	byAR := reporters.ScenariosByRequirement()

	log.Printf("ccc-behavioural-plugin: %d catalog ARs, %d ARs with Godog scenario results",
		len(catalogARs), len(byAR))

	steps := make(map[string][]gemara.AssessmentStep)
	for _, arID := range catalogARs {
		scenarios := byAR[arID]
		if len(scenarios) == 0 {
			pluginkit.SetAssessmentStepDisplayNames(arID, []string{"No Godog coverage"})
			steps[arID] = []gemara.AssessmentStep{noGodogCoverageStep(arID)}
			continue
		}

		labels := make([]string, 0, len(scenarios))
		arSteps := make([]gemara.AssessmentStep, 0, len(scenarios))
		for _, sc := range scenarios {
			labels = append(labels, sc.Scenario)
			arSteps = append(arSteps, godogScenarioStep(arID, sc.Scenario))
		}
		pluginkit.SetAssessmentStepDisplayNames(arID, labels)
		steps[arID] = arSteps
	}

	return steps, nil
}

var (
	suiteConfigured   sync.Once
	suiteConfigureErr error
)

// ensureBehaviouralEvaluationSuite registers the evaluation suite from collected Godog results.
func ensureBehaviouralEvaluationSuite() error {
	suiteConfigured.Do(func() {
		catalogARs, err := objectStorageCatalogARs()
		if err != nil {
			suiteConfigureErr = err
			return
		}
		steps, err := behaviouralStepsFromCollector(catalogARs)
		if err != nil {
			suiteConfigureErr = err
			return
		}
		if command.ActiveEvaluationOrchestrator == nil {
			suiteConfigureErr = fmt.Errorf("evaluation orchestrator not initialized")
			return
		}
		suiteConfigureErr = command.ActiveEvaluationOrchestrator.AddEvaluationSuite(objectStorageCatalogID, nil, steps)
	})
	return suiteConfigureErr
}

func mobilizeBehavioural() error {
	ensureBehaviouralTestsRun()

	if err := ensureBehaviouralEvaluationSuite(); err != nil {
		return err
	}
	if err := command.ActiveEvaluationOrchestrator.Mobilize(); err != nil {
		return err
	}
	if behaviouralTestsExitCode != 0 {
		return fmt.Errorf("behavioural Godog suite failed")
	}
	return nil
}

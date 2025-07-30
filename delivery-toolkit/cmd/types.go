package cmd

import "github.com/revanite-io/sci/layer2"

type CompiledCatalog struct {
	Metadata       layer2.Metadata  `yaml:"metadata"`
	ReleaseDetails []ReleaseDetails `yaml:"release-details"`

	// These lists contain the common and specific entries smashed together
	ControlFamilies []layer2.ControlFamily `yaml:"control-families"`
	Capabilities    []layer2.Capability
	Threats         []layer2.Threat
}

type ReleaseDetails struct {
	Version            string         `yaml:"version"`
	AssuranceLevel     string         `yaml:"assurance-level"`
	ThreatModelURL     string         `yaml:"threat-model-url"`
	ThreatModelAuthor  string         `yaml:"threat-model-author"`
	RedTeam            string         `yaml:"red-team"`
	RedTeamExerciseURL string         `yaml:"red-team-exercise-url"`
	ReleaseManager     ReleaseManager `yaml:"release-manager"`
	ChangeLog          []string       `yaml:"change-log"`
	Contributors       []Contributors `yaml:"contributors"`
}

type ReleaseManager struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github-id"`
	Company  string `yaml:"company"`
	Summary  string `yaml:"summary"`
}

type Contributors struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github-id"`
	Company  string `yaml:"company"`
}

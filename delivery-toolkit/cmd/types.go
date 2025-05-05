package cmd

import "github.com/revanite-io/sci/pkg/layer2"

type CompiledCatalog struct {
	Metadata             layer2.Metadata  `yaml:"metadata"`
	ReleaseDetails       []ReleaseDetails `yaml:"release_details"`
	LatestReleaseDetails ReleaseDetails

	// These lists contain the common and specific entries smashed together
	ControlFamilies []layer2.ControlFamily
	Capabilities    []layer2.Capability
	Threats         []layer2.Threat
}

type ReleaseDetails struct {
	Version            string         `yaml:"version"`
	AssuranceLevel     string         `yaml:"assurance_level"`
	ThreatModelURL     string         `yaml:"threat_model_url"`
	ThreatModelAuthor  string         `yaml:"threat_model_author"`
	RedTeam            string         `yaml:"red_team"`
	RedTeamExerciseURL string         `yaml:"red_team_exercise_url"`
	ReleaseManager     ReleaseManager `yaml:"release_manager"`
	ChangeLog          []string       `yaml:"change_log"`
	Contributors       []Contributors `yaml:"contributors"`
}

type ReleaseManager struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github_id"`
	Company  string `yaml:"company"`
	Summary  string `yaml:"summary"`
}

type Contributors struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github_id"`
	Company  string `yaml:"company"`
}

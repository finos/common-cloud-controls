package cmd

import "github.com/ossf/gemara/layer2"

type CompiledCatalog struct {
	layer2.Catalog
	ReleaseDetails []ReleaseDetails `yaml:"release-details"`
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
	Quote    string `yaml:"quote"`
}

type Contributors struct {
	Name     string `yaml:"name"`
	GithubId string `yaml:"github-id"`
	Company  string `yaml:"company"`
}

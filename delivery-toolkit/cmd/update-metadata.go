package cmd

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/go-github/v53/github"
	"github.com/revanite-io/gemara/layer2"
	"github.com/spf13/cobra"
	"golang.org/x/oauth2"
	"gopkg.in/yaml.v3"
)

type cccMetadata struct {
	Metadata       layer2.Metadata  `yaml:"metadata"`
	ReleaseDetails []ReleaseDetails `yaml:"release-details"`
}

var (
	// baseCmd represents the base command when called without any subcommands
	UpdateMetadata = &cobra.Command{
		Use:   "update-metadata",
		Short: "",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			fmt.Print(Divider)
			fmt.Print(Logo)
			fmt.Println(Divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(Divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) < 1 {
				fmt.Println("Please stipulate a directory to update.")
				return
			}

			err := updateMetadata(args[0])
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("Metadata has been updated successfully: %s\n", args[0])
			}
		},
	}
)

func updateMetadata(path string) (err error) {
	// Replace with your GitHub personal access token
	accessToken := os.Getenv("GITHUB_TOKEN")
	repoOwner := "finos"
	repoName := "common-cloud-controls"

	// Create a new OAuth2 token for GitHub API access
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: accessToken},
	)
	tc := oauth2.NewClient(ctx, ts)

	// Create a new GitHub client
	client := github.NewClient(tc)

	// Fetch the list of commits from the repository
	cleanedPath := strings.Replace(filepath.ToSlash(path), "../", "", 1)

	opts := &github.CommitsListOptions{
		Path: cleanedPath,
	}
	commits, _, err := client.Repositories.ListCommits(ctx, repoOwner, repoName, opts)
	if err != nil {
		log.Fatal("Error fetching commits: ", err)
	}

	metadata := getMetadataYaml(filepath.Join(path, "metadata.yaml"))

	if len(metadata.ReleaseDetails) == 0 {
		log.Fatal("Release details not provided: ", metadata)
	}

	changelog, contributors := parseCommits(commits)

	metadata.ReleaseDetails[0].ChangeLog = changelog
	metadata.ReleaseDetails[0].Contributors = removeDuplicates(contributors)

	// Marshal the updated struct back to YAML
	metadataData, err := yaml.Marshal(&metadata)
	if err != nil {
		log.Fatal("Error marshaling YAML: ", err)
	}

	err = os.WriteFile(filepath.Join(path, "metadata.yaml"), metadataData, os.FileMode(0666))
	if err != nil {
		log.Fatal("Error writing to the YAML file: ", err)
	}

	fmt.Println("Contributors and Change Log has been updated.")
	return
}

func parseCommits(commits []*github.RepositoryCommit) ([]string, []Contributors) {
	var contributors []Contributors
	changelog := []string{}

	for _, commit := range commits {
		if commit.Commit != nil {
			// Get the commit author's name and GitHub username
			commitAuthorName := commit.Commit.Author.GetName()
			var commitAuthorLogin string
			if commit.Author != nil && commit.Author.Login != nil {
				commitAuthorLogin = *commit.Author.Login
			} else {
				log.Fatalf("No GitHub username found for commit: %s", commit.Commit.GetSHA())
			}

			// Get the company for this GitHub ID
			company, err := GetCompanyByGithubID(commitAuthorLogin)
			if err != nil {
				// If we can't find the company, use a fallback value
				company = "Unknown"
				fmt.Printf("Warning: Could not find company for GitHub ID '%s': %v\n", commitAuthorLogin, err)
			}

			// Add the contributor to the map (set-like behavior)
			newContributor := Contributors{
				Name:     commitAuthorName,
				GithubId: commitAuthorLogin,
				Company:  company,
			}
			contributors = append(contributors, newContributor)

			// Collect changelog details
			commitMessage := *commit.Commit.Message

			// Split the commit message into lines to filter out lines like "Co-authored-by:"
			lines := strings.Split(commitMessage, "\n")
			filteredMessage := ""
			for _, line := range lines {
				// Filter out "Co-authored-by:" and other unwanted patterns
				if !strings.HasPrefix(line, "Co-authored-by:") && !strings.HasPrefix(line, "Signed-off-by:") {
					filteredMessage += line
				}
			}

			// Format the changelog entry
			changelog = append(changelog, filteredMessage)
		}
	}
	return changelog, contributors
}

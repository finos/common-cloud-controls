package cmd

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/go-github/v53/github"
	"github.com/ossf/gemara/layer2"
	"github.com/spf13/cobra"
	"golang.org/x/oauth2"
	"gopkg.in/yaml.v3"
)

type cccMetadata struct {
	Metadata       layer2.Metadata  `yaml:"metadata"`
	ReleaseDetails []ReleaseDetails `yaml:"release-details"`
}

var (
	BuildDirectoryPath string
	MetadataFilePath   string

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

			MetadataFilePath = filepath.Join(args[0], "metadata.yaml")

			err := updateMetadata()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("Metadata has been updated successfully: %s\n", MetadataFilePath)
			}
		},
	}
)

func updateMetadata() (err error) {
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
	cleanedPath := strings.Replace(filepath.ToSlash(BuildDirectoryPath), "../", "", 1)

	opts := &github.CommitsListOptions{
		Path: cleanedPath,
	}
	commits, _, err := client.Repositories.ListCommits(ctx, repoOwner, repoName, opts)
	if err != nil {
		log.Fatalf("Error fetching commits: %v", err)
	}

	// Store unique contributors
	var contributors []Contributors

	// Collect the changelog information
	changelog := []string{}

	// Process commits to extract contributors and changelog details
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
			company, err := GetCompanyByGithubID(commitAuthorLogin)
			if err != nil {
				company = ""
			}
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

	// Read YAML
	metadata := getMetadataYaml()

	if len(metadata.ReleaseDetails) == 0 {
		metadata.ReleaseDetails = []ReleaseDetails{
			{
				Version:   "REPLACE_ME",
				ChangeLog: []string{},
				Contributors: []Contributors{
					{
						Name:     "REPLACE_ME",
						GithubId: "REPLACE_ME",
						Company:  "REPLACE_ME",
					},
				},
			},
		}
	}
	// Update metadata struct to include change log and contributors
	metadata.ReleaseDetails[0].ChangeLog = changelog
	metadata.ReleaseDetails[0].Contributors = removeDuplicates(contributors)

	// Marshal the updated struct back to YAML
	metadataData, err := yaml.Marshal(&metadata)
	if err != nil {
		log.Fatalf("Error marshaling YAML: %v", err)
	}

	err = os.WriteFile(MetadataFilePath, metadataData, os.FileMode(0666))
	if err != nil {
		log.Fatalf("Error writing to the YAML file: %v", err)
	}

	fmt.Println("Contributors and Change Log has been updated.")
	return
}

func getMetadataYaml() cccMetadata {
	// Read the YAML file
	yamlFile, err := os.ReadFile(MetadataFilePath)
	if err != nil {
		log.Fatalf("Error reading YAML file: %v", err)
	}

	var data cccMetadata
	// Unmarshal the YAML into the struct
	err = yaml.Unmarshal(yamlFile, &data)
	if err != nil {
		log.Fatalf("Error unmarshaling YAML: %v", err)
	}

	return data
}

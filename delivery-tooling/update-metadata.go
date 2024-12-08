package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/go-github/v53/github"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"golang.org/x/oauth2"
	"gopkg.in/yaml.v3"
)

var (
	BuildDirectoryPath string
	MetadataFilePath   string

	// baseCmd represents the base command when called without any subcommands
	updateMetadataCmd = &cobra.Command{
		Use:   "update-metadata",
		Short: "",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			fmt.Print(divider)
			fmt.Print(logo)
			fmt.Println(divider)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fmt.Println(divider)
		},
		Run: func(cmd *cobra.Command, args []string) {
			checkArgs()

			servicesDir := viper.GetString("services-dir")
			buildTarget := viper.GetString("build-target")

			BuildDirectoryPath = filepath.Join(servicesDir, buildTarget)
			MetadataFilePath = filepath.Join(BuildDirectoryPath, "metadata.yaml")

			err := updateMetadata()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("Metadata has been updated successfully: %s\n", MetadataFilePath)
			}
		},
	}
)

func init() {
	baseCmd.AddCommand(updateMetadataCmd)
}

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
			// Add the contributor to the map (set-like behavior)
			newContributor := Contributors{
				Name:     commitAuthorName,
				GithubId: commitAuthorLogin,
				Company:  "REPLACE_ME",
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

func getMetadataYaml() Metadata {
	// Read the YAML file
	yamlFile, err := os.ReadFile(MetadataFilePath)
	if err != nil {
		log.Fatalf("Error reading YAML file: %v", err)
	}

	// Create a ReleaseDetails struct to hold the data
	var metadata Metadata

	// Unmarshal the YAML into the struct
	err = yaml.Unmarshal(yamlFile, &metadata)
	if err != nil {
		log.Fatalf("Error unmarshaling YAML: %v", err)
	}

	return metadata
}

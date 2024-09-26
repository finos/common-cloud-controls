package main

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Global Variables
var (
	releaseNotesTemplatePath = "templates/release-notes.md"
)

// releaseNotesCmd represents the releaseNotesCmd command
//
// This variable is used to define the md command and its subcommands.
// It is used in the init function to add the command to the root command.
// The Run function is the entry point for the md command.
// The PersistentPreRun and PersistentPostRun functions are used to print a divider and the logo before and after the command is executed, respectively.
//
// Example usage:
//   releaseNotesCmd := &cobra.Command{
//     Use:   "release-notes",
//     Short: "Generate an Release Notes",
//     Run: func(cmd *cobra.Command, args []string) {
//       // Command logic
//     },
//   }
var (
	// baseCmd represents the base command when called without any subcommands
	releaseNotesCmd = &cobra.Command{
		Use: "release-notes",
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
			initializeOutputDirectory()

			outputPath, err := generateReleaseNotes()
			if err != nil {
				fmt.Println(err)
			} else {
				fmt.Printf("File generated successfully: %s\n", outputPath)
			}		
		},
	}
)

// init adds the subcommand to the root command
//
// This function is called automatically when the package is included in the main.go file.
// It sets up the command-line arguments and flags for the subcommand.
//
// Parameters:
//   - baseCmd: The root command to which the subcommand should be added.
//
// Returns: None
//
// No return value is specified since this function does not return a value.
//
// Example usage:
//   init(baseCmd)
func init() {
	baseCmd.AddCommand(releaseNotesCmd)
}

// generateReleaseNotes generates the release notes based on the provided template
//
// This function reads the catalog data, parses the template file, and generates the release notes file.
//
// Parameters: None
//
// Returns:
//   - outputPath: The path of the generated release notes file
//   - err: An error if the generation fails
//
// The function returns the path of the generated release notes file and an error if the generation fails.
//
// Example usage:
//   outputPath, err := generateReleaseNotes()
//   if err != nil {
//     fmt.Println(err)
//   } else {
//     fmt.Printf("File generated successfully: %s\n", outputPath)
//   }
func generateReleaseNotes() (outputPath string, err error) {
	data := readAndCompileCatalog()

	mdFileName := "release_notes.md"
	outputPath = filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		err = fmt.Errorf("error creating output file %s: %w", outputPath, err)
		return
	}
	defer outputFile.Close()

	tmpl, err := template.ParseFiles(releaseNotesTemplatePath)
	if err != nil {
		err = fmt.Errorf("error parsing template file %s: %w", releaseNotesTemplatePath, err)
		return
	}

	err = tmpl.Execute(outputFile, data)
	if err != nil {
		err = fmt.Errorf("error executing template for file %s: %w", outputPath, err)
		return
	}

	return
}
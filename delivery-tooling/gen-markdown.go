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
	catalogTemplatePath = "templates/catalog.md"
)
const cssStyle = `<style>
body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  margin: 1in;
}
h1, h2, h3 {
  color: #2E86C1;
}
p {
  line-height: 1.6;
}
</style>
`

// mdCmd represents the md command
//
// This variable is used to define the md command and its subcommands.
// It is used in the init function to add the command to the root command.
// The Run function is the entry point for the md command.
// The PersistentPreRun and PersistentPostRun functions are used to print a divider and the logo before and after the command is executed, respectively.
//
// Example usage:
//   mdCmd := &cobra.Command{
//     Use:   "md",
//     Short: "Generate an Omnibus Markdown file",
//     Run: func(cmd *cobra.Command, args []string) {
//       // Command logic
//     },
//   }
var (
	// baseCmd represents the base command when called without any subcommands
	mdCmd = &cobra.Command{
		Use: "md",
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

			outputPath, err := generateOmnibusMdFile()
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
	baseCmd.AddCommand(mdCmd)
}

// generateFileFromTemplate creates a Markdown file from a template using the provided CompiledCatalog.
//
// This function performs the following steps:
// 1. Constructs the output file name using the service name and version from the CompiledCatalog.
// 2. Creates the output file in the directory specified by the "output-dir" configuration.
// 3. Parses the template file specified by the global catalogTemplatePath variable.
// 4. Executes the template with the provided CompiledCatalog and writes the result to the output file.
//
//
// Returns:
//   - outputPath: The full path of the generated Markdown file.
//   - err: An error if any step in the process fails, nil otherwise.
//
// The function will return an error if it fails to create the output file,
// parse the template, or execute the template.
func generateOmnibusMdFile() (outputPath string, err error) {
    data := readAndCompileCatalog()

    serviceName := data.Metadata.ID
    version := data.Metadata.ReleaseDetails[len(data.Metadata.ReleaseDetails)-1].Version
    mdFileName := fmt.Sprintf("%s_%s.md", serviceName, version)
    outputPath = filepath.Join(viper.GetString("output-dir"), mdFileName)

    outputFile, err := os.Create(outputPath)
    if err != nil {
        return "", fmt.Errorf("error creating output file %s: %w", outputPath, err)
    }
    defer outputFile.Close()

    // Write the CSS to the file first
    _, err = outputFile.WriteString(cssStyle)
    if err != nil {
        return "", fmt.Errorf("error writing CSS to file %s: %w", outputPath, err)
    }

    // Read SVGs from folder
    svgFolder := "./logos" // Adjust this path as needed
    svgs, err := readSVGsFromFolder(svgFolder)
    if err != nil {
        return "", fmt.Errorf("error reading SVGs from folder: %w", err)
    }

    // Read and print template content
    templateContent, err := os.ReadFile(catalogTemplatePath)
    if err != nil {
        return "", fmt.Errorf("error reading template file: %w", err)
    }

	// Updated template content
	contentWithPageBreaks:=addPageBreaksBeforeH2(templateContent)

    // Create and parse template
    tmpl, err := template.New("catalog").Funcs(template.FuncMap{
        "insertSVGs": func() template.HTML {
            return combineSVGs(svgs)
        },
    }).Parse(string(contentWithPageBreaks))
    if err != nil {
        return "", fmt.Errorf("error parsing template: %w", err)
    }

    // Execute template
    err = tmpl.Execute(outputFile, data)
    if err != nil {
        return "", fmt.Errorf("error executing template: %w", err)
    }

    return outputPath, nil
}
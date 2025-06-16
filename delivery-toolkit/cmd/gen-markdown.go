package cmd

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
    margin: 0.2in; /* Updated margin to 0.2in */
    font-size: 11pt; /* Standard font size for professional documents */
    line-height: 1.5; /* Standard line height */
    color: #333333; /* Darker text color for better contrast */
}

h1, h2, h3 {
    color: #1A5276; /* More subtle shade for headings */
    margin-top: 0.5in; /* Consistent spacing before headings */
    margin-bottom: 0.2in; /* Reduced spacing after headings */
    font-weight: bold;
}

h1 {
    font-size: 18pt;
}

h2 {
    font-size: 16pt;
}

h3 {
    font-size: 14pt;
}

p {
    margin-bottom: 0.15in; /* Clear separation between paragraphs */
}

code, pre {
    background-color: #f8f8f8;
    padding: 0.2in; /* Uniform padding for code blocks */
    border: 1px solid #dddddd; /* Subtle border for code blocks */
    border-radius: 4px; /* Rounded corners for a modern look */
    font-family: 'Courier New', Courier, monospace; /* Monospace font for code */
    font-size: 10pt; /* Slightly smaller for code */
    overflow-x: auto; /* Handles long code lines */
}

blockquote {
    margin: 0.5in 0;
    padding: 0.3in;
    background-color: #f5f5f5;
    border-left: 5px solid #cccccc; /* Classic blockquote style */
    color: #666666;
    font-style: italic;
}

ul, ol {
    margin: 0.5in 0; /* Consistent margin for lists */
    padding-left: 1in; /* Indentation for lists */
}

@page {
    margin: 0.2in; /* Increased page margin for professional layout */
}
</style>
`

var (
	// baseCmd represents the base command when called without any subcommands
	GenerateMarkdown = &cobra.Command{
		Use:   "md",
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
			// checkArgs()
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

// generateFileFromTemplate creates a Markdown control catalog from a template
// uses the values from viper.GetString("services-dir"), viper.GetString("build-target")
// respectively: --services-dir, --build-target
func generateOmnibusMdFile() (outputPath string, err error) {
	data := readAndCompileCatalog()

	serviceName := data.Metadata.Id
	version := data.LatestReleaseDetails.Version
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
	svgLogoPath := "./logos/logo_wall.svg"
	svgContent, err := os.ReadFile(svgLogoPath)
	if err != nil {
		return "", fmt.Errorf("error reading SVG file %s: %w", svgLogoPath, err)
	}

	// Read and print template content
	templateContent, err := os.ReadFile(catalogTemplatePath)
	if err != nil {
		return "", fmt.Errorf("error reading template file: %w", err)
	}

	// Updated template content
	contentWithPageBreaks := addPageBreaksBeforeH2(templateContent)

	// Create and parse template
	tmpl, err := template.New("catalog").Funcs(template.FuncMap{
		"insertLogoWall": func() template.HTML {
			return template.HTML(svgContent)
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

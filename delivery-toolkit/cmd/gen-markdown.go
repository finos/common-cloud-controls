package cmd

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	catalogTemplatePath = "templates/catalog.md"
	logoPath            = "./logos/logo_wall.svg"
)

var (
	// GenerateMarkdown represents the command to generate the markdown catalog
	GenerateMarkdown = &cobra.Command{
		Use:   "md",
		Short: "Generate a markdown catalog from the compiled data",
		Run:   runGenerateMarkdown,
	}
)

func runGenerateMarkdown(cmd *cobra.Command, args []string) {
	initializeOutputDirectory()

	outputPath, err := generateOmnibusMdFile()
	if err != nil {
		fmt.Printf("Error generating markdown file: %v\n", err)
	} else {
		fmt.Printf("File generated successfully: %s\n", outputPath)
	}
}

var (
	htmlRegex  = regexp.MustCompile(`<[^>]*>`)
	spaceRegex = regexp.MustCompile(`\s+`)
)

func safe(s string) string {
	// 1. Remove HTML tags
	s = htmlRegex.ReplaceAllString(s, "")
	// 2. Replace newlines with a space
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", "") // Also remove carriage returns
	// 3. Remove pipe characters that would break markdown tables
	s = strings.ReplaceAll(s, "|", "")
	// 4. Collapse multiple spaces into a single space and trim
	s = spaceRegex.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func generateOmnibusMdFile() (string, error) {
	data := readAndCompileCatalog()
	if data == nil {
		return "", fmt.Errorf("no data available to generate markdown")
	}

	serviceName := data.Metadata.Id
	version := lastReleaseDetails(data.ReleaseDetails).Version
	mdFileName := fmt.Sprintf("%s_%s.md", serviceName, version)
	outputPath := filepath.Join(viper.GetString("output-dir"), mdFileName)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return "", fmt.Errorf("error creating output file: %w", err)
	}
	defer outputFile.Close()

	if err := writeCss(outputFile); err != nil {
		return "", err
	}

	svgContent, err := os.ReadFile(logoPath)
	if err != nil {
		return "", fmt.Errorf("error reading SVG file: %w", err)
	}

	templateContent, err := os.ReadFile(catalogTemplatePath)
	if err != nil {
		return "", fmt.Errorf("error reading template file: %w", err)
	}

	contentWithPageBreaks := addPageBreaksBeforeH2(templateContent)

	tmpl, err := template.New("catalog").Funcs(template.FuncMap{
		"insertLogoWall":     func() template.HTML { return template.HTML(svgContent) },
		"lastReleaseDetails": lastReleaseDetails,
		"safe":               safe,
	}).Parse(string(contentWithPageBreaks))
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	if err := tmpl.Execute(outputFile, data); err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	return outputPath, nil
}

func lastReleaseDetails(releases []ReleaseDetails) ReleaseDetails {
	if len(releases) == 0 {
		return ReleaseDetails{}
	}
	return releases[len(releases)-1]
}

func writeCss(file *os.File) error {
	_, err := file.WriteString(cssStyle)
	if err != nil {
		return fmt.Errorf("error writing CSS to file: %w", err)
	}
	return nil
}

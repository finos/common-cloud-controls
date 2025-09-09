package cmd

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/ossf/gemara/layer2"
	"github.com/spf13/viper"
)

const (
	catalogTemplatePath = "templates/catalog.md"
	logoPath            = "./logos/logo_wall.svg"
)

// (GenerateMarkdown command removed; replaced by GenerateReleaseArtifacts)

// (runGenerateMarkdown removed; replaced by GenerateReleaseArtifacts)

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

func generateOmnibusMdFile(catalog *layer2.Catalog) (string, error) {
	mdFileName := fmt.Sprintf("%s_%s.md", catalog.Metadata.Id, catalog.Metadata.Version)
	outputPath := filepath.Join(viper.GetString("output-dir"), mdFileName)

	releaseDetails := getReleaseDetails(filepath.Join(viper.GetString("catalogs-dir"), viper.GetString("build-target")))
	compiledCatalog := CompiledCatalog{
		Catalog:        *catalog,
		ReleaseDetails: releaseDetails,
	}

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
		"insertLogoWall":       func() template.HTML { return template.HTML(svgContent) },
		"latestReleaseDetails": latestReleaseDetails,
		"safe":                 safe,
	}).Parse(string(contentWithPageBreaks))
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	if err := tmpl.Execute(outputFile, compiledCatalog); err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	return outputPath, nil
}

func latestReleaseDetails(releases []ReleaseDetails) ReleaseDetails {
	if len(releases) == 0 {
		return ReleaseDetails{}
	}
	return releases[0]
}

func writeCss(file *os.File) error {
	_, err := file.WriteString(cssStyle)
	if err != nil {
		return fmt.Errorf("error writing CSS to file: %w", err)
	}
	return nil
}

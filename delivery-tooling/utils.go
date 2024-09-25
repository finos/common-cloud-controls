package main

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// createDirectoryIfNotExists creates a directory if it doesn't exist
// It takes a filePath string as input and returns an error if any
func createDirectoryIfNotExists(filePath string) error {
	err := os.MkdirAll(filePath, 0755)
    if err != nil {
        return fmt.Errorf("failed to create directory: %v", err)
    }
    return nil
}

func readSVGsFromFolder(folderPath string) ([]string, error) {
    var svgs []string
    
    files, err := os.ReadDir(folderPath)
    if err != nil {
        return nil, fmt.Errorf("error reading directory %s: %w", folderPath, err)
    }

    for _, file := range files {
        if filepath.Ext(file.Name()) == ".svg" {
            content, err := os.ReadFile(filepath.Join(folderPath, file.Name()))
            if err != nil {
                return nil, fmt.Errorf("error reading SVG file %s: %w", file.Name(), err)
            }
            svgs = append(svgs, string(content))
        }
    }
    
    return svgs, nil
}

func combineSVGs(svgs []string) template.HTML {
    var svgContents []string
    for _, content := range svgs {
        // Wrap each SVG in a div with fixed width and height
        svgContents = append(svgContents, fmt.Sprintf(`<div style="width: 200px; height: 200px; margin: 10px; display: flex; justify-content: center; align-items: center;">%s</div>`, content))
    }
    
    combinedSVG := `<div style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; max-width: 500px; margin: auto;">` + 
        strings.Join(svgContents,"") + 
        `</div>`

    return template.HTML(combinedSVG)
}

func addPageBreaksBeforeH2(content []byte) []byte {
    // Regular expression to match H2 headers
    re := regexp.MustCompile(`(?m)^## `)

    // Page break div
    pageBreak := []byte("<div style=\"page-break-after: always;\"></div>\n\n")

    // Replace each H2 header with a page break followed by the header
    return re.ReplaceAllFunc(content, func(match []byte) []byte {
        return append(pageBreak, match...)
    })
}
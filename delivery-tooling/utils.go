package main

import (
	"fmt"
	"os"
	"regexp"
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

func removeDuplicates[T comparable](slice []T) []T {
	uniqueMap := make(map[T]bool)
	var result []T

	for _, item := range slice {
		if _, exists := uniqueMap[item]; !exists {
			uniqueMap[item] = true
			result = append(result, item)
		}
	}

	return result
}

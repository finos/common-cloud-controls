package main

import (
	"fmt"
	"os"
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
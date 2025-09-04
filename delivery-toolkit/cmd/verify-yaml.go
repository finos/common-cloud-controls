package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var (
	VerifyContent = &cobra.Command{
		Use:   "verify",
		Short: "Verify the content of a directory",
		Run:   runVerifyContent,
	}
)

func runVerifyContent(cmd *cobra.Command, args []string) {
	if len(args) < 1 {
		fmt.Println("Please stipulate a directory to verify.")
		return
	}
	verifyAllDirectories(args[0])
}

func verifyAllDirectories(directory string) {
	if _, err := os.Stat(directory); err != nil {
		log.Fatalf("error: %v", err)
	}

	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if _, err := loadContent(path); err != nil {
				if strings.Contains(err.Error(), "missing") || !strings.Contains(err.Error(), "skipping") {
					log.Printf("error: %s: %v <<<", path, err)
				}
			} else {
				log.Printf("verified: %s", path)
			}
		}
		return nil
	})

	if err != nil {
		log.Fatalf("error: %v", err)
	}
}

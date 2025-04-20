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
	// baseCmd represents the base command when called without any subcommands
	VerifyContent = &cobra.Command{
		Use:   "verify",
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
			if len(args) < 1 {
				fmt.Println("Please stipulate a directory to verify.")
				return
			}
			verifyAllDirectories(args[0])
		},
	}
)

func verifyAllDirectories(directory string) {
	_, err := os.Stat(directory)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	err = filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			_, err = loadContent(path)
			if err != nil {
				if strings.Contains(err.Error(), "missing") {
					log.Printf("error: %s: %v <<<", path, err)
				} else if !strings.Contains(err.Error(), "skipping") {
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

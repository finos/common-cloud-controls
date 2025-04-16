package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/revanite-io/sci/pkg/layer2"
	"github.com/spf13/cobra"
)

var (
	// baseCmd represents the base command when called without any subcommands
	verifyCmd = &cobra.Command{
		Use:   "verify",
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
			fmt.Println(args[0])
			verifyAllDirectories(args[0])
		},
	}
)

// init adds the yaml command to the root command and sets up the necessary flags and configurations.
//
// This function is called automatically when the package is initialized.
// It sets up the yamlCmd with the appropriate configuration and adds it to the root command.
// The yamlCmd is then executed when the program is run with the 'yaml' command.
func init() {
	baseCmd.AddCommand(verifyCmd)
}

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
			_, err = verifyContent(path)
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

func verifyContent(directory string) (data layer2.Catalog, err error) {
	_, err = os.Stat(directory)
	if err != nil {
		return
	}
	var missing []string
	_, err = os.Stat(filepath.Join(directory, "controls.yaml"))
	if err != nil {
		missing = append(missing, "controls.yaml")
	}
	_, err = os.Stat(filepath.Join(directory, "capabilities.yaml"))
	if err != nil {
		missing = append(missing, "capabilities.yaml")
	}
	_, err = os.Stat(filepath.Join(directory, "threats.yaml"))
	if err != nil {
		missing = append(missing, "threats.yaml")
	}
	if len(missing) >= 3 {
		return data, fmt.Errorf("skipping: %s", directory)
	} else if len(missing) > 0 {
		return data, fmt.Errorf("missing %v", missing)
	}
	err = data.LoadFiles([]string{
		filepath.Join(directory, "controls.yaml"),
		filepath.Join(directory, "capabilities.yaml"),
		filepath.Join(directory, "threats.yaml"),
	})
	return data, err
}

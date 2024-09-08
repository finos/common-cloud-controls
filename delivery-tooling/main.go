package main

import (
	"fmt"
	"io/ioutil"
	"log"

	"gopkg.in/yaml.v3"
)

func main() {
	outputDir := parseArgs()
	data := readAndCompile()
	// pretty print data yaml with indentation
	dataYaml, err := yaml.Marshal(&data)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	// print to output file outputDir/compiled-controls.yaml
	// err = ioutil.WriteFile("compiled-controls.yaml", dataYaml, 0644)
	err = ioutil.WriteFile(fmt.Sprintf("%s/compiled-controls.yaml", outputDir), dataYaml, 0644)
	if err != nil {
		log.Fatalf("error: %v", err)
	}
	

	// fmt.Printf("Data read successfully: %+v\n", data) // Debug print


	// Create or open the Markdown file based on the YAML id value
	// mdFile, err := os.Create(fmt.Sprintf("%s/%s.md", outputDir, data.CategoryID))
	// if err != nil {
	// 	log.Fatalf("error: %v", err)
	// }
	// defer mdFile.Close()

	// // Write the Markdown content
	// writeMarkdown(mdFile, data)
}

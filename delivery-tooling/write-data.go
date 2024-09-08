package main

import (
	"os"
)

func writeMarkdown(file *os.File, data ControlSet) {
	// Write the header
	// fmt.Fprintf(file, "# %s: Object Storage\n\n", data.CategoryID)
	// fmt.Fprintf(file, "| Control Id | Service Taxonomy Id | Control |\n")
	// fmt.Fprintf(file, "| ---------- | ------------------- | ------- |\n")

	// // Write the controls table
	// for _, control := range data.Controls {
	// 	fmt.Fprintf(file, "| %s  | %s          | %s |\n", control.ID, control.ID, control.Title)
	// }

	// fmt.Fprintf(file, "\n---\n\n")

	// // Write the details for each control
	// for _, control := range data.Controls {
	// 	fmt.Fprintf(file, "## %s: %s\n\n", control.ID, control.Title)
	// 	fmt.Fprintf(file, "- Corresponding Feature: %s\n", control.ID)
	// 	fmt.Fprintf(file, "- NIST CSF: %s\n", control.NISTCSF)
	// 	fmt.Fprintf(file, "- MITRE ATT&CK TTP: %s\n\n", control.MITREAttack)
	// 	fmt.Fprintf(file, "### Objective\n\n")
	// 	fmt.Fprintf(file, "%s\n\n", control.Objective)
	// 	fmt.Fprintf(file, "### Control Mappings\n\n")

	// 	for key, values := range control.ControlMappings {
	// 		fmt.Fprintf(file, "- %s: %s\n", key, formatList(values))
	// 	}

	// 	fmt.Fprintf(file, "\n### Testing Requirements\n\n")
	// 	fmt.Fprintf(file, "The following validations must be performed against corresponding Control Implementation capabilities to ensure the Control Objective is thoroughly assessed:\n\n")

	// 	for key, value := range control.TestRequirements {
	// 		test_requirement_id := fmt.Sprintf("%s.%s", control.ID, key)
	// 		fmt.Fprintf(file, "1. **%s**: %s\n", test_requirement_id, value)
	// 	}

	// 	fmt.Fprintf(file, "\n---\n\n")
	// }
}
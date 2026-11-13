package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFilterServicesFromExclusionsCSV(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "exclusions.csv")
	content := "api,cloud\nkubernetes,aws\nkubernetes,gcp\nadmission-webhook,aws\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	excl, err := loadWholeAPIExclusions(path)
	if err != nil {
		t.Fatal(err)
	}

	got := filterServices([]string{"virtual-machines", "kubernetes"}, "aws", excl)
	if len(got) != 1 || got[0] != "virtual-machines" {
		t.Fatalf("aws filter = %v, want [virtual-machines]", got)
	}

	got = filterServices([]string{"virtual-machines", "kubernetes"}, "azure", excl)
	if len(got) != 2 {
		t.Fatalf("azure filter = %v, want both services", got)
	}

	got = filterServices([]string{"virtual-machines", "kubernetes"}, "gcp", excl)
	if len(got) != 1 || got[0] != "virtual-machines" {
		t.Fatalf("gcp filter = %v, want [virtual-machines]", got)
	}
}

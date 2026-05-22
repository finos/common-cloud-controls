package runner

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvironment(t *testing.T) {
	t.Parallel()
	path := writeTempEnv(t, `
instances:
  - id: test-instance
    properties:
      provider: aws
      region: us-east-1
    services:
      - type: object-storage
        bucket-name: my-bucket
`)
	cfg, err := LoadEnvironment(path)
	if err != nil {
		t.Fatalf("LoadEnvironment: %v", err)
	}
	if len(cfg.Instances) != 1 {
		t.Fatalf("Instances len = %d, want 1", len(cfg.Instances))
	}
	inst := cfg.Instances[0]
	if inst.ID != "test-instance" {
		t.Errorf("ID = %q, want test-instance", inst.ID)
	}
	if inst.CloudParams().Provider != "aws" {
		t.Errorf("Provider = %q, want aws", inst.CloudParams().Provider)
	}
	props := inst.ServiceProperties("object-storage")
	if props["bucket-name"] != "my-bucket" {
		t.Errorf("bucket-name = %v", props["bucket-name"])
	}
}

func TestFindInstance(t *testing.T) {
	t.Parallel()
	path := writeTempEnv(t, `
instances:
  - id: inst-1
    properties:
      provider: azure
  - id: inst-2
    properties:
      provider: aws
`)
	cfg, err := LoadEnvironment(path)
	if err != nil {
		t.Fatal(err)
	}
	got, err := FindInstance(cfg, "inst-1")
	if err != nil {
		t.Fatalf("FindInstance: %v", err)
	}
	if got.ID != "inst-1" {
		t.Errorf("ID = %q, want inst-1", got.ID)
	}
	if _, err := FindInstance(cfg, "missing"); err == nil {
		t.Error("expected error for missing instance")
	}
}

func writeTempEnv(t *testing.T, raw string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "env.yaml")
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

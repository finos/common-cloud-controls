package runner

import (
	"bytes"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/cucumber/gherkin/go/v26"
	messages "github.com/cucumber/messages/go/v21"
)

func TestCollectFeaturePathsIncludesKubernetesSharedFeatures(t *testing.T) {
	repoRoot := t.TempDir()
	featuresRoot := filepath.Join(repoRoot, "modules", "features")
	expected := []string{
		filepath.Join(featuresRoot, "kubernetes", "CCC.K8S"),
		filepath.Join(featuresRoot, "generic", "CCC.Core"),
		filepath.Join(featuresRoot, "port", "CCC.Core"),
		filepath.Join(featuresRoot, "vpc", "CCC.Core"),
	}
	for _, path := range expected {
		if err := os.MkdirAll(path, 0o755); err != nil {
			t.Fatalf("create feature directory %q: %v", path, err)
		}
	}

	paths, err := collectFeaturePaths(repoRoot, "kubernetes")
	if err != nil {
		t.Fatalf("collectFeaturePaths returned an error: %v", err)
	}
	for _, path := range expected {
		if !slices.Contains(paths, path) {
			t.Errorf("collectFeaturePaths() missing %q; got %v", path, paths)
		}
	}
}

func TestKubernetesFeaturesParse(t *testing.T) {
	kubernetesPaths, err := filepath.Glob(filepath.Join("..", "features", "kubernetes", "*", "*.feature"))
	if err != nil {
		t.Fatalf("glob Kubernetes features: %v", err)
	}
	if len(kubernetesPaths) != 46 {
		t.Fatalf("expected 46 Kubernetes feature files, got %d", len(kubernetesPaths))
	}
	paths := append([]string{}, kubernetesPaths...)
	for _, pattern := range []string{
		filepath.Join("..", "features", "generic", "CCC.Core", "*.feature"),
		filepath.Join("..", "features", "vpc", "CCC.Core", "*.feature"),
	} {
		sharedPaths, globErr := filepath.Glob(pattern)
		if globErr != nil {
			t.Fatalf("glob shared features %q: %v", pattern, globErr)
		}
		paths = append(paths, sharedPaths...)
	}
	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("read %q: %v", path, err)
			continue
		}
		if _, err := gherkin.ParseGherkinDocument(bytes.NewReader(content), (&messages.Incrementing{}).NewId); err != nil {
			t.Errorf("parse %q: %v", path, err)
		}
	}
}

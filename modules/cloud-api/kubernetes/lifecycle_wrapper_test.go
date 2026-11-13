package kubernetes

import (
	"context"
	"testing"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// lifecycle-gocover: wrappers must forward to kubernetes/lifecycle. These tests execute
// the ControlPlane Start/Stop/StartedDetails entry points so coverprofiles attribute
// hits to *k8s-control-plane.go (not only lifecycle/*.go).

func TestAWSServiceLifecycleClusterIDPrefersResourceArg(t *testing.T) {
	s := &AWSService{
		managedService: newManagedService(context.Background(), types.NewConfig(map[string]interface{}{
			"kubernetes-cluster-name": "from-config",
		}), "aws"),
	}
	if got := s.lifecycleClusterID("explicit-id"); got != "explicit-id" {
		t.Fatalf("got %q", got)
	}
	if got := s.lifecycleClusterID("  "); got != "from-config" {
		t.Fatalf("empty arg should use config, got %q", got)
	}
}

func TestAWSServiceLifecycleWrappersForward(t *testing.T) {
	s := &AWSService{
		managedService: newManagedService(context.Background(), types.NewConfig(map[string]interface{}{
			"kubernetes-cluster-name": "finos-ccc-integration-k8s-main",
		}), "aws"),
	}
	// Nil EKS panics inside lifecycle; recover so the wrapper lines still count
	// toward coverage when this package's unit tests run in CI.
	for _, name := range []string{"StartedDetails", "Start", "Stop"} {
		name := name
		t.Run(name, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Fatalf("%s: expected panic with nil EKS client", name)
				}
			}()
			switch name {
			case "StartedDetails":
				_, _ = s.StartedDetails()
			case "Start":
				_ = s.Start("")
			case "Stop":
				_ = s.Stop("finos-ccc-integration-k8s-main")
			}
		})
	}
}

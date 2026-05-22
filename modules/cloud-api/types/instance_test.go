package types

import (
	"testing"

	"gopkg.in/yaml.v3"
)

func TestServiceConfig_UnmarshalYAML(t *testing.T) {
	t.Parallel()
	raw := `
type: object-storage
bucket-name: test-bucket
retention-days: 2
`
	var svc ServiceConfig
	if err := yaml.Unmarshal([]byte(raw), &svc); err != nil {
		t.Fatalf("UnmarshalYAML: %v", err)
	}
	if svc.Type != "object-storage" {
		t.Errorf("Type = %q, want object-storage", svc.Type)
	}
	if svc.Properties["bucket-name"] != "test-bucket" {
		t.Errorf("bucket-name = %v", svc.Properties["bucket-name"])
	}
}

func TestInstanceConfig_ServiceProperties(t *testing.T) {
	t.Parallel()
	ic := InstanceConfig{
		Services: []ServiceConfig{
			{Type: "vpc", Properties: map[string]interface{}{"bad-vpc-id": "vpc-bad"}},
		},
	}
	props := ic.ServiceProperties("vpc")
	if props["bad-vpc-id"] != "vpc-bad" {
		t.Errorf("ServiceProperties() = %v", props)
	}
	cfg := ic.VpcServiceConfig()
	if cfg.BadVpcId != "vpc-bad" {
		t.Errorf("VpcServiceConfig().BadVpcId = %q, want vpc-bad", cfg.BadVpcId)
	}
}

package runner

import (
	"os"
	"testing"
)

func TestInstanceFromVarsTestIdentities(t *testing.T) {
	t.Setenv("AZURE_TENANT_ID", "tenant-1")
	t.Setenv("AZURE_SUBSCRIPTION_ID", "sub-1")
	t.Setenv("AZURE_TEST_USER_READ_CLIENT_ID", "client-read")
	t.Setenv("AZURE_TEST_USER_READ_CLIENT_SECRET", "secret-read")
	t.Setenv("AZURE_TEST_USER_READ_OBJECT_ID", "obj-read")

	vars := map[string]interface{}{
		"provider":              "azure",
		"region":                "eastus",
		"azure-subscription-id": "${AZURE_SUBSCRIPTION_ID}",
		"test-identities": map[string]interface{}{
			"testUserRead": map[string]interface{}{
				"user-name":       "cfi-demo-test-user-read",
				"client_id":       "${AZURE_TEST_USER_READ_CLIENT_ID}",
				"client_secret":   "${AZURE_TEST_USER_READ_CLIENT_SECRET}",
				"tenant_id":       "${AZURE_TENANT_ID}",
				"object_id":       "${AZURE_TEST_USER_READ_OBJECT_ID}",
				"subscription_id": "${AZURE_SUBSCRIPTION_ID}",
			},
		},
	}

	ic, err := InstanceFromVars(vars, "object-storage", "demo")
	if err != nil {
		t.Fatalf("InstanceFromVars: %v", err)
	}
	props := ic.ServiceProperties("object-storage")
	if props == nil {
		t.Fatal("object-storage service properties missing")
	}
	raw, ok := props["test-identities"]
	if !ok {
		t.Fatal("test-identities not in service properties")
	}
	idents, ok := raw.(map[string]interface{})
	if !ok {
		t.Fatalf("test-identities type = %T", raw)
	}
	read, ok := idents["testUserRead"].(map[string]interface{})
	if !ok {
		t.Fatalf("testUserRead type = %T", idents["testUserRead"])
	}
	if got := read["client_id"]; got != "client-read" {
		t.Errorf("client_id = %v, want client-read", got)
	}
	if got := read["client_secret"]; got != "secret-read" {
		t.Errorf("client_secret = %v, want secret-read", got)
	}
	if ic.Properties.AzureSubscriptionID != "sub-1" {
		t.Errorf("AzureSubscriptionID = %q, want sub-1", ic.Properties.AzureSubscriptionID)
	}
}

func TestInstanceFromVarsRequiresProvider(t *testing.T) {
	_, err := InstanceFromVars(map[string]interface{}{}, "object-storage", "x")
	if err == nil {
		t.Fatal("expected error without provider")
	}
}

func TestExpandVars(t *testing.T) {
	os.Setenv("FOO", "bar")
	defer os.Unsetenv("FOO")

	out := ExpandVars(map[string]interface{}{
		"x": "${FOO}",
	})
	if out["x"] != "bar" {
		t.Errorf("x = %v, want bar", out["x"])
	}
}

func TestExpandVarsInstanceIDNotCorrupted(t *testing.T) {
	t.Setenv("INSTANCE_ID", "20260408t161043z")

	out := ExpandVars(map[string]interface{}{
		"azure-resource-group": "cfi_test_${INSTANCE_ID}",
		"instance-id":          "${INSTANCE_ID}",
	})
	if got := out["azure-resource-group"]; got != "cfi_test_20260408t161043z" {
		t.Errorf("azure-resource-group = %v", got)
	}
}

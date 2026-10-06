package integrationtesting_test

import (
	"strings"
	"testing"
)

func TestLoadExclusionsRejectsAll(t *testing.T) {
	_, err := loadExclusions("api,cloud,method\nkubernetes,all,\n")
	if err == nil {
		t.Fatal("expected error for cloud=all")
	}
}

func TestLoadCallRowsAppliesExclusions(t *testing.T) {
	calls := strings.Join([]string{
		"api,method,cloud,expect_error,arg1,arg2,arg3,arg4,arg5",
		"kubernetes,CheckUserProvisioned,all,,,,,",
		"kubernetes,GetKubernetesClient,all,,,,,",
		"admission-webhook,SetBackendAvailability,all,,finos-ccc-integration-k8s-main,true,,",
		"serverless-computing,CheckUserProvisioned,all,,,,,",
		"logging,QueryLogs,azure,,finos-ccc-integration-k8s-main,admin,60,,",
	}, "\n") + "\n"
	exclusions := strings.Join([]string{
		"api,cloud,method",
		"kubernetes,aws,",
		"kubernetes,gcp,",
		"admission-webhook,aws,",
		"admission-webhook,gcp,",
	}, "\n") + "\n"

	awsRows, err := loadCallRowsWithExclusions(calls, exclusions, "aws")
	if err != nil {
		t.Fatalf("aws: %v", err)
	}
	assertAPIs(t, awsRows, []string{"serverless-computing"})

	azureRows, err := loadCallRowsWithExclusions(calls, exclusions, "azure")
	if err != nil {
		t.Fatalf("azure: %v", err)
	}
	assertAPIs(t, azureRows, []string{
		"kubernetes", "kubernetes", "admission-webhook", "serverless-computing", "logging",
	})

	gcpRows, err := loadCallRowsWithExclusions(calls, exclusions, "gcp")
	if err != nil {
		t.Fatalf("gcp: %v", err)
	}
	assertAPIs(t, gcpRows, []string{"serverless-computing"})
}

func TestLoadCallRowsMethodExclusion(t *testing.T) {
	calls := strings.Join([]string{
		"api,method,cloud,expect_error,arg1,arg2,arg3,arg4,arg5",
		"logging,QueryLogs,all,,finos-ccc-integration-fn-main,admin,60,,",
		"logging,GetOrProvisionTestableResources,all,,,,,",
	}, "\n") + "\n"
	exclusions := "api,cloud,method\nlogging,aws,QueryLogs\n"

	rows, err := loadCallRowsWithExclusions(calls, exclusions, "aws")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	assertAPIs(t, rows, []string{"logging"})
	if rows[0].Method != "GetOrProvisionTestableResources" {
		t.Fatalf("got method %q, want GetOrProvisionTestableResources", rows[0].Method)
	}
}

func TestEmbeddedExclusionsSkipKubernetesOnAWS(t *testing.T) {
	rows, err := loadCallRows(integrationCallsCSV, "aws")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	for _, row := range rows {
		if row.API == "kubernetes" || row.API == "admission-webhook" {
			t.Fatalf("unexpected excluded api %q method %q on aws", row.API, row.Method)
		}
		if row.API == "logging" && strings.Contains(strings.Join(row.Args, " "), "k8s-main") {
			t.Fatalf("unexpected k8s logging row on aws: %+v", row)
		}
	}
}

func assertAPIs(t *testing.T, rows []callRow, want []string) {
	t.Helper()
	got := make([]string, len(rows))
	for i, row := range rows {
		got[i] = row.API
	}
	if len(got) != len(want) {
		t.Fatalf("apis = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("apis = %v, want %v", got, want)
		}
	}
}

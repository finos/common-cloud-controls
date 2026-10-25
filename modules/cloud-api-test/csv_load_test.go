package integrationtesting_test

import (
	"testing"
)

func TestLoadCallRowsAccessMethod(t *testing.T) {
	rows, err := loadCallRows(integrationCallsCSV, "azure")
	if err != nil {
		t.Fatal(err)
	}
	var direct, invoke, empty int
	for _, row := range rows {
		switch row.AccessMethod {
		case "direct":
			direct++
			if row.API != "kubernetes" && row.API != "admission-webhook" {
				t.Fatalf("direct is kube-only, got %s %s", row.API, row.Method)
			}
		case "command-invoke":
			invoke++
			if row.Cloud != "azure" {
				t.Fatalf("command-invoke row cloud=%q", row.Cloud)
			}
		case "":
			empty++
		default:
			t.Fatalf("unexpected access_method %q on %s %s", row.AccessMethod, row.API, row.Method)
		}
	}
	if invoke != 3 {
		t.Fatalf("azure command-invoke rows: got %d want 3", invoke)
	}
	if direct == 0 {
		t.Fatal("expected kubernetes/admission-webhook direct rows")
	}
	if empty == 0 {
		t.Fatal("expected non-kube rows with empty access_method")
	}

	awsRows, err := loadCallRows(integrationCallsCSV, "aws")
	if err != nil {
		t.Fatal(err)
	}
	for _, row := range awsRows {
		if row.AccessMethod == "command-invoke" {
			t.Fatal("aws job should drop azure-only command-invoke rows")
		}
	}
}

func TestLoadCallRowsMissingAccessMethodColumn(t *testing.T) {
	csv := "api,method,cloud,expect_error,identity,arg1,arg2,arg3,arg4,arg5\n" +
		"kubernetes,StartedDetails,all,,,,,,,\n"
	rows, err := loadCallRowsWithExclusions(csv, "api,cloud\n", "azure")
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("got %d rows", len(rows))
	}
	if rows[0].AccessMethod != "" {
		t.Fatalf("missing column should be empty, got %q", rows[0].AccessMethod)
	}
}

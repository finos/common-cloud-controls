package integrationtesting_test

import (
	_ "embed"
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

//go:embed integration_calls.csv
var integrationCallsCSV string

//go:embed integration_exclusions.csv
var integrationExclusionsCSV string

const integrationServiceID = "integration"

func providerConfigFile(provider string) string {
	return strings.ToLower(provider) + ".yml"
}

type callRow struct {
	API         string
	Method      string
	Cloud       string
	ExpectError bool
	Args        []string
}

// exclusionSet maps "api|cloud" for whole-API skips.
type exclusionSet map[string]struct{}

func loadExclusions(csvData string) (exclusionSet, error) {
	r := csv.NewReader(strings.NewReader(csvData))
	r.Comment = '#'
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) < 1 {
		return exclusionSet{}, nil
	}
	header := records[0]
	col := map[string]int{}
	for i, h := range header {
		col[strings.TrimSpace(h)] = i
	}
	for _, required := range []string{"api", "cloud"} {
		if _, ok := col[required]; !ok {
			return nil, fmt.Errorf("exclusions: missing column %q", required)
		}
	}
	get := func(rec []string, name string) string {
		i, ok := col[name]
		if !ok || i >= len(rec) {
			return ""
		}
		return strings.TrimSpace(rec[i])
	}
	out := exclusionSet{}
	for _, rec := range records[1:] {
		if len(rec) == 0 {
			continue
		}
		api := get(rec, "api")
		cloud := strings.ToLower(get(rec, "cloud"))
		if api == "" || cloud == "" {
			continue
		}
		if cloud == "all" {
			return nil, fmt.Errorf("exclusions: cloud %q is not allowed; use aws, azure, or gcp", cloud)
		}
		out[api+"|"+cloud] = struct{}{}
	}
	return out, nil
}

func (e exclusionSet) matches(api, method, provider string) bool {
	if e == nil {
		return false
	}
	_, ok := e[api+"|"+provider]
	return ok
}

func loadCallRows(csvData, provider string) ([]callRow, error) {
	return loadCallRowsWithExclusions(csvData, integrationExclusionsCSV, provider)
}

func loadCallRowsWithExclusions(csvData, exclusionsCSV, provider string) ([]callRow, error) {
	exclusions, err := loadExclusions(exclusionsCSV)
	if err != nil {
		return nil, err
	}
	r := csv.NewReader(strings.NewReader(csvData))
	r.Comment = '#'
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) < 2 {
		return nil, fmt.Errorf("csv has no data rows")
	}
	header := records[0]
	col := map[string]int{}
	for i, h := range header {
		col[strings.TrimSpace(h)] = i
	}
	for _, required := range []string{"api", "method"} {
		if _, ok := col[required]; !ok {
			return nil, fmt.Errorf("missing column %q", required)
		}
	}
	argCols := []string{"arg1", "arg2", "arg3", "arg4", "arg5"}
	for _, a := range argCols[:4] {
		if _, ok := col[a]; !ok {
			return nil, fmt.Errorf("missing column %q", a)
		}
	}

	provider = strings.ToLower(strings.TrimSpace(provider))
	var rows []callRow
	for _, rec := range records[1:] {
		if len(rec) == 0 || strings.TrimSpace(rec[col["api"]]) == "" {
			continue
		}
		get := func(name string) string {
			i, ok := col[name]
			if !ok || i >= len(rec) {
				return ""
			}
			return strings.TrimSpace(rec[i])
		}
		method := get("method")
		if method == "" {
			continue
		}
		api := get("api")
		if strings.HasPrefix(method, "Delete") &&
			(api != "object-storage" || (method != "DeleteObject" && method != "DeleteBucket")) {
			continue
		}
		cloud := strings.ToLower(get("cloud"))
		if cloud == "" {
			cloud = "all"
		}
		if cloud != "all" && cloud != provider {
			continue
		}
		if exclusions.matches(api, method, provider) {
			continue
		}
		expectErr := false
		if raw := strings.ToLower(get("expect_error")); raw == "true" || raw == "yes" || raw == "1" {
			expectErr = true
		}
		args := make([]string, 0, len(argCols))
		for _, a := range argCols {
			args = append(args, get(a))
		}
		rows = append(rows, callRow{
			API:         get("api"),
			Method:      method,
			Cloud:       cloud,
			ExpectError: expectErr,
			Args:        args,
		})
	}
	return rows, nil
}

func privateerConfigRoot() string {
	if v := os.Getenv("INTEGRATION_CONFIG_ROOT"); v != "" {
		return v
	}
	_, file, _, _ := runtime.Caller(0)
	return filepath.Clean(filepath.Join(filepath.Dir(file), "privateer-config"))
}

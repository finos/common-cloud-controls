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

const integrationServiceID = "integration"

func providerConfigFile(provider string) string {
	return strings.ToLower(provider) + ".yml"
}

type callRow struct {
	API    string
	Method string
	Args   []string
}

func loadCallRows(csvData string) ([]callRow, error) {
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
	argCols := []string{"arg1", "arg2", "arg3", "arg4"}
	for _, a := range argCols {
		if _, ok := col[a]; !ok {
			return nil, fmt.Errorf("missing column %q", a)
		}
	}

	var rows []callRow
	for _, rec := range records[1:] {
		if len(rec) == 0 || strings.TrimSpace(rec[col["api"]]) == "" {
			continue
		}
		get := func(name string) string {
			i := col[name]
			if i >= len(rec) {
				return ""
			}
			return strings.TrimSpace(rec[i])
		}
		method := get("method")
		if method == "" || strings.HasPrefix(method, "Delete") {
			continue
		}
		args := make([]string, 0, len(argCols))
		for _, a := range argCols {
			args = append(args, get(a))
		}
		rows = append(rows, callRow{
			API:    get("api"),
			Method: method,
			Args:   args,
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

package main

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

// wholeAPIExclusions maps "api|cloud".
type wholeAPIExclusions map[string]struct{}

func loadWholeAPIExclusions(path string) (wholeAPIExclusions, error) {
	if strings.TrimSpace(path) == "" {
		return nil, nil
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open exclusions: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.Comment = '#'
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse exclusions: %w", err)
	}
	if len(records) < 1 {
		return wholeAPIExclusions{}, nil
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

	out := wholeAPIExclusions{}
	for _, rec := range records[1:] {
		if len(rec) == 0 {
			continue
		}
		api := get(rec, "api")
		cloud := strings.ToLower(get(rec, "cloud"))
		if api == "" || cloud == "" {
			continue
		}
		out[api+"|"+cloud] = struct{}{}
	}
	return out, nil
}

func (e wholeAPIExclusions) excluded(api, provider string) bool {
	if e == nil {
		return false
	}
	_, ok := e[api+"|"+strings.ToLower(strings.TrimSpace(provider))]
	return ok
}

func filterServices(services []string, provider string, excl wholeAPIExclusions) []string {
	if excl == nil || len(excl) == 0 {
		return services
	}
	out := make([]string, 0, len(services))
	for _, svc := range services {
		if excl.excluded(svc, provider) {
			fmt.Printf("==> skip %s/%s (integration_exclusions.csv)\n", provider, svc)
			continue
		}
		out = append(out, svc)
	}
	return out
}

package cmd

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLatestCoreVersion(t *testing.T) {
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/catalogs/finos-ccc/ccc.core.controls":
			_, _ = w.Write([]byte(`{"catalog_id":"ccc.core.controls","latest_version":"v2026.10","releases":[{"version":"v2026.10"},{"version":"v2026.10-rc1"}]}`))
		case "/v1/catalogs/finos-ccc/ccc.core.threats":
			_, _ = w.Write([]byte(`{"catalog_id":"ccc.core.threats","latest_version":"","releases":[]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer hub.Close()

	got, err := latestCoreVersion(context.Background(), hub.URL, "CCC.Core.Controls")
	if err != nil || got != "v2026.10" {
		t.Fatalf("published core: got %q, %v; want v2026.10", got, err)
	}

	for _, id := range []string{"CCC.Core.Capabilities", "CCC.Core.Threats"} {
		got, err := latestCoreVersion(context.Background(), hub.URL, id)
		if err == nil || !strings.Contains(err.Error(), "no published version") {
			t.Errorf("%s: got %q, %v; want a no-published-version error", id, got, err)
		}
	}
}

//go:build integration

package integrationtesting_test

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"

	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/runner"
)

// Printed from TestMain after the run (go test hides os.Stdout from tests unless -v).
var callReportLines []string

func TestMain(m *testing.M) {
	code := m.Run()
	if len(callReportLines) > 0 {
		report := strings.Join(callReportLines, "")
		fmt.Print(report)
		if path := strings.TrimSpace(os.Getenv("INTEGRATION_RESULTS_FILE")); path != "" {
			if err := os.WriteFile(path, []byte(report), 0o644); err != nil {
				fmt.Fprintf(os.Stderr, "write integration results file: %v\n", err)
			}
		}
	}
	os.Exit(code)
}

func TestCloudAPIIntegration(t *testing.T) {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("INTEGRATION_PROVIDER")))
	if provider == "" {
		t.Fatal("INTEGRATION_PROVIDER is required (aws, azure, or gcp)")
	}

	rows, err := loadCallRows(integrationCallsCSV)
	if err != nil {
		t.Fatalf("load integration_calls.csv: %v", err)
	}
	if len(rows) == 0 {
		t.Fatal("no rows in integration_calls.csv")
	}

	cfgPath := filepath.Join(privateerConfigRoot(), providerConfigFile(provider))
	cfg, err := runner.LoadPrivateerConfig(cfgPath, integrationServiceID)
	if err != nil {
		t.Fatalf("load %s: %v", cfgPath, err)
	}
	if strings.ToLower(cfg.Get("provider")) != provider {
		t.Fatalf("config provider %q does not match INTEGRATION_PROVIDER=%q", cfg.Get("provider"), provider)
	}

	cloudProvider, err := cfg.Provider()
	if err != nil {
		t.Fatalf("provider: %v", err)
	}

	factory.ResetFactoryCache()
	f, err := factory.NewFactory(cloudProvider, cfg)
	if err != nil {
		t.Fatalf("factory: %v", err)
	}
	defer func() {
		if err := f.TearDown(); err != nil {
			t.Logf("factory TearDown: %v", err)
		}
		factory.ResetFactoryCache()
	}()

	services := make(map[string]generic.Service)
	var passed, failed int
	emitCallLine(fmt.Sprintf("integration_calls.csv on provider %s\n", provider), t)
	for _, row := range rows {
		if strings.HasPrefix(row.Method, "Delete") {
			continue
		}
		label := formatCallRow(row)
		svc, err := serviceFor(f, services, row.API)
		if err != nil {
			failed++
			emitCallLine(formatCallResult("FAIL", label, err), t)
			continue
		}
		if err := invokeMethod(svc, row.Method, row.Args); err != nil {
			failed++
			emitCallLine(formatCallResult("FAIL", label, err), t)
			continue
		}
		passed++
		emitCallLine(formatCallResult("PASS", label, nil), t)
	}
	total := passed + failed
	if total == 0 {
		t.Fatal("no API methods were invoked for this provider")
	}
	emitCallLine(fmt.Sprintf("--- %d passed, %d failed (%d total) on %s\n", passed, failed, total, provider), t)
}

func emitCallLine(line string, t *testing.T) {
	callReportLines = append(callReportLines, line)
	t.Log(strings.TrimSuffix(line, "\n"))
}

func formatCallRow(row callRow) string {
	parts := []string{row.API, row.Method}
	for _, a := range trimArgs(row.Args) {
		parts = append(parts, a)
	}
	return strings.Join(parts, " ")
}

func formatCallResult(status, label string, err error) string {
	if err != nil {
		return fmt.Sprintf("%-4s  %s  %v\n", status, label, err)
	}
	return fmt.Sprintf("%-4s  %s\n", status, label)
}

func serviceFor(f factory.Factory, cache map[string]generic.Service, api string) (generic.Service, error) {
	if svc, ok := cache[api]; ok {
		return svc, nil
	}
	svc, err := f.GetServiceAPI(api)
	if err != nil {
		return nil, err
	}
	cache[api] = svc
	return svc, nil
}

func invokeMethod(svc generic.Service, method string, args []string) error {
	if strings.HasPrefix(method, "Delete") {
		return nil
	}
	rv := reflect.ValueOf(svc)
	for rv.Kind() == reflect.Interface && !rv.IsNil() {
		rv = rv.Elem()
	}
	mt, ok := rv.Type().MethodByName(method)
	if !ok {
		return fmt.Errorf("method %q not found on %s", method, rv.Type())
	}
	trimmed := trimArgs(args)
	fnType := mt.Func.Type()
	want := fnType.NumIn() - 1
	if len(trimmed) != want {
		return fmt.Errorf("method wants %d argument(s), CSV has %d", want, len(trimmed))
	}
	in := make([]reflect.Value, fnType.NumIn())
	in[0] = rv
	for i := range trimmed {
		v, err := coerceArg(fnType.In(i+1), trimmed[i])
		if err != nil {
			return fmt.Errorf("arg%d: %w", i+1, err)
		}
		in[i+1] = v
	}
	out := mt.Func.Call(in)
	return firstError(out)
}

func coerceArg(typ reflect.Type, raw string) (reflect.Value, error) {
	switch typ.Kind() {
	case reflect.String:
		return reflect.ValueOf(raw).Convert(typ), nil
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		n, err := strconv.ParseInt(raw, 10, typ.Bits())
		if err != nil {
			return reflect.Value{}, err
		}
		v := reflect.New(typ).Elem()
		v.SetInt(n)
		return v, nil
	case reflect.Bool:
		b, err := strconv.ParseBool(raw)
		if err != nil {
			return reflect.Value{}, err
		}
		return reflect.ValueOf(b).Convert(typ), nil
	default:
		return reflect.Value{}, fmt.Errorf("unsupported parameter type %s", typ)
	}
}

func firstError(out []reflect.Value) error {
	for _, v := range out {
		if v.Kind() != reflect.Interface || v.IsNil() {
			continue
		}
		if e, ok := v.Interface().(error); ok && e != nil {
			return e
		}
	}
	return nil
}

func trimArgs(args []string) []string {
	for len(args) > 0 && args[len(args)-1] == "" {
		args = args[:len(args)-1]
	}
	return args
}

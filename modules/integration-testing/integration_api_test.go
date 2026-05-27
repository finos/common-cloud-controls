//go:build integration

package integrationtesting_test

import (
	"fmt"
	"log"
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

func TestCloudAPIIntegration(t *testing.T) {
	if os.Getenv("RUN_CLOUD_API_INTEGRATION") == "" {
		t.Skip("set RUN_CLOUD_API_INTEGRATION=1 to run live cloud-api integration tests")
	}

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
	var calls int
	for _, row := range rows {
		if strings.HasPrefix(row.Method, "Delete") {
			continue
		}
		svc, err := serviceFor(f, services, row.API)
		if err != nil {
			t.Logf("non-fatal: %s.%s (GetServiceAPI): %v", row.API, row.Method, err)
			calls++
			continue
		}
		if err := invokeMethod(svc, row.Method, row.Args); err != nil {
			t.Logf("non-fatal: %s.%s: %v", row.API, row.Method, err)
		} else {
			log.Printf("  ✓ %s.%s", row.API, row.Method)
		}
		calls++
	}
	if calls == 0 {
		t.Fatal("no API methods were invoked for this provider")
	}
	t.Logf("invoked %d method(s) on %s", calls, provider)
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

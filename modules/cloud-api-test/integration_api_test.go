//go:build integration

package integrationtesting_test

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/generic"
	"github.com/finos/common-cloud-controls/cloud-api/types"
	"github.com/finos/common-cloud-controls/runner"
)

// Printed from TestMain after the run (go test hides os.Stdout from tests unless -v).
var callReportLines []string

// integrationFailedCount is set by TestCloudAPIIntegration for TestMain exit code.
var integrationFailedCount int

// VPC CN02 CSV rows use arg1=auto: resolve subnet via SelectPublicSubnetForTest
// and remember the created ResourceId for Get/Delete.
var vpcAutoLastSubnetID string
var vpcAutoLastResourceID string

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
	if integrationFailedCount > 0 {
		code = 1
	}
	os.Exit(code)
}

func TestCloudAPIIntegration(t *testing.T) {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("INTEGRATION_PROVIDER")))
	if provider == "" {
		t.Fatal("INTEGRATION_PROVIDER is required (aws, azure, or gcp)")
	}

	rows, err := loadCallRows(integrationCallsCSV, provider)
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
	emitCallLine(fmt.Sprintf("%-4s  %8s  %s\n", "STAT", "SECONDS", "CALL"), t)
	for _, row := range rows {
		if !integrationMethodAllowed(row) {
			continue
		}
		if want := strings.TrimSpace(os.Getenv("INTEGRATION_API")); want != "" && row.API != want {
			continue
		}
		if want := strings.TrimSpace(os.Getenv("INTEGRATION_METHOD")); want != "" && row.Method != want {
			continue
		}
		if match := strings.TrimSpace(os.Getenv("INTEGRATION_METHOD_MATCH")); match != "" &&
			!strings.Contains(strings.ToLower(row.Method), strings.ToLower(match)) {
			continue
		}
		label := formatCallRow(row)
		// Incomplete test-identities is always a hard fail (never PASS via expect_error=true).
		if err := identityPrerequisiteError(cfg, row.Identity); err != nil {
			failed++
			emitCallLine(formatCallResult("FAIL", 0, label, err), t)
			continue
		}
		started := time.Now()
		rowFactory, err := factoryForRow(f, cloudProvider, cfg, row)
		var callErr error
		if err != nil {
			callErr = err
		} else {
			var svc generic.Service
			svc, err = serviceFor(rowFactory, services, row.API, row.Identity, row.AccessMethod)
			if err != nil {
				callErr = err
			} else {
				callErr = invokeMethod(svc, cfg, row.Method, row.Args)
			}
		}
		elapsed := time.Since(started).Seconds()
		if recordResult(row.ExpectError, callErr != nil, &passed, &failed) {
			if callErr != nil {
				emitCallLine(formatCallResult("PASS", elapsed, label, fmt.Errorf("expected error: %w", callErr)), t)
			} else {
				emitCallLine(formatCallResult("PASS", elapsed, label, nil), t)
			}
		} else if callErr != nil {
			emitCallLine(formatCallResult("FAIL", elapsed, label, callErr), t)
		} else {
			emitCallLine(formatCallResult("FAIL", elapsed, label, fmt.Errorf("expected error, got nil")), t)
		}
	}
	total := passed + failed
	if total == 0 {
		t.Fatal("no API methods were invoked for this provider")
	}
	integrationFailedCount = failed
	emitCallLine(fmt.Sprintf("--- %d passed, %d failed (%d total) on %s\n", passed, failed, total, provider), t)
	if failed > 0 {
		t.Fatalf("%d integration call(s) failed on %s", failed, provider)
	}
}

// identityPrerequisiteError returns an error when a credentialed CSV row cannot run
// because test-identities are missing or incomplete (e.g. stale CI *_ENV secret).
func identityPrerequisiteError(cfg types.Config, identityKey string) error {
	key := strings.TrimSpace(identityKey)
	if key == "" {
		return nil
	}
	identity, err := cfg.Identity(key)
	if err != nil {
		return fmt.Errorf("incomplete test-identities %q: %w (refresh environment-config / CI *_ENV secret)", key, err)
	}
	if strings.TrimSpace(identity.UserName) == "" {
		return fmt.Errorf("incomplete test-identities %q: empty user-name (refresh CI *_ENV secret)", key)
	}
	if len(identity.Credentials) == 0 {
		return fmt.Errorf("incomplete test-identities %q: no credentials (refresh CI *_ENV secret)", key)
	}
	return nil
}

// recordResult updates pass/fail counts for expect_error semantics. Returns true if the outcome is a pass.
func recordResult(expectError, gotError bool, passed, failed *int) bool {
	if expectError {
		if gotError {
			*passed++
			return true
		}
		*failed++
		return false
	}
	if gotError {
		*failed++
		return false
	}
	*passed++
	return true
}

func emitCallLine(line string, t *testing.T) {
	callReportLines = append(callReportLines, line)
	t.Log(strings.TrimSuffix(line, "\n"))
}

func formatCallRow(row callRow) string {
	parts := []string{row.API, row.Method}
	if am := strings.TrimSpace(row.AccessMethod); am != "" {
		parts = append(parts, "access_method="+am)
	}
	if id := strings.TrimSpace(row.Identity); id != "" {
		parts = append(parts, "identity="+id)
	}
	for _, a := range trimArgs(row.Args) {
		parts = append(parts, a)
	}
	return strings.Join(parts, " ")
}

func factoryForRow(defaultFactory factory.Factory, provider types.CloudProvider, cfg types.Config, row callRow) (factory.Factory, error) {
	switch strings.ToLower(strings.TrimSpace(row.AccessMethod)) {
	case "", "direct":
		return defaultFactory, nil
	case "command-invoke":
		if provider != types.ProviderAzure {
			return nil, fmt.Errorf("access_method command-invoke is azure-only")
		}
		return factory.NewAzureFactory(overlayConfig(cfg, "azure-aks-kube-transport", "command-invoke")), nil
	default:
		return nil, fmt.Errorf("unknown access_method %q", row.AccessMethod)
	}
}

func overlayConfig(cfg types.Config, key, value string) types.Config {
	src := cfg.Vars()
	dst := make(map[string]interface{}, len(src)+1)
	for k, v := range src {
		dst[k] = v
	}
	dst[key] = value
	return types.NewConfig(dst)
}

func formatCallResult(status string, seconds float64, label string, err error) string {
	if err != nil {
		return fmt.Sprintf("%-4s  %8.1f  %s  %v\n", status, seconds, label, err)
	}
	return fmt.Sprintf("%-4s  %8.1f  %s\n", status, seconds, label)
}

func serviceFor(f factory.Factory, cache map[string]generic.Service, api, identity, accessMethod string) (generic.Service, error) {
	key := api
	if id := strings.TrimSpace(identity); id != "" {
		key = api + ":" + id
	}
	if am := strings.TrimSpace(accessMethod); am != "" {
		key = key + "#" + am
	}
	if svc, ok := cache[key]; ok {
		return svc, nil
	}
	var (
		svc generic.Service
		err error
	)
	if id := strings.TrimSpace(identity); id != "" {
		svc, err = f.GetServiceAPIWithIdentity(api, id)
	} else {
		svc, err = f.GetServiceAPI(api)
	}
	if err != nil {
		return nil, err
	}
	cache[key] = svc
	return svc, nil
}

func integrationMethodAllowed(row callRow) bool {
	if !strings.HasPrefix(row.Method, "Delete") {
		return true
	}
	return deleteMethodAllowed(row.API, row.Method)
}

func invokeMethod(svc generic.Service, cfg types.Config, method string, args []string) error {
	rv := reflect.ValueOf(svc)
	for rv.Kind() == reflect.Interface && !rv.IsNil() {
		rv = rv.Elem()
	}
	trimmed := trimArgs(args)
	for i := range trimmed {
		trimmed[i] = substituteConfigArg(cfg, trimmed[i])
	}
	var err error
	trimmed, err = resolveVpcAutoArgs(rv, cfg, method, trimmed)
	if err != nil {
		return err
	}
	mt, ok := rv.Type().MethodByName(method)
	if !ok {
		return fmt.Errorf("method %q not found on %s", method, rv.Type())
	}
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
	rememberVpcAutoResult(method, out)
	return firstError(out)
}

func resolveVpcAutoArgs(rv reflect.Value, cfg types.Config, method string, args []string) ([]string, error) {
	if len(args) == 0 || !strings.EqualFold(args[0], "auto") {
		return args, nil
	}
	switch method {
	case "CreateTestResourceInSubnet":
		if vpcAutoLastSubnetID != "" {
			return []string{vpcAutoLastSubnetID}, nil
		}
		vpcID := strings.TrimSpace(cfg.Get("resource", "uid"))
		if vpcID == "" {
			vpcID = "finos-ccc-integration-vpc"
		}
		mt, ok := rv.Type().MethodByName("SelectPublicSubnetForTest")
		if !ok {
			return nil, fmt.Errorf("auto CreateTestResourceInSubnet: SelectPublicSubnetForTest not found")
		}
		out := mt.Func.Call([]reflect.Value{rv, reflect.ValueOf(vpcID)})
		if err := firstError(out); err != nil {
			return nil, fmt.Errorf("auto SelectPublicSubnetForTest: %w", err)
		}
		rememberVpcAutoResult("SelectPublicSubnetForTest", out)
		if vpcAutoLastSubnetID == "" {
			return nil, fmt.Errorf("auto SelectPublicSubnetForTest: missing SubnetId")
		}
		return []string{vpcAutoLastSubnetID}, nil
	case "GetResourceExternalIpAssignment", "DeleteTestResource":
		if vpcAutoLastResourceID == "" {
			return nil, fmt.Errorf("auto %s: no prior CreateTestResourceInSubnet resource", method)
		}
		return []string{vpcAutoLastResourceID}, nil
	default:
		return args, nil
	}
}

func rememberVpcAutoResult(method string, out []reflect.Value) {
	switch method {
	case "SelectPublicSubnetForTest", "CreateTestResourceInSubnet", "DeleteTestResource":
	default:
		return
	}
	if len(out) == 0 || !out[0].IsValid() {
		return
	}
	v := out[0]
	switch v.Kind() {
	case reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		if v.IsNil() {
			return
		}
	}
	m, ok := v.Interface().(map[string]interface{})
	if !ok {
		return
	}
	switch method {
	case "SelectPublicSubnetForTest":
		if id := strings.TrimSpace(fmt.Sprintf("%v", m["SubnetId"])); id != "" && id != "<nil>" {
			vpcAutoLastSubnetID = id
		}
	case "CreateTestResourceInSubnet":
		if id := strings.TrimSpace(fmt.Sprintf("%v", m["ResourceId"])); id != "" && id != "<nil>" {
			vpcAutoLastResourceID = id
		}
		if id := strings.TrimSpace(fmt.Sprintf("%v", m["SubnetId"])); id != "" && id != "<nil>" {
			vpcAutoLastSubnetID = id
		}
	case "DeleteTestResource":
		vpcAutoLastResourceID = ""
	}
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
	case reflect.Slice:
		parts := splitCSVArg(raw)
		slice := reflect.MakeSlice(typ, 0, len(parts))
		for _, part := range parts {
			elem, err := coerceArg(typ.Elem(), part)
			if err != nil {
				return reflect.Value{}, err
			}
			slice = reflect.Append(slice, elem)
		}
		return slice, nil
	case reflect.Map:
		if typ.Key().Kind() != reflect.String {
			return reflect.Value{}, fmt.Errorf("unsupported map key type %s", typ.Key())
		}
		ptr := reflect.New(typ)
		if err := json.Unmarshal([]byte(raw), ptr.Interface()); err != nil {
			return reflect.Value{}, fmt.Errorf("parse map argument as JSON: %w", err)
		}
		return ptr.Elem(), nil
	default:
		return reflect.Value{}, fmt.Errorf("unsupported parameter type %s", typ)
	}
}

func splitCSVArg(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, part)
	}
	return out
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

func substituteConfigArg(cfg types.Config, raw string) string {
	const prefix = "config:"
	if strings.HasPrefix(raw, prefix) {
		key := strings.TrimPrefix(raw, prefix)
		if v := strings.TrimSpace(cfg.Get(key)); v != "" {
			return v
		}
	}
	return raw
}

func trimArgs(args []string) []string {
	for len(args) > 0 && args[len(args)-1] == "" {
		args = args[:len(args)-1]
	}
	return args
}

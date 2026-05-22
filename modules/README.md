# Go modules

All Go code for CCC cloud testing lives under this directory.

## Workspace

[`go.work`](go.work) links the modules for local development:

| Module | Path |
|--------|------|
| `cloud-api` | [`cloud-api/`](cloud-api/) — provider APIs and shared types |
| `cloud-testing-dsl` | [`cloud-testing-dsl/`](cloud-testing-dsl/) — Cucumber/Godog cloud steps |
| `reporters` | [`reporters/`](reporters/) — HTML, OCSF, summary formatters |
| `runner` | [`runner/`](runner/) — behavioural test runner library and `ccc-compliance` CLI |
| `cfi-testing` | [`cfi-testing/`](cfi-testing/) — env config and `run-compliance-tests.sh` (not a Go module) |
| `privateer-plugin` | [`privateer-plugin/`](privateer-plugin/) — Privateer plugin (same tests as `runner`) |

Build everything:

```bash
export GOWORK=go.work   # when cwd is modules/
for d in cloud-api cloud-testing-dsl reporters runner; do
  (cd "$d" && go build ./...)
done
(cd runner && go build -o ../cfi-testing/ccc-compliance ./cmd/ccc-compliance/)
```

Or run compliance tests (builds the workspace automatically):

```bash
./cfi-testing/run-compliance-tests.sh -e config/azure-storage-finos.yaml -i cfi_test_<suffix>
```

# Go modules

All Go code for CCC cloud testing lives under this directory.

## Workspace

[`go.work`](go.work) links the modules for local development:

| Module | Path |
|--------|------|
| `cloud-api` | [`cloud-api/`](cloud-api/) |
| `cloud-testing-dsl` | [`cloud-testing-dsl/`](cloud-testing-dsl/) |
| `reporters` | [`reporters/`](reporters/) |
| `cfi-testing` | [`cfi-testing/`](cfi-testing/) |

Build everything:

```bash
export GOWORK=go.work   # when cwd is modules/
for d in cloud-api cloud-testing-dsl reporters; do
  (cd "$d" && go build ./...)
done
(cd cfi-testing && go build -o ccc-compliance ./runner/)
```

Or run compliance tests (builds the workspace automatically):

```bash
./cfi-testing/run-compliance-tests.sh -e config/azure-storage-finos.yaml -i cfi_test_<suffix>
```

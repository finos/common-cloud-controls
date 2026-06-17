# Go modules

All Go code for CCC cloud testing lives under this directory.

## Workspace

[`go.work`](go.work) links the modules for local development. CI uses the same workspace via [`.github/actions/setup-go-workspace`](../.github/actions/setup-go-workspace/action.yml) (`go-version-file: modules/go.work`, `GOWORK` enabled).

| Module | Path |
|--------|------|
| `cloud-api` | [`cloud-api/`](cloud-api/) — provider APIs and shared types |
| `cloud-testing-dsl` | [`cloud-testing-dsl/`](cloud-testing-dsl/) — Cucumber/Godog cloud steps |
| `cloud-api-test` | [`cloud-api-test/`](cloud-api-test/) — live integration tests for `cloud-api` against terraform fixtures |
| `reporters` | [`reporters/`](reporters/) — HTML, OCSF, summary formatters |
| `runner` | [`runner/`](runner/) — behavioural test runner library and `ccc-compliance` CLI |
| `ccc-behavioural-plugin` | [`ccc-behavioural-plugin/`](ccc-behavioural-plugin/) — Privateer plugin (same tests as `runner`) |
| `delivery-toolkit` | [`../delivery-toolkit/`](../delivery-toolkit/) — catalog compile CLI (used by website `generate:catalogs` and release workflows) |

Build everything:

```bash
./modules/build.sh
```

Or run compliance tests (builds the workspace automatically):

```bash
../cfi-testing/run-compliance-tests.sh -S <privateer-service> ...
```

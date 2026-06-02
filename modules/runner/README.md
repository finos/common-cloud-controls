# runner

Go library that runs CCC **behavioural** Godog compliance tests: loads Privateer `services.*.vars`, discovers features under `modules/features/`, drives `cloud-api` services, and writes HTML/OCSF reports via `reporters`.

## CLI

```bash
go build -o ccc-compliance ./cmd/ccc-compliance/
./ccc-compliance -config ../cfi-testing/privateer-config/.../azure-cloud-storage.yml -privateer-service azureStorageBehavioural
```

[`cfi-testing`](../cfi-testing) wraps this via `run-compliance-tests.sh` (builds the binary into that directory).

## Consumers

- [`ccc-behavioural-plugin`](../ccc-behavioural-plugin) — Privateer plugin (`runner.Run` in-process)

## API

- `runner.Run(opts Options) int` — full test run
- `runner.LoadPrivateerConfig(path, serviceID)` — read `services.<id>.vars`
- `runner.TestingDir()` — `modules/cfi-testing` (config and default output)
- `runner.RepoRoot()` — repository root

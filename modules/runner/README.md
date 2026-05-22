# runner

Go library that runs CCC **behavioural** Godog compliance tests: loads environment YAML, discovers features under `modules/features/`, drives `cloud-api` services, and writes HTML/OCSF reports via `reporters`.

## CLI

```bash
go build -o ccc-compliance ./cmd/ccc-compliance/
./ccc-compliance -instance main-azure -env-file ../cfi-testing/config/azure-storage-finos.yaml
```

[`cfi-testing`](../cfi-testing) wraps this via `run-compliance-tests.sh` (builds the binary into that directory).

## Consumers

- [`ccc-behavioural-plugin`](../ccc-behavioural-plugin) — Privateer plugin (`runner.Run` in-process)

## API

- `runner.Run(opts Options) int` — full test run
- `runner.LoadEnvironment` / `runner.FindInstance` — environment YAML
- `runner.TestingDir()` — `modules/cfi-testing` (config and default output)
- `runner.RepoRoot()` — repository root

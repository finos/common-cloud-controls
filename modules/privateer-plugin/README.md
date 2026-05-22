# privateer-plugin

Privateer **evaluation** plugin that runs existing CCC **behavioural** Godog scenarios via [runner](../runner) (no Gemara policy checks).

## Install

```bash
go build -o privateer-plugin .
cp privateer-plugin ~/privateer/bin/
```

Or use `privateer install` when published to the registry.

## Config

See [privateer-behavioural-azure.example.yml](../cfi-testing/config/privateer-behavioural-azure.example.yml).

Required `services.<name>.vars`:

| Var | Description |
|-----|-------------|
| `instance` | Instance id from environment YAML (e.g. `azure-storage-finos`) |
| `env-file` | Path to environment/descriptor YAML |
| `service` | Service type (e.g. `object-storage`) |
| `tags` | Optional Cucumber tag filter (e.g. `@Behavioural`) |

## Run

```bash
# Via Privateer host
privateer run -c path/to/config.yml

# Debug (in-process, no RPC)
go run . debug -c ../cfi-testing/config/privateer-behavioural-azure.example.yml -s azureStorageBehavioural
```

Reports (HTML, OCSF, summary) are written to `write-directory` using [reporters](../reporters).

## Development

Uses [privateer-sdk](https://github.com/privateerproj/privateer-sdk) `shared.Pluginer` — does **not** call `EvaluationOrchestrator.Mobilize()`.

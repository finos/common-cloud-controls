# privateer-plugin

Privateer **evaluation** plugin that runs CCC **behavioural** Godog scenarios via [runner](../runner).

Configuration comes from **Privateer** `services.<id>.vars` only (no separate `environment.yaml`).

## Config

See [azure-cloud-storage.yml](../../cfi-testing/privateer-config/azure-cloud-storage.yml).

Required `services.<name>.vars`:

| Var | Description |
|-----|-------------|
| `service` | Godog service type (e.g. `object-storage`) |
| `provider` | Cloud provider (`azure`, `aws`, `gcp`) |
| `instance-id` | Substituted as `${INSTANCE_ID}` in other vars |
| `tags` | Optional Cucumber tag filter (e.g. `@Behavioural`) |
| `testUserNoAccess`, etc. | Pre-provisioned IAM principal **names** |

## Run

```bash
cd modules/privateer-plugin
go build -o privateer-plugin .

# Debug (in-process)
./privateer-plugin debug \
  -c ../../cfi-testing/privateer-config/azure-cloud-storage.yml \
  -s azureStorageBehavioural

# Via Privateer host
privateer run -c cfi-testing/privateer-config/azure-cloud-storage.yml
```

Reports (HTML, OCSF, summary) are written to `write-directory` using [reporters](../reporters).

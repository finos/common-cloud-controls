# Probes

Deployable side services used by behavioural tests and `cloud-api` (not factory services themselves).

| Probe | Purpose |
| ----- | ------- |
| [`admission-webhook/`](admission-webhook/) | In-cluster validating webhook fixture for CN11.AR03 (`failurePolicy=Fail`) |
| [`reachability/`](reachability/) | External DNS/TCP/TLS observer for “untrusted network” probes |

Each subdirectory is its own Go module (see [`../go.work`](../go.work)). Fixture deploy for the webhook is typically via `cloud-api-test/terraform/aws-test-infra/`; reachability is hosted in the FINOS estate and called through `cloud-api/reachability`.

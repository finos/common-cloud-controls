# Probes

Deployable side services used by behavioural tests and `cloud-api` (not factory services themselves).

| Probe | Purpose |
| ----- | ------- |
| [`admission-webhook/`](admission-webhook/) | In-cluster validating webhook fixture for CN11.AR03 (`failurePolicy=Fail`) |
| [`reachability/`](reachability/) | External DNS/TCP/TLS observer for “untrusted network” probes |

Each subdirectory is its own Go module (see [`../go.work`](../go.work)).

## Build then deploy

Integration must exercise the **Go** probe binaries, not placeholders.

```sh
# From repo root — go test, docker build, AWS Lambda zip (probe-lambda.zip)
./modules/probes/build.sh

# AWS estate: update Lambda to provided.al2023 bootstrap + roll webhook image
AWS_REGION=us-east-1 ./modules/probes/deploy-aws.sh
```

`cloud-api-integration` runs `build.sh` for every provider and `deploy-aws.sh` on the AWS matrix leg before fixtures start. Terraform packaging for the reachability Lambda expects `modules/cloud-api-test/terraform/aws/lambda/probe-lambda.zip` (run `build.sh` before `terraform apply`).

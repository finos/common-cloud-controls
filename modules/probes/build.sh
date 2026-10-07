#!/usr/bin/env bash
# Build and verify probe modules before integration / terraform deploy.
# Usage (from repo root or this directory):
#   ./modules/probes/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROBES="$ROOT/modules/probes"
LAMBDA_OUT="$ROOT/modules/cloud-api-test/terraform/aws/lambda"
WEBHOOK_IMAGE="${WEBHOOK_PROBE_IMAGE:-finos-ccc-admission-webhook-probe:local}"
REACHABILITY_IMAGE="${REACHABILITY_PROBE_IMAGE:-finos-ccc-reachability-probe:local}"

mkdir -p "$LAMBDA_OUT"

echo "==> reachability: go test"
(
  cd "$PROBES/reachability"
  go test ./...
)

echo "==> reachability: lambda zip (linux/amd64 bootstrap)"
(
  cd "$PROBES/reachability"
  GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda -trimpath -ldflags='-s -w' -o "$LAMBDA_OUT/bootstrap" .
  rm -f "$LAMBDA_OUT/probe-lambda.zip"
  (cd "$LAMBDA_OUT" && zip -q probe-lambda.zip bootstrap)
  rm -f "$LAMBDA_OUT/bootstrap"
  ls -la "$LAMBDA_OUT/probe-lambda.zip"
)

echo "==> reachability: docker build ($REACHABILITY_IMAGE)"
docker build -f "$PROBES/reachability/Dockerfile" -t "$REACHABILITY_IMAGE" "$ROOT"

echo "==> admission-webhook: go test"
(
  cd "$PROBES/admission-webhook"
  go test ./...
)

echo "==> admission-webhook: docker build ($WEBHOOK_IMAGE)"
docker build -f "$PROBES/admission-webhook/Dockerfile" -t "$WEBHOOK_IMAGE" "$PROBES/admission-webhook"

echo "==> probe build OK"
echo "    lambda zip: $LAMBDA_OUT/probe-lambda.zip"
echo "    images: $REACHABILITY_IMAGE , $WEBHOOK_IMAGE"

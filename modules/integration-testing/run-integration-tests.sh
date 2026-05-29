#!/usr/bin/env bash
# Build and run cloud-api integration tests for one provider.
#
# Usage:
#   ./run-integration-tests.sh aws
#   ./run-integration-tests.sh azure
#   ./run-integration-tests.sh gcp
#
# Prerequisites:
#   - Go toolchain (see modules/go.work)
#   - Terraform fixtures applied for the target cloud
#   - Azure/GCP: user-creation/<cloud>-env.sh (from provision-*-test-users.sh)
#   - AWS: credentials via AWS CLI / env (e.g. aws configure)

set -euo pipefail

usage() {
  echo "Usage: $0 <aws|azure|gcp>" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

CLOUD=$(echo "$1" | tr '[:upper:]' '[:lower:]')
case "$CLOUD" in
  aws | azure | gcp) ;;
  *)
    echo "Unknown cloud: $1 (expected aws, azure, or gcp)" >&2
    usage
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export INTEGRATION_PROVIDER="$CLOUD"
export INTEGRATION_RESULTS_FILE="$SCRIPT_DIR/integration-results-${CLOUD}.txt"

if [[ "$CLOUD" == "azure" || "$CLOUD" == "gcp" ]]; then
  ENV_FILE="$SCRIPT_DIR/user-creation/${CLOUD}-env.sh"
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
  else
    echo "Warning: $ENV_FILE not found — run user-creation/provision-${CLOUD}-test-users.sh" >&2
  fi
fi

if [[ "$CLOUD" == "azure" && -z "${AZURE_LOG_ANALYTICS_WORKSPACE_ID:-}" ]]; then
  TFSTATE="$SCRIPT_DIR/terraform/azure/terraform.tfstate"
  if [[ -f "$TFSTATE" ]] && command -v jq >/dev/null 2>&1; then
    AZURE_LOG_ANALYTICS_WORKSPACE_ID="$(jq -r '.outputs.logging.value.azure_log_analytics_workspace_id // empty' "$TFSTATE" | tr -d '\n')"
    if [[ -n "$AZURE_LOG_ANALYTICS_WORKSPACE_ID" ]]; then
      export AZURE_LOG_ANALYTICS_WORKSPACE_ID
      echo "==> AZURE_LOG_ANALYTICS_WORKSPACE_ID from terraform state"
    fi
  fi
fi

if [[ "$CLOUD" == "gcp" && -z "${GCP_PROJECT_ID:-}" ]] && command -v gcloud >/dev/null 2>&1; then
  GCP_PROJECT_ID="$(gcloud config get-value project 2>/dev/null | tr -d '\n')"
  export GCP_PROJECT_ID
  if [[ -n "$GCP_PROJECT_ID" ]]; then
    echo "==> GCP_PROJECT_ID from gcloud config: $GCP_PROJECT_ID"
  fi
fi

cd "$SCRIPT_DIR"

COVER_PROFILE="coverage-integration-${CLOUD}.out"
COVER_HTML="coverage-integration-${CLOUD}.html"

echo "==> integration-testing (provider=$CLOUD)"
go mod download

echo "==> go test -tags=integration"
go test -tags=integration -timeout=45m -v \
  -coverpkg=../cloud-api/factory/...,../cloud-api/generic/...,../cloud-api/iam/...,../cloud-api/logging/...,../cloud-api/object-storage/...,../cloud-api/serverless-computing/...,../cloud-api/types/...,../cloud-api/virtual-machines/...,../cloud-api/vpc/... \
  -covermode=atomic \
  -coverprofile="$COVER_PROFILE" \
  ./...

echo "==> go tool cover -html"
go tool cover -html="$COVER_PROFILE" -o "$COVER_HTML"

echo ""
echo "Done. Report: $INTEGRATION_RESULTS_FILE"
echo "Coverage: $SCRIPT_DIR/$COVER_PROFILE"
echo "Coverage HTML: $SCRIPT_DIR/$COVER_HTML"

#!/usr/bin/env bash
# Build and run cloud-api integration tests for one provider or all providers.
#
# Usage:
#   ./run-integration-tests.sh aws
#   ./run-integration-tests.sh azure
#   ./run-integration-tests.sh gcp
#   ./run-integration-tests.sh all    # run aws + azure + gcp; merge coverage
#
# Prerequisites:
#   - Go toolchain (see modules/go.work)
#   - Terraform fixtures applied for the target cloud(s)
#   - environment-config/<cloud>-env.sh (from provision-<cloud>.sh) when present

set -euo pipefail

usage() {
  echo "Usage: $0 <aws|azure|gcp|all>" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

TARGET=$(echo "$1" | tr '[:upper:]' '[:lower:]')
case "$TARGET" in
  aws | azure | gcp | all) ;;
  *)
    echo "Unknown target: $1 (expected aws, azure, gcp, or all)" >&2
    usage
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Full cloud-api module (incl. generic/login). Low login % in HTML report is intentional — fix via W-46.
COVERPKG="../cloud-api/..."

setup_cloud_env() {
  local cloud="$1"

  export INTEGRATION_PROVIDER="$cloud"
  export INTEGRATION_RESULTS_FILE="$SCRIPT_DIR/integration-results-${cloud}.txt"

  local env_file="$SCRIPT_DIR/environment-config/${cloud}-env.sh"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
  else
    echo "Warning: $env_file not found — run environment-config/provision-${cloud}.sh" >&2
  fi

  if [[ "$cloud" == "azure" ]]; then
    local tfstate="$SCRIPT_DIR/terraform/azure/terraform.tfstate"
    if [[ -f "$tfstate" ]] && command -v jq >/dev/null 2>&1; then
      if [[ -z "${AZURE_LOG_ANALYTICS_WORKSPACE_ID:-}" ]]; then
        AZURE_LOG_ANALYTICS_WORKSPACE_ID="$(jq -r '.outputs.logging.value.azure_log_analytics_workspace_id // empty' "$tfstate" | tr -d '\n')"
        if [[ -n "$AZURE_LOG_ANALYTICS_WORKSPACE_ID" ]]; then
          export AZURE_LOG_ANALYTICS_WORKSPACE_ID
          echo "==> AZURE_LOG_ANALYTICS_WORKSPACE_ID from terraform state"
        fi
      fi
      if [[ -z "${AZURE_VM_HOSTNAME:-}" ]]; then
        AZURE_VM_HOSTNAME="$(jq -r '.outputs.virtual_machines.value.host_name // empty' "$tfstate" | tr -d '\n')"
        if [[ -n "$AZURE_VM_HOSTNAME" ]]; then
          export AZURE_VM_HOSTNAME
          echo "==> AZURE_VM_HOSTNAME from terraform state"
        fi
      fi
    fi
  fi

  if [[ "$cloud" == "gcp" ]]; then
    local tfstate="$SCRIPT_DIR/terraform/gcp/terraform.tfstate"
    if [[ -z "${GCP_VM_HOSTNAME:-}" && -f "$tfstate" ]] && command -v jq >/dev/null 2>&1; then
      GCP_VM_HOSTNAME="$(jq -r '.outputs.virtual_machines.value.host_name // empty' "$tfstate" | tr -d '\n')"
      if [[ -n "$GCP_VM_HOSTNAME" ]]; then
        export GCP_VM_HOSTNAME
        echo "==> GCP_VM_HOSTNAME from terraform state"
      fi
    fi
    if [[ -z "${GCP_PROJECT_ID:-}" ]] && command -v gcloud >/dev/null 2>&1; then
      GCP_PROJECT_ID="$(gcloud config get-value project 2>/dev/null | tr -d '\n')"
      export GCP_PROJECT_ID
      if [[ -n "$GCP_PROJECT_ID" ]]; then
        echo "==> GCP_PROJECT_ID from gcloud config: $GCP_PROJECT_ID"
      fi
    fi
  fi

  if [[ -z "${STALE_VERSION_ID:-}" ]]; then
    echo "Warning: STALE_VERSION_ID unset — add to environment-config/${cloud}-env.sh (regenerate via provision-${cloud}.sh after secrets terraform apply)" >&2
  fi
}

run_go_test() {
  local cover_profile="${1:-}"

  unset GOCOVERDIR

  local -a cover_args=()
  if [[ -n "$cover_profile" ]]; then
    cover_args=(-coverprofile="$cover_profile")
  fi

  go test -tags=integration -timeout=45m -count=1 -v \
    -coverpkg="$COVERPKG" \
    -covermode=atomic \
    "${cover_args[@]}" \
    ./...
}

write_cover_html() {
  local profile="$1"
  local html="$2"
  go tool cover -html="$profile" -o "$html"
}

merge_cover_profiles() {
  local output="$1"
  shift
  local -a inputs=()

  for profile in "$@"; do
    if [[ -s "$profile" ]]; then
      inputs+=("$profile")
    else
      echo "warning: skipping empty or missing coverage profile: $profile" >&2
    fi
  done

  if [[ ${#inputs[@]} -eq 0 ]]; then
    echo "error: no coverage profiles to merge" >&2
    return 1
  fi
  if [[ ${#inputs[@]} -eq 1 ]]; then
    cp "${inputs[0]}" "$output"
    return 0
  fi

  echo "==> gocovmerge ${inputs[*]}"
  go run github.com/wadey/gocovmerge@latest "${inputs[@]}" >"$output"
}

run_single_cloud() {
  local cloud="$1"

  cd "$SCRIPT_DIR"
  setup_cloud_env "$cloud"

  local cover_profile="coverage-integration-${cloud}.out"
  local cover_html="coverage-integration-${cloud}.html"

  echo "==> cloud-api-test (provider=$cloud)"
  go mod download

  echo "==> go test -tags=integration"
  run_go_test "$cover_profile"

  echo "==> go tool cover -html"
  write_cover_html "$cover_profile" "$cover_html"

  echo ""
  echo "Done. Report: $INTEGRATION_RESULTS_FILE"
  echo "Coverage: $SCRIPT_DIR/$cover_profile"
  echo "Coverage HTML: $SCRIPT_DIR/$cover_html"
}

run_all_clouds() {
  local clouds=(aws azure gcp)
  local failed=0
  local -a profile_paths=()

  cd "$SCRIPT_DIR"
  go mod download

  : >"$SCRIPT_DIR/integration-results-all.txt"

  for cloud in "${clouds[@]}"; do
    echo ""
    echo "========================================"
    echo "==> cloud-api-test (provider=$cloud)"
    echo "========================================"

    setup_cloud_env "$cloud"

    local per_cloud_profile="coverage-integration-${cloud}.out"
    local per_cloud_html="coverage-integration-${cloud}.html"
    profile_paths+=("$SCRIPT_DIR/$per_cloud_profile")

    if run_go_test "$per_cloud_profile"; then
      echo "--- $cloud: PASS"
      echo "[$cloud] PASS" >>"$SCRIPT_DIR/integration-results-all.txt"
    else
      echo "--- $cloud: FAIL"
      echo "[$cloud] FAIL" >>"$SCRIPT_DIR/integration-results-all.txt"
      failed=1
    fi

    if [[ -f "$INTEGRATION_RESULTS_FILE" ]]; then
      {
        echo ""
        echo "===== $cloud ====="
        cat "$INTEGRATION_RESULTS_FILE"
      } >>"$SCRIPT_DIR/integration-results-all.txt"
    fi

    if [[ -s "$per_cloud_profile" ]]; then
      echo "==> go tool cover -html ($cloud)"
      write_cover_html "$per_cloud_profile" "$per_cloud_html"
      echo "Coverage ($cloud): $SCRIPT_DIR/$per_cloud_profile"
    else
      echo "warning: no coverage data written for $cloud" >&2
    fi
  done

  local combined_profile="coverage-integration-all.out"
  local combined_html="coverage-integration-all.html"

  echo ""
  merge_cover_profiles "$combined_profile" "${profile_paths[@]}"

  echo "==> go tool cover -html (combined)"
  write_cover_html "$combined_profile" "$combined_html"

  echo ""
  echo "==> go tool cover -func (combined)"
  go tool cover -func="$combined_profile" | tail -1

  echo ""
  echo "Done. Combined report: $SCRIPT_DIR/integration-results-all.txt"
  echo "Combined coverage: $SCRIPT_DIR/$combined_profile"
  echo "Combined coverage HTML: $SCRIPT_DIR/$combined_html"

  if [[ "$failed" -ne 0 ]]; then
    echo "One or more providers failed — see integration-results-all.txt" >&2
    exit 1
  fi
}

if [[ "$TARGET" == "all" ]]; then
  run_all_clouds
else
  run_single_cloud "$TARGET"
fi

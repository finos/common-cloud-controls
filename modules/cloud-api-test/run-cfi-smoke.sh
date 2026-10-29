#!/usr/bin/env bash
# Minimal CFI-style smoke: Privateer/plugin path with Go coverage on runner + cloud-api.
#
# Builds ccc-behavioural-plugin with -cover, runs aws-secrets via --debug (in-process),
# then converts GOCOVERDIR into coverage-cfi-smoke.out for gocovmerge / Codecov.
#
# Usage (from repo root, with AWS creds + AWS_ENV loaded):
#   ./modules/cloud-api-test/run-cfi-smoke.sh
#
# Env:
#   CFI_SMOKE_GOCOVERDIR  — defaults to modules/cloud-api-test/coverage-cfi-smoke
#   CFI_SMOKE_CONFIG      — Privateer YAML (default: aws-secrets finos-integration)
#   CFI_SMOKE_SERVICE     — Privateer service key (default: awsSecrets)
#   CFI_SMOKE_TAGS        — Godog tags (default: @Behavioural)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODULES_DIR="$REPO_ROOT/modules"
export GOWORK="${GOWORK:-$MODULES_DIR/go.work}"

COVER_DIR="${CFI_SMOKE_GOCOVERDIR:-$SCRIPT_DIR/coverage-cfi-smoke}"
PROFILE_OUT="${CFI_SMOKE_PROFILE:-$SCRIPT_DIR/coverage-cfi-smoke.out}"
CONFIG="${CFI_SMOKE_CONFIG:-$REPO_ROOT/cfi-testing/privateer-config/finos-integration/secrets/aws-secrets.yml}"
PRIVATEER_SERVICE="${CFI_SMOKE_SERVICE:-awsSecrets}"
TAGS="${CFI_SMOKE_TAGS:-@Behavioural}"
BIN_DIR="${PRIVATEER_BINARIES_PATH:-$REPO_ROOT/cfi-testing/.privateer/bin}"
PLUGIN_BINARY="$BIN_DIR/ccc-behavioural-plugin.cover"
# Main package must be in -coverpkg or the binary exits without writing GOCOVERDIR
# (Go emits no covmeta/covcounters when only dependency packages are listed).
COVERPKG="${CFI_SMOKE_COVERPKG:-github.com/finos/common-cloud-controls/ccc-behavioural-plugin,github.com/finos/common-cloud-controls/runner/...,github.com/finos/common-cloud-controls/cloud-api/...}"

mkdir -p "$COVER_DIR" "$BIN_DIR"
rm -rf "$COVER_DIR"/*
rm -f "$PROFILE_OUT"

echo "==> syncing catalogs for $PRIVATEER_SERVICE"
(cd "$MODULES_DIR/runner" && go run ./cmd/ccc-compliance \
  -config "$CONFIG" \
  -privateer-service "$PRIVATEER_SERVICE" \
  -repo-root "$REPO_ROOT" \
  -sync-catalogs-dest "$MODULES_DIR/ccc-behavioural-plugin/catalogs" \
  -sync-catalogs-only)

echo "==> building covered ccc-behavioural-plugin (coverpkg=$COVERPKG)"
(cd "$MODULES_DIR/ccc-behavioural-plugin" && go build -cover -covermode=atomic -coverpkg="$COVERPKG" \
  -o "$PLUGIN_BINARY" .)
chmod +x "$PLUGIN_BINARY"

export CCC_RUNNER_TIMEOUT="${CCC_RUNNER_TIMEOUT:-30m}"
export CCC_RUNNER_TAGS="$TAGS"
export GOCOVERDIR="$COVER_DIR"

echo "==> running CFI smoke (aws-secrets, --debug) with GOCOVERDIR=$COVER_DIR"
set +e
"$PLUGIN_BINARY" debug -c "$CONFIG" -s "$PRIVATEER_SERVICE" -l info
smoke_rc=$?
set -e

echo "==> go tool covdata textfmt → $PROFILE_OUT"
if ! go tool covdata textfmt -i="$COVER_DIR" -o="$PROFILE_OUT"; then
  echo "error: covdata textfmt failed (smoke_rc=$smoke_rc)" >&2
  exit 1
fi

if [[ ! -s "$PROFILE_OUT" ]]; then
  echo "error: empty coverage profile $PROFILE_OUT" >&2
  exit 1
fi

echo "==> cover -func (runner sample)"
go tool cover -func="$PROFILE_OUT" | rg 'runner/BasicServiceRunner|total:' || go tool cover -func="$PROFILE_OUT" | tail -3

if [[ "$smoke_rc" -ne 0 ]]; then
  echo "warning: smoke exited $smoke_rc (coverage still written)" >&2
fi
exit "$smoke_rc"

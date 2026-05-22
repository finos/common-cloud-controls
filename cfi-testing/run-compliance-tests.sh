#!/bin/bash
set -euo pipefail

# CCC CFI Compliance Test Runner — invokes Privateer (pvtr), which runs ccc-behavioural-plugin, which runs Godog.

# Defaults
INSTANCE=""
CONFIG_FILE=""
PRIVATEER_SERVICE="azureStorageBehavioural"
SERVICE=""
OUTPUT_DIR=""
TIMEOUT="30m"
RESOURCE_FILTER=""
TAGS=""
USE_DEBUG=0

usage() {
  cat <<'EOF'
Usage: run-compliance-tests.sh [OPTIONS]

Runs behavioural compliance tests via Privateer:
  run-compliance-tests.sh → pvtr run → ccc-behavioural-plugin → Godog (Cucumber)

Required:
  -i, --instance ID          Instance id or cfi_test_<suffix> (sets INSTANCE_ID for Azure)

Optional:
  -c, --config PATH          Privateer config YAML (default: privateer-config/azure-cloud-storage.yml)
  -e, --env-file PATH        Alias for --config (legacy flag name)
  -S, --privateer-service ID Privateer services.<id> key (default: azureStorageBehavioural)
  -s, --service TYPE         Godog service type in config vars (default: object-storage for Azure storage)
  -o, --output DIR           Report directory (maps to pvtr --write-directory)
  -r, --resource NAME        Filter to a specific resource name
  -g, --tags 'TAG ...'       Cucumber tag filter ANDed with service tags (e.g. '@Behavioural')
  -t, --timeout DURATION     Test timeout (default: 30m)
  --debug                    Run ccc-behavioural-plugin in-process (no pvtr host; for development)
  -h, --help                 Show this help

Environment:
  INSTANCE_ID                Used in ${INSTANCE_ID} placeholders (set automatically for cfi_test_* instances)
  source azure-env.sh        Required for Azure test principal credentials (see ccc-cfi-compliance remote/azure/storageaccount)
  PVTR, PRIVATEER            Privateer CLI binary name (default: first of pvtr, privateer in PATH)

Examples:
  source ../ccc-cfi-compliance/remote/azure/storageaccount/azure-env.sh
  export INSTANCE_ID=20260408t161043z
  ./run-compliance-tests.sh -i cfi_test_20260408t161043z -g '@Behavioural'

  ./run-compliance-tests.sh -c privateer-config/azure-cloud-storage.yml -i cfi_test_20260408t161043z
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--instance) INSTANCE="$2"; shift 2 ;;
    -c|--config) CONFIG_FILE="$2"; shift 2 ;;
    -e|--env-file) CONFIG_FILE="$2"; shift 2 ;;
    -S|--privateer-service) PRIVATEER_SERVICE="$2"; shift 2 ;;
    -s|--service) SERVICE="$2"; shift 2 ;;
    -o|--output) OUTPUT_DIR="$2"; shift 2 ;;
    -t|--timeout) TIMEOUT="$2"; shift 2 ;;
    -r|--resource) RESOURCE_FILTER="$2"; shift 2 ;;
    -g|--tags) TAGS="$2"; shift 2 ;;
    --debug) USE_DEBUG=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "$INSTANCE" ]; then
  echo "Error: --instance is required" >&2
  usage >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODULES_DIR="$REPO_ROOT/modules"
export GOWORK="$MODULES_DIR/go.work"

# cfi_test_<suffix> → INSTANCE_ID + default Azure privateer config
if [[ "$INSTANCE" == cfi_test_* ]]; then
  export INSTANCE_ID="${INSTANCE#cfi_test_}"
  echo "   INSTANCE_ID=$INSTANCE_ID (from resource group prefix)"
elif [[ -z "${INSTANCE_ID:-}" ]]; then
  export INSTANCE_ID="$INSTANCE"
fi

if [ -z "$CONFIG_FILE" ]; then
  CONFIG_FILE="$SCRIPT_DIR/privateer-config/azure-cloud-storage.yml"
fi
if [[ ! "$CONFIG_FILE" = /* ]]; then
  CONFIG_FILE="$SCRIPT_DIR/$CONFIG_FILE"
fi
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: config not found: $CONFIG_FILE" >&2
  exit 1
fi

if [ -z "$SERVICE" ]; then
  SERVICE="object-storage"
fi

# Runner overrides (read by ccc-behavioural-plugin)
export CCC_RUNNER_TIMEOUT="$TIMEOUT"
[ -n "$TAGS" ] && export CCC_RUNNER_TAGS="$TAGS"
[ -n "$RESOURCE_FILTER" ] && export CCC_RUNNER_RESOURCE="$RESOURCE_FILTER"

BINARIES_PATH="${PRIVATEER_BINARIES_PATH:-$SCRIPT_DIR/.privateer/bin}"
mkdir -p "$BINARIES_PATH"
PLUGIN_BINARY="$BINARIES_PATH/ccc-behavioural-plugin"

echo "🔨 Building Go workspace (modules/go.work)..."
BUILD_MODULES=(cloud-api cloud-testing-dsl reporters runner ccc-behavioural-plugin)
for mod in "${BUILD_MODULES[@]}"; do
  echo "   → $mod"
  if ! (cd "$MODULES_DIR/$mod" && go build ./...); then
    echo "❌ Build failed: $mod" >&2
    exit 1
  fi
done

echo "   → ccc-behavioural-plugin (install to $PLUGIN_BINARY)"
if ! (cd "$MODULES_DIR/ccc-behavioural-plugin" && go build -o "$PLUGIN_BINARY" .); then
  echo "❌ Build failed: ccc-behavioural-plugin" >&2
  exit 1
fi
chmod +x "$PLUGIN_BINARY"

# pvtr only runs plugins listed in plugins.json (binary copy alone is not enough).
cat >"$BINARIES_PATH/plugins.json" <<EOF
{
  "plugins": [
    {
      "name": "ccc-behavioural-plugin",
      "version": "local",
      "binaryPath": "ccc-behavioural-plugin"
    }
  ]
}
EOF
echo "   Registered ccc-behavioural-plugin in $BINARIES_PATH/plugins.json"

echo "✅ Build successful"
echo ""

if [ "$USE_DEBUG" -eq 1 ]; then
  echo "🚀 Running via ccc-behavioural-plugin debug (in-process)..."
  DEBUG_ARGS=(
    -c "$CONFIG_FILE"
    -s "$PRIVATEER_SERVICE"
    -l info
  )
  [ -n "$OUTPUT_DIR" ] && DEBUG_ARGS+=(-w "$OUTPUT_DIR")
  exec "$PLUGIN_BINARY" debug "${DEBUG_ARGS[@]}"
fi

PVTR_CMD=""
for candidate in "${PVTR:-}" "${PRIVATEER:-}" pvtr privateer; do
  [ -z "$candidate" ] && continue
  if command -v "$candidate" >/dev/null 2>&1; then
    PVTR_CMD="$candidate"
    break
  fi
done

if [ -z "$PVTR_CMD" ]; then
  echo "Error: Privateer CLI not found (install pvtr: https://github.com/privateerproj/privateer)" >&2
  echo "       Or re-run with --debug to use the plugin binary directly." >&2
  exit 1
fi

PVTR_ARGS=(
  run
  -c "$CONFIG_FILE"
  -s "$PRIVATEER_SERVICE"
  -b "$BINARIES_PATH"
  -l info
)
[ -n "$OUTPUT_DIR" ] && PVTR_ARGS+=(-w "$OUTPUT_DIR")

echo "🚀 Running compliance tests via Privateer ($PVTR_CMD)..."
echo "   Config:  $CONFIG_FILE"
echo "   Service: $PRIVATEER_SERVICE (Godog: $SERVICE)"
echo "   Plugins: $BINARIES_PATH"
echo ""

exec "$PVTR_CMD" "${PVTR_ARGS[@]}"

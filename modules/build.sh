#!/usr/bin/env bash
# Build Go modules linked by modules/go.work.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INVOCATION_DIR="$(pwd)"
export GOWORK="$SCRIPT_DIR/go.work"

resolve_output_path() {
  local path="$1"
  if [[ "$path" == /* ]]; then
    echo "$path"
  else
    echo "$INVOCATION_DIR/$path"
  fi
}

PLUGIN_OUTPUT=""
COMPLIANCE_BIN=""
WITH_INTEGRATION=0
MODULES=()

usage() {
  cat <<'EOF'
Usage: build.sh [OPTIONS] [MODULE...]

Build one or more Go modules from the CCC workspace (modules/go.work).
With no MODULE arguments, all workspace modules are built.

Options:
  --plugin-output PATH    Build ccc-behavioural-plugin to PATH
  --compliance-bin PATH   Build runner/cmd/ccc-compliance to PATH
  --integration           Also build cloud-api-test with -tags=integration
  -h, --help              Show this help

Examples:
  ./build.sh
  ./build.sh runner --compliance-bin ./runner/ccc-compliance
  ./build.sh cloud-api-test --integration
  ./build.sh cloud-api cloud-testing-dsl reporters runner ccc-behavioural-plugin \
    --plugin-output ../cfi-testing/.privateer/bin/ccc-behavioural-plugin
EOF
}

default_modules() {
  sed -n 's|^[[:space:]]*\./||p' "$SCRIPT_DIR/go.work"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plugin-output) PLUGIN_OUTPUT="$2"; shift 2 ;;
    --compliance-bin) COMPLIANCE_BIN="$2"; shift 2 ;;
    --integration) WITH_INTEGRATION=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) MODULES+=("$1"); shift ;;
  esac
done

if [ ${#MODULES[@]} -eq 0 ]; then
  mapfile -t MODULES < <(default_modules)
fi

build_module() {
  local mod="$1"
  local dir="$SCRIPT_DIR/$mod"

  if [ ! -d "$dir" ] || [ ! -f "$dir/go.mod" ]; then
    echo "Unknown module: $mod" >&2
    exit 1
  fi

  echo "→ $mod"
  if ! (cd "$dir" && go build ./...); then
    echo "Build failed: $mod" >&2
    exit 1
  fi

  if [ "$mod" = "cloud-api-test" ] && [ "$WITH_INTEGRATION" -eq 1 ]; then
    echo "→ $mod (integration)"
    if ! (cd "$dir" && go build -tags=integration ./...); then
      echo "Build failed: $mod (integration)" >&2
      exit 1
    fi
  fi

  if [ "$mod" = "runner" ] && [ -n "$COMPLIANCE_BIN" ]; then
    local compliance_out
    compliance_out="$(resolve_output_path "$COMPLIANCE_BIN")"
    mkdir -p "$(dirname "$compliance_out")"
    echo "→ $mod (ccc-compliance → $compliance_out)"
    if ! (cd "$dir" && go build -o "$compliance_out" ./cmd/ccc-compliance/); then
      echo "Build failed: runner/cmd/ccc-compliance" >&2
      exit 1
    fi
  fi

  if [ "$mod" = "ccc-behavioural-plugin" ] && [ -n "$PLUGIN_OUTPUT" ]; then
    local plugin_out
    plugin_out="$(resolve_output_path "$PLUGIN_OUTPUT")"
    mkdir -p "$(dirname "$plugin_out")"
    echo "→ $mod (plugin → $plugin_out)"
    if ! (cd "$dir" && go build -o "$plugin_out" .); then
      echo "Build failed: ccc-behavioural-plugin" >&2
      exit 1
    fi
    chmod +x "$plugin_out"
  fi
}

echo "🔨 Building Go workspace (modules/go.work)..."
for mod in "${MODULES[@]}"; do
  build_module "$mod"
done
echo "✅ Build successful"

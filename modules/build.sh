#!/usr/bin/env bash
# Build Go modules linked by modules/go.work.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export GOWORK="$SCRIPT_DIR/go.work"

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
    echo "→ $mod (ccc-compliance → $COMPLIANCE_BIN)"
    if ! (cd "$dir" && go build -o "$COMPLIANCE_BIN" ./cmd/ccc-compliance/); then
      echo "Build failed: runner/cmd/ccc-compliance" >&2
      exit 1
    fi
  fi

  if [ "$mod" = "ccc-behavioural-plugin" ] && [ -n "$PLUGIN_OUTPUT" ]; then
    mkdir -p "$(dirname "$PLUGIN_OUTPUT")"
    echo "→ $mod (plugin → $PLUGIN_OUTPUT)"
    if ! (cd "$dir" && go build -o "$PLUGIN_OUTPUT" .); then
      echo "Build failed: ccc-behavioural-plugin" >&2
      exit 1
    fi
    chmod +x "$PLUGIN_OUTPUT"
  fi
}

echo "🔨 Building Go workspace (modules/go.work)..."
for mod in "${MODULES[@]}"; do
  build_module "$mod"
done
echo "✅ Build successful"

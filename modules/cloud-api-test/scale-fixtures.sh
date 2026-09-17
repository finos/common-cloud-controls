#!/usr/bin/env bash
# Start/stop/list billable CCC compute fixtures via cloud-api Service lifecycle APIs.
#
# Usage:
#   ./scale-fixtures.sh stop
#       Discover and stop every started CCC VM / k8s fixture across aws+azure+gcp
#       (uses ambient cloud credentials / env vars; no Privateer config required).
#
#   ./scale-fixtures.sh list
#       Print started fixtures; exits 2 if any are still online.
#
#   ./scale-fixtures.sh start -c PATH -S privateerService [-s virtual-machines,kubernetes]
#       Start configured resources (CI bookend).
#
#   ./scale-fixtures.sh stop|list -c PATH -S privateerService ...
#       Targeted mode against a single Privateer config (optional).

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scale-fixtures.sh stop
  scale-fixtures.sh list
  scale-fixtures.sh start -c CONFIG -S PRIVATEER_SERVICE [-s SERVICES]
  scale-fixtures.sh stop|list -c CONFIG -S PRIVATEER_SERVICE [-s SERVICES]

  -c, --config PATH              Privateer config YAML (required for start)
  -S, --privateer-service ID     Privateer services.<id> key (with -config)
  -s, --services LIST            Comma-separated service IDs
                                 (default: virtual-machines,kubernetes)
  -p, --providers LIST           Providers for discover mode (default: aws,azure,gcp)
  -h, --help                     Show help
EOF
}

[[ $# -gt 0 ]] || { usage >&2; exit 1; }

ACTION="$1"
shift
case "$ACTION" in
  start | stop | list) ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown action: $ACTION (expected start, stop, or list)" >&2
    usage >&2
    exit 1
    ;;
esac

CONFIG_FILE=""
PRIVATEER_SERVICE=""
SERVICES="virtual-machines,kubernetes"
PROVIDERS="aws,azure,gcp"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c | --config) CONFIG_FILE="$2"; shift 2 ;;
    -S | --privateer-service) PRIVATEER_SERVICE="$2"; shift 2 ;;
    -s | --services) SERVICES="$2"; shift 2 ;;
    -p | --providers) PROVIDERS="$2"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODULES_DIR="$REPO_ROOT/modules"
export GOWORK="${GOWORK:-$MODULES_DIR/go.work}"

ARGS=(
  -action "$ACTION"
  -services "$SERVICES"
  -providers "$PROVIDERS"
)

if [[ -n "$CONFIG_FILE" ]]; then
  if [[ -z "$PRIVATEER_SERVICE" ]]; then
    echo "Error: -S/--privateer-service is required with -c/--config" >&2
    usage >&2
    exit 1
  fi
  if [[ ! "$CONFIG_FILE" = /* ]]; then
    CONFIG_FILE="$PWD/$CONFIG_FILE"
  fi
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: config not found: $CONFIG_FILE" >&2
    exit 1
  fi
  ARGS+=(-config "$CONFIG_FILE" -privateer-service "$PRIVATEER_SERVICE")
elif [[ "$ACTION" == "start" ]]; then
  echo "Error: start requires -c/--config and -S/--privateer-service" >&2
  usage >&2
  exit 1
fi

cd "$MODULES_DIR/runner"
exec go run ./cmd/ccc-lifecycle "${ARGS[@]}"

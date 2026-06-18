#!/usr/bin/env bash
# Dispatch release.yml workflow runs for selected catalog services.
#
# Each dispatch releases one typed catalog (capabilities, threats, or controls).
# Three dispatches per service attach all asset types to the same GitHub release
# tag (<family>/<service>/<version>).
#
# Usage:
#   batch-release-catalogs.sh --version v2026.06-rc1 [options]
#
# Options:
#   --version VERSION   required release version (e.g. v2026.06-rc1)
#   --preset PRESET     target set: 2026.06-rc1 (default) | all
#   --targets LIST      comma-separated build targets override (family/service paths)
#   --dry-run           pass dry_run=true to release.yml (compile + validate only)
#   --ref REF           git ref for workflow_dispatch (default: main)
#   --repo REPO         GitHub repository (default: finos/common-cloud-controls)
#   --delay SECONDS     pause between dispatches (default: 5)
#   --watch             wait for each workflow run to finish before the next
#   --list              print resolved targets and exit (no dispatches)
#
# Requires: gh CLI authenticated with permission to run workflows on the repo.
#
# Examples:
#   ./website/scripts/batch-release-catalogs.sh --version v2026.06-rc1 --list
#   ./website/scripts/batch-release-catalogs.sh --version v2026.06-rc1 --dry-run
#   ./website/scripts/batch-release-catalogs.sh --version v2026.06-rc1 \
#     --targets crypto/secrets,identity/iam
#   ./website/scripts/batch-release-catalogs.sh --version v2026.06-rc1 --watch

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CATALOGS_DIR="${REPO_ROOT}/catalogs"

REPO="finos/common-cloud-controls"
WORKFLOW="release.yml"
REF="main"
VERSION=""
PRESET="2026.06-rc1"
TARGETS=""
DRY_RUN=false
DELAY=5
WATCH=false
LIST_ONLY=false

ASSET_TYPES=(capabilities threats controls)

# CCC 2026.06-rc1 release set (all three typed catalogs per service).
PRESET_2026_06_RC1=(
  crypto/secrets
  crypto/key
  database/relational
  networking/loadbalancer
  identity/iam
  management/logging
  management/monitoring
  database/vector
  ai-ml/gen-ai
  ai-ml/mlde
  storage/object
  networking/vpc
  core/ccc
)

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_gh() {
  command -v gh >/dev/null 2>&1 || die "gh CLI is required (https://cli.github.com/)"
  gh auth status >/dev/null 2>&1 || die "gh is not authenticated — run: gh auth login"
}

discover_all_targets() {
  local dir build_target
  for dir in $(find "${CATALOGS_DIR}" -mindepth 2 -maxdepth 2 -type d | sort); do
    build_target="${dir#${CATALOGS_DIR}/}"
    if [ -f "${dir}/metadata.yaml" ]; then
      printf '%s\n' "$build_target"
    fi
  done
}

resolve_targets() {
  if [ -n "$TARGETS" ]; then
    tr ',' '\n' <<< "$TARGETS" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed '/^$/d'
    return
  fi

  case "$PRESET" in
    2026.06-rc1)
      printf '%s\n' "${PRESET_2026_06_RC1[@]}"
      ;;
    all)
      discover_all_targets
      ;;
    *)
      die "unknown preset: ${PRESET} (expected 2026.06-rc1 or all)"
      ;;
  esac
}

validate_targets() {
  local target src
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    src="${CATALOGS_DIR}/${target}"
    [ -d "$src" ] || die "unknown build target: ${target} (no catalogs/${target}/ directory)"
    [ -f "${src}/metadata.yaml" ] || die "catalogs/${target}/metadata.yaml is missing"
  done
}

dispatch_release() {
  local build_target="$1"
  local asset_type="$2"

  echo ">>> Dispatching ${build_target} ${asset_type} ${VERSION} (dry_run=${DRY_RUN}, ref=${REF})"
  gh workflow run "$WORKFLOW" \
    --repo "$REPO" \
    --ref "$REF" \
    -f build_target="$build_target" \
    -f asset_type="$asset_type" \
    -f version="$VERSION" \
    -f dry_run="$DRY_RUN"

  if [ "$WATCH" = true ]; then
    local run_id
    run_id="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')"
    echo "    Watching run ${run_id}..."
    gh run watch "$run_id" --repo "$REPO" --exit-status
  elif [ "$DELAY" -gt 0 ]; then
    sleep "$DELAY"
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --preset)
      PRESET="$2"
      shift 2
      ;;
    --targets)
      TARGETS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --ref)
      REF="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --delay)
      DELAY="$2"
      shift 2
      ;;
    --watch)
      WATCH=true
      DELAY=0
      shift
      ;;
    --list)
      LIST_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1 (try --help)"
      ;;
  esac
done

[ -n "$VERSION" ] || die "--version is required (e.g. v2026.06-rc1)"

SELECTED_TARGETS=()
while IFS= read -r line; do
  [ -n "$line" ] && SELECTED_TARGETS+=("$line")
done < <(resolve_targets)
[ "${#SELECTED_TARGETS[@]}" -gt 0 ] || die "no build targets resolved"

validate_targets <<< "$(printf '%s\n' "${SELECTED_TARGETS[@]}")"

echo "Repository: ${REPO}"
echo "Workflow:   ${WORKFLOW}"
echo "Version:    ${VERSION}"
echo "Preset:     ${PRESET}$([ -n "$TARGETS" ] && printf ' (overridden by --targets)')"
echo "Services:   ${#SELECTED_TARGETS[@]}"
echo "Dispatches: $(( ${#SELECTED_TARGETS[@]} * ${#ASSET_TYPES[@]} )) (${#ASSET_TYPES[@]} asset types each)"
echo ""

for target in "${SELECTED_TARGETS[@]}"; do
  echo "  - ${target}"
done
echo ""

if [ "$LIST_ONLY" = true ]; then
  exit 0
fi

require_gh

count=0
total=$(( ${#SELECTED_TARGETS[@]} * ${#ASSET_TYPES[@]} ))

for build_target in "${SELECTED_TARGETS[@]}"; do
  for asset_type in "${ASSET_TYPES[@]}"; do
    count=$((count + 1))
    echo "[${count}/${total}]"
    dispatch_release "$build_target" "$asset_type"
  done
done

echo ""
echo "Dispatched ${total} workflow runs."
echo "Monitor: gh run list --repo ${REPO} --workflow ${WORKFLOW}"

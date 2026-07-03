#!/usr/bin/env bash
# Compile one typed catalog asset via delivery-toolkit (website catalog build).
#
# Usage: compile-catalog-asset.sh <build_target> <asset_type> [version]
#   build_target  family/service (e.g. storage/object)
#   asset_type    capabilities | threats | controls
#   version       release version stamped into the artifact (default: $VERSION or DEV)
#
# Exit codes:
#   0  compiled successfully
#   2  imports-only catalog — nothing native to compile (expected skip)
#   1  compile failure
#
# Optional environment:
#   REPO_ROOT        repository root (auto-detected from script location)
#   CATALOGS_DIR     default: $REPO_ROOT/catalogs
#   ARTIFACTS_DIR    compile output root (set by caller)
#   DELIVERY_TOOLKIT default: $REPO_ROOT/delivery-toolkit
#   VERSION          default version when the third argument is omitted
#
# On failure or skip, sets R_REASON to a short message for callers.

set -u

compile_catalog_asset() {
  local build_target="$1"
  local asset_type="$2"
  local version="${3:-${VERSION:-DEV}}"
  local out

  R_REASON=""

  if ! out="$(
    cd "${DELIVERY_TOOLKIT:?}" && go run . compile \
      --build-target "$build_target" \
      --type "$asset_type" \
      --version "$version" \
      --catalogs-dir "${CATALOGS_DIR:?}" \
      --output-dir "${ARTIFACTS_DIR:?}" 2>&1
  )"; then
    echo "$out" >&2
    case "$out" in
      *"no native "*" to compile"*)
        R_REASON="imports-only (no native ${asset_type})"
        return 2
        ;;
      *)
        R_REASON="Compile failed — $(friendly_compile_message "$out")"
        return 1
        ;;
    esac
  fi

  echo "$out"
  return 0
}

friendly_compile_message() {
  local msg
  msg="$(printf '%s\n' "$1" | grep -m1 '^Error:' | sed -E 's/^Error: [^:]*: //')"
  if [ -z "$msg" ]; then
    msg="$(printf '%s\n' "$1" | grep -vE '^[[:space:]]*$' | head -1)"
  fi
  printf '%s' "$msg" | tr '\n' ' ' | sed -E -e 's/[[:space:]]+/ /g' -e 's/^ //' -e 's/ $//'
}

if [ -z "${REPO_ROOT:-}" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
DELIVERY_TOOLKIT="${DELIVERY_TOOLKIT:-${REPO_ROOT}/delivery-toolkit}"
CATALOGS_DIR="${CATALOGS_DIR:-${REPO_ROOT}/catalogs}"

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <build_target> <asset_type> [version]" >&2
    exit 1
  fi
  if [ -z "${ARTIFACTS_DIR:-}" ]; then
    echo "ARTIFACTS_DIR must be set when running directly" >&2
    exit 1
  fi
  compile_catalog_asset "$1" "$2" "${3:-}"
fi

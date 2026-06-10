#!/usr/bin/env bash
# Batch-compile typed catalog assets for every catalogs/<family>/<service> target.
#
# Usage: batch-compile-catalogs.sh [--version VERSION] [--output-dir PATH] [--strict]
#   --version VERSION   stamped into compiled artifacts (default: DEV)
#   --output-dir PATH   compile output root (required for website; no default)
#   --strict            exit 1 if any compile fails (default: best-effort, always exit 0)
#
# Requires metadata.yaml in each target directory. Missing asset source files are
# skipped (not errors). Imports-only catalogs are skipped with exit code 2.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=website/scripts/compile-catalog-asset.sh
source "${SCRIPT_DIR}/compile-catalog-asset.sh"

VERSION="${VERSION:-DEV}"
STRICT=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --output-dir)
      ARTIFACTS_DIR="$2"
      shift 2
      ;;
    --strict)
      STRICT=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

DELIVERY_TOOLKIT="${REPO_ROOT}/delivery-toolkit"
CATALOGS_DIR="${REPO_ROOT}/catalogs"

if [ -z "${ARTIFACTS_DIR:-}" ]; then
  echo "Usage: $0 --output-dir PATH [--version VERSION] [--strict]" >&2
  exit 1
fi

mkdir -p "${ARTIFACTS_DIR}"

CORE_VERSION="v2025.10"
for asset_type in capabilities threats controls; do
  src="${CATALOGS_DIR}/core/ccc/${asset_type}.yaml"
  if [ ! -f "$src" ]; then
    continue
  fi
  echo "::group::Compile core/ccc ${asset_type} (${CORE_VERSION})"
  rc=0
  compile_catalog_asset "core/ccc" "$asset_type" "$CORE_VERSION" || rc=$?
  echo "::endgroup::"
  if [ "$rc" -eq 1 ] && [ "$STRICT" -eq 1 ]; then
    echo "Strict mode: core/ccc ${asset_type} compile failed" >&2
    exit 1
  fi
done

compiled=0
skipped_nofile=0
skipped_imports=0
failed=0

for dir in $(find "${CATALOGS_DIR}" -mindepth 2 -maxdepth 2 -type d | sort); do
  build_target="${dir#${CATALOGS_DIR}/}"

  if [ "$build_target" = "core/ccc" ]; then
    continue
  fi

  if [ ! -f "${dir}/metadata.yaml" ]; then
    echo "Skipping ${build_target}: no metadata.yaml"
    continue
  fi

  for asset_type in capabilities threats controls; do
    src="${dir}/${asset_type}.yaml"
    if [ ! -f "$src" ]; then
      skipped_nofile=$((skipped_nofile + 1))
      continue
    fi

    echo "::group::Compile ${build_target} ${asset_type} (${VERSION})"
    rc=0
    compile_catalog_asset "$build_target" "$asset_type" "$VERSION" || rc=$?
    echo "::endgroup::"

    case "$rc" in
      0) compiled=$((compiled + 1)) ;;
      2)
        skipped_imports=$((skipped_imports + 1))
        echo "Notice: ${build_target} ${asset_type}: ${R_REASON:-imports-only}"
        ;;
      *)
        failed=$((failed + 1))
        echo "Warning: ${build_target} ${asset_type}: ${R_REASON:-compile failed}" >&2
        if [ "$STRICT" -eq 1 ]; then
          exit 1
        fi
        ;;
    esac
  done
done

echo "Batch compile complete: ${compiled} compiled, ${failed} failed, ${skipped_imports} imports-only, ${skipped_nofile} no source file."

if [ "$STRICT" -eq 1 ] && [ "$failed" -gt 0 ]; then
  exit 1
fi

exit 0

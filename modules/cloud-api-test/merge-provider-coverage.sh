#!/usr/bin/env bash
# Merge per-cloud coverage-integration-{aws,azure,gcp}.out into one profile.
#
# Cloud implementations diverge enough that a single-provider report is
# misleading. This script refuses to write an output unless all three
# profiles exist and are non-empty.
#
# Usage (from modules/cloud-api-test):
#   ./merge-provider-coverage.sh
#
# Writes:
#   coverage-integration-all.out
#   coverage-integration-all.html

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUDS=(aws azure gcp)
OUTPUT="$SCRIPT_DIR/coverage-integration-all.out"
HTML="$SCRIPT_DIR/coverage-integration-all.html"

profiles=()
missing=0
for cloud in "${CLOUDS[@]}"; do
  profile="$SCRIPT_DIR/coverage-integration-${cloud}.out"
  if [[ ! -s "$profile" ]]; then
    echo "error: required coverage profile missing or empty: $profile" >&2
    missing=1
    continue
  fi
  profiles+=("$profile")
done

if [[ "$missing" -ne 0 ]]; then
  echo "error: refusing to report coverage until aws, azure, and gcp profiles are all present" >&2
  exit 1
fi

echo "==> gocovmerge ${profiles[*]}"
go run github.com/wadey/gocovmerge@latest "${profiles[@]}" >"$OUTPUT"

echo "==> go tool cover -html (combined)"
go tool cover -html="$OUTPUT" -o "$HTML"

echo "==> go tool cover -func (combined)"
go tool cover -func="$OUTPUT" | tail -1

echo "Combined coverage: $OUTPUT"
echo "Combined coverage HTML: $HTML"

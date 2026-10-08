#!/usr/bin/env bash
# Merge GOCOVERDIR data from instrumented scale-fixtures/ccc-lifecycle into the
# integration go test coverprofile for a provider.
#
# Usage:
#   LIFECYCLE_GOCOVERDIR=./coverage-lifecycle-aws ./merge-lifecycle-coverage.sh aws
#
# Expects coverage-integration-<provider>.out from run-integration-tests.sh.
# When LIFECYCLE_GOCOVERDIR is unset, defaults to coverage-lifecycle-<provider>.

set -euo pipefail

usage() {
  echo "Usage: $0 <aws|azure|gcp>" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

PROVIDER=$(echo "$1" | tr '[:upper:]' '[:lower:]')
case "$PROVIDER" in
  aws | azure | gcp) ;;
  *) usage ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COVER_DIR="${LIFECYCLE_GOCOVERDIR:-$SCRIPT_DIR/coverage-lifecycle-$PROVIDER}"
TEST_PROFILE="$SCRIPT_DIR/coverage-integration-${PROVIDER}.out"
LIFECYCLE_PROFILE="$SCRIPT_DIR/coverage-lifecycle-${PROVIDER}.out"
MERGED_PROFILE="$SCRIPT_DIR/coverage-integration-${PROVIDER}.out"

if [[ ! -d "$COVER_DIR" ]] || [[ -z "$(ls -A "$COVER_DIR" 2>/dev/null || true)" ]]; then
  echo "==> no lifecycle coverage in $COVER_DIR — skipping merge"
  exit 0
fi

echo "==> go tool covdata textfmt ($COVER_DIR)"
if ! go tool covdata textfmt -i="$COVER_DIR" -o="$LIFECYCLE_PROFILE" 2>/tmp/covdata-err.$$; then
  echo "warning: covdata textfmt failed:" >&2
  cat /tmp/covdata-err.$$ >&2 || true
  rm -f /tmp/covdata-err.$$
  exit 0
fi
rm -f /tmp/covdata-err.$$

if [[ ! -s "$LIFECYCLE_PROFILE" ]]; then
  echo "==> lifecycle profile empty — skipping merge"
  exit 0
fi

if [[ ! -s "$TEST_PROFILE" ]]; then
  echo "==> no integration profile; using lifecycle profile only"
  cp "$LIFECYCLE_PROFILE" "$MERGED_PROFILE"
else
  echo "==> merging lifecycle + integration coverage"
  TMP="$(mktemp)"
  go run github.com/wadey/gocovmerge@latest "$TEST_PROFILE" "$LIFECYCLE_PROFILE" >"$TMP"
  mv "$TMP" "$MERGED_PROFILE"
fi

if [[ -s "$MERGED_PROFILE" ]]; then
  go tool cover -html="$MERGED_PROFILE" -o "$SCRIPT_DIR/coverage-integration-${PROVIDER}.html"
  echo "Merged coverage: $MERGED_PROFILE"
fi

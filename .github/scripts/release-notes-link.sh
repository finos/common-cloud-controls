#!/usr/bin/env bash
# Usage: release-notes-link.sh <tag> <build_target> <version> <asset_type> <grc_url>
#
# Rewrites a per-target GitHub release's notes to list one grc.store link per typed
# catalog it carries. This catalog's line is replaced, not appended, so a re-run
# (gh release upload --clobber) doesn't duplicate it. Read-modify-write: callers must
# serialize runs on the same tag (see the workflows' concurrency groups).
set -euo pipefail
tag=$1 build_target=$2 version=$3 asset_type=$4 grc_url=$5

body="$(gh release view "$tag" --json body -q .body)"
links="$( { printf '%s\n' "$body" | grep -E '^- [a-z]+: ' | grep -v "^- ${asset_type}: " || true
  echo "- ${asset_type}: ${grc_url}"; } | sort)"

gh release edit "$tag" --notes "$(printf 'Release of %s typed catalogs (%s), published to grc.store:\n\n%s\n' \
  "$build_target" "$version" "$links")"

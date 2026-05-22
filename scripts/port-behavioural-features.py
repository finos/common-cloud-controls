#!/usr/bin/env python3
"""Port @Behavioural scenarios from ccc-cfi-compliance into modules/features/."""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CCC_ROOT = REPO_ROOT.parent / "ccc-cfi-compliance"
SRC_ROOT = CCC_ROOT / "testing" / "features"
DST_ROOT = REPO_ROOT / "modules" / "features"

# First matching tag wins (order matters).
SERVICE_ROUTES = [
    ("@PerPort", "port"),
    ("@vpc", "vpc"),
    ("@object-storage", "object-storage"),
    ("@load-balancer", "load-balancer"),
    ("@relational-database", "relational-database"),
    ("@iam", "iam"),
    ("@block-storage", "block-storage"),
]


def route_service(tags: set[str], catalog: str, feature_tags: set[str]) -> str:
    combined = tags | feature_tags
    for needle, folder in SERVICE_ROUTES:
        if needle in combined:
            return folder
    if catalog == "CCC.VPC":
        return "vpc"
    if catalog == "CCC.ObjStor":
        return "object-storage"
    return "object-storage"


def _stripped(line: str) -> str:
    return line.strip()


def _collect_tags(lines: list[str], i: int) -> tuple[list[str], int]:
    tags: list[str] = []
    while i < len(lines) and _stripped(lines[i]).startswith("@"):
        tags.extend(_stripped(lines[i]).split())
        i += 1
    return tags, i


def _skip_blank_and_comments(lines: list[str], i: int) -> int:
    while i < len(lines):
        s = _stripped(lines[i])
        if not s or s.startswith("#"):
            i += 1
            continue
        break
    return i


def parse_feature(text: str) -> dict:
    lines = text.splitlines()
    feature_tags: list[str] = []
    feature_header: list[str] = []
    background: list[str] = []
    scenarios: list[dict] = []

    i = 0
    if i < len(lines) and _stripped(lines[i]).startswith("@"):
        feature_tags, i = _collect_tags(lines, i)

    if i < len(lines) and _stripped(lines[i]).startswith("Feature:"):
        feature_header.append(lines[i])
        i += 1
        while i < len(lines):
            s = _stripped(lines[i])
            if s.startswith("@") or s == "Background:" or s.startswith("Scenario"):
                break
            feature_header.append(lines[i])
            i += 1

    while i < len(lines):
        i = _skip_blank_and_comments(lines, i)
        if i >= len(lines):
            break

        if _stripped(lines[i]) == "Background:":
            background.append(lines[i])
            i += 1
            while i < len(lines):
                s = _stripped(lines[i])
                if s.startswith("@") or s.startswith("Scenario"):
                    break
                if not s or s.startswith("#"):
                    i += 1
                    continue
                if re.match(r"^(Given|When|Then|And|But|\*)", s):
                    background.append(lines[i])
                i += 1
            continue

        if _stripped(lines[i]).startswith("@"):
            tags, i = _collect_tags(lines, i)
            while i < len(lines) and not _stripped(lines[i]):
                i += 1
            preamble: list[str] = []
            while i < len(lines):
                s = _stripped(lines[i])
                if s.startswith("#"):
                    preamble.append(lines[i])
                    i += 1
                    continue
                if not s:
                    i += 1
                    continue
                break
            if i >= len(lines) or not (
                s.startswith("Scenario:") or s.startswith("Scenario Outline:")
            ):
                continue
            body = tags + preamble + [lines[i]]
            i += 1
            while i < len(lines) and not _stripped(lines[i]).startswith("@"):
                body.append(lines[i])
                i += 1
            scenarios.append({"tags": set(tags), "lines": body})
            continue

        i += 1

    return {
        "feature_tags": set(feature_tags),
        "feature_header": feature_header,
        "background": background,
        "scenarios": scenarios,
    }


def render_feature(
    feature_tags: set[str],
    feature_header: list[str],
    background: list[str],
    scenario_blocks: list[list[str]],
) -> str:
    out: list[str] = []
    tag_line = " ".join(sorted(feature_tags, key=lambda t: (not t.startswith("@CCC"), t)))
    if tag_line:
        out.append(tag_line)
    out.extend(feature_header)
    out.append("")
    if background:
        out.extend(background)
        out.append("")
    for block in scenario_blocks:
        # Emit scenario tags on one line when they are only tags.
        tags = [ln for ln in block if _stripped(ln).startswith("@")]
        rest = [ln for ln in block if ln not in tags]
        if tags:
            merged = []
            for ln in tags:
                merged.extend(_stripped(ln).split())
            out.append(" ".join(merged))
        out.extend(rest)
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def main() -> None:
    if not SRC_ROOT.is_dir():
        raise SystemExit(f"source not found: {SRC_ROOT}")

    written = 0
    skipped = 0

    for src in sorted(SRC_ROOT.rglob("*.feature")):
        catalog = src.parent.name
        parsed = parse_feature(src.read_text())
        feature_tag_set = parsed["feature_tags"]

        behavioural_by_service: dict[str, list[list[str]]] = {}
        for sc in parsed["scenarios"]:
            if "@Behavioural" not in sc["tags"]:
                continue
            service = route_service(sc["tags"], catalog, feature_tag_set)
            behavioural_by_service.setdefault(service, []).append(sc["lines"])

        if not behavioural_by_service:
            skipped += 1
            continue

        for service, blocks in behavioural_by_service.items():
            dest_dir = DST_ROOT / service / catalog
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / src.name
            content = render_feature(
                feature_tag_set,
                parsed["feature_header"],
                parsed["background"],
                blocks,
            )
            dest.write_text(content)
            written += 1
            print(f"wrote {dest.relative_to(DST_ROOT.parent)}")

    print(f"done: {written} files, {skipped} source files with no behavioural scenarios")


if __name__ == "__main__":
    main()

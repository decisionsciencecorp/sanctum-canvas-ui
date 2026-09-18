#!/usr/bin/env python3
"""
A6.12 — Manifest consistency audit.

Lists every component name in chat + dashboard library.v1.json and compares
against registry keys from register* modules (A5 foundation + A6 library).

Exit 0 always (audit report); prints GAPS for components registered in code
but missing from manifests, and ORPHANS for manifest entries without a
matching register* key.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBS = [
    ROOT / "resources/libraries/chat/library.v1.json",
    ROOT / "resources/libraries/dashboard/library.v1.json",
]
REGISTER_FILES = [
    ROOT / "src/Browser/components/registerFoundation.js",
    ROOT / "src/Browser/components/content/registerContent.js",
    ROOT / "src/Browser/components/containers/registerContainers.js",
    ROOT / "src/Browser/components/containers/registerSectionSteps.js",
    ROOT / "src/Browser/components/containers/registerCarouselModal.js",
    ROOT / "src/Browser/components/chat/registerChatContent.js",
    ROOT / "src/Browser/components/forms/registerForms.js",
    ROOT / "src/Browser/components/actions/registerActions.js",
    ROOT / "src/Browser/components/table/registerTable.js",
    ROOT / "src/Browser/components/charts/registerCharts.js",
    ROOT / "src/Browser/components/cards/index.js",
    ROOT / "src/Browser/components/tools/registerTools.js",
]

# Keys that are aliases / internal — still registered, note separately.
ALIAS_NOTE = {
    "CheckboxGroup",
    "CheckboxItem",
    "ToolCall",
    "ToolResult",
    "Sources",
}


def library_names(path: Path) -> set[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    names: set[str] = set()
    comps = data.get("components") or {}
    if isinstance(comps, dict):
        names.update(comps.keys())
    for group in data.get("componentGroups") or []:
        for c in group.get("components") or []:
            if isinstance(c, str):
                names.add(c)
    return names


def registered_names() -> set[str]:
    names: set[str] = set()
    # Object literal keys in *COMPONENTS / register("Name"
    key_re = re.compile(r"^\s+([A-Z][A-Za-z0-9]*)\s*,?\s*$", re.M)
    reg_re = re.compile(r'registry\.register\(\s*["\']([A-Za-z0-9_]+)["\']')
    for path in REGISTER_FILES:
        text = path.read_text(encoding="utf-8")
        names.update(reg_re.findall(text))
        # FORM_COMPONENTS / CHART_COMPONENTS style objects
        for block in re.finditer(
            r"(?:export\s+)?const\s+\w*COMPONENTS\w*\s*=\s*\{(.*?)\n\};",
            text,
            re.S,
        ):
            names.update(key_re.findall(block.group(1)))
        for block in re.finditer(
            r"Object\.freeze\(\s*\{(.*?)\}\s*\)",
            text,
            re.S,
        ):
            names.update(key_re.findall(block.group(1)))
    return names


def main() -> int:
    registered = registered_names()
    lib_union: set[str] = set()
    per_lib: dict[str, set[str]] = {}
    for path in LIBS:
        names = library_names(path)
        per_lib[path.parent.name] = names
        lib_union |= names

    gaps = sorted(registered - lib_union - ALIAS_NOTE)
    orphans = sorted(lib_union - registered)
    aliases = sorted(ALIAS_NOTE & registered)

    print("=== A6.12 library.v1.json ↔ register* audit ===")
    for label, names in per_lib.items():
        print(f"\n{label} manifest ({len(names)}):")
        for n in sorted(names):
            mark = "✓" if n in registered else "✗ orphan"
            print(f"  {mark}  {n}")

    print(f"\nRegistered components (parsed): {len(registered)}")
    print(f"Manifest union: {len(lib_union)}")
    print(f"\nGAPS — registered, not in either library.v1.json ({len(gaps)}):")
    for n in gaps:
        print(f"  - {n}")
    print(f"\nAliases / internal (registered, ok to omit from slim manifests):")
    for n in aliases:
        print(f"  - {n}")
    print(f"\nORPHANS — in manifests, not found in register* ({len(orphans)}):")
    if not orphans:
        print("  (none)")
    else:
        for n in orphans:
            print(f"  - {n}")

    out = ROOT / "docs" / "track-a" / "A6-manifest-audit.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"registered={len(registered)}",
        f"manifest_union={len(lib_union)}",
        f"gaps={len(gaps)}",
        f"orphans={len(orphans)}",
        "",
        "## gaps",
        *gaps,
        "",
        "## orphans",
        *(orphans or ["(none)"]),
        "",
        "## chat",
        *sorted(per_lib.get("chat", [])),
        "",
        "## dashboard",
        *sorted(per_lib.get("dashboard", [])),
        "",
    ]
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

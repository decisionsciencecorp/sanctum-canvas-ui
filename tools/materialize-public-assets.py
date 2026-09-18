#!/usr/bin/env python3
"""
Replace public/ symlinks with real file copies of their targets.

Multihost deploy.sh uses `rsync -a` (preserves symlinks, does not dereference).
WEB_ROOT only receives `public/`, so links into `src/Browser`, `resources/`,
and `tests/` 404 on canvas-lab. Materializing keeps the lab deployable without
changing Ada's rsync flags.

Idempotent: already-real files are left alone; broken links raise.

Usage:
  python3 tools/materialize-public-assets.py
  python3 tools/materialize-public-assets.py --dry-run
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def materialize(dry_run: bool = False) -> int:
    links = sorted(p for p in PUBLIC.rglob("*") if p.is_symlink())
    if not links:
        print("no symlinks under public/")
        return 0

    ok = 0
    for link in links:
        target = link.resolve()
        if not target.is_file():
            print(f"BROKEN: {link} -> {link.readlink()} (resolved {target})", file=sys.stderr)
            return 1
        rel = link.relative_to(ROOT)
        print(f"{'DRY ' if dry_run else ''}materialize {rel} <- {target.relative_to(ROOT)}")
        if dry_run:
            ok += 1
            continue
        link.unlink()
        shutil.copy2(target, link)
        # Ensure world-readable for www-data after rsync
        mode = link.stat().st_mode
        os.chmod(link, mode | 0o444)
        ok += 1

    print(f"done: {ok} file(s)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    return materialize(dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())

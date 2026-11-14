#!/usr/bin/env python3
"""
Sanctum Canvas Lab SMCP — paint / clear / status for SMCP-only lab twins.

Primary surface: deep-research (https://canvas-lab.sanctumos.org/lab/deep-research.php)

Env:
  CANVAS_LAB_BASE_URL   default https://canvas-lab.sanctumos.org
  CANVAS_LAB_TOKEN      Bearer / X-Canvas-Auth (default canvas-lab-dev)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

PLUGIN_VERSION = "0.1.0"
DEFAULT_SURFACE = "deep-research"
PLUGIN_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PLUGIN_ROOT.parent.parent
FIXTURE_LANG = REPO_ROOT / "public" / "fixtures" / "lang" / "deep-research-scope-v1.lang"


def _base_url() -> str:
    return os.environ.get("CANVAS_LAB_BASE_URL", "https://canvas-lab.sanctumos.org").rstrip("/")


def _token() -> str:
    return os.environ.get("CANVAS_LAB_TOKEN", "canvas-lab-dev")


def _error(error: str, error_type: str) -> Dict[str, Any]:
    return {"status": "error", "error": error, "error_type": error_type}


def _success(**data: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {"status": "success"}
    out.update(data)
    return out


def _request(method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{_base_url()}{path}"
    data = None
    headers = {
        "Accept": "application/json",
        "X-Canvas-Auth": _token(),
        "Authorization": f"Bearer {_token()}",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"URL error: {e}") from e


def status(surface: str = DEFAULT_SURFACE) -> Dict[str, Any]:
    try:
        data = _request("GET", f"/api/lab-control.php?surface={surface}")
    except RuntimeError as e:
        return _error(str(e), "http_error")
    return _success(surface=surface, lab=data, lab_url=f"{_base_url()}/lab/{surface}.php")


def paint(
    lang_source: str,
    *,
    surface: str = DEFAULT_SURFACE,
    title: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    lang_source = (lang_source or "").strip()
    if not lang_source:
        return _error("lang_source required", "argument_error")
    body: Dict[str, Any] = {
        "action": "paint",
        "surface": surface,
        "lang_source": lang_source,
    }
    if title:
        body["title"] = title
    if note:
        body["note"] = note
    try:
        data = _request("POST", "/api/lab-control.php", body)
    except RuntimeError as e:
        return _error(str(e), "http_error")
    return _success(
        surface=surface,
        lab=data,
        lab_url=f"{_base_url()}/lab/{surface}.php",
        hint="Open the lab URL; the page polls and paints within ~1s.",
    )


def paint_fixture(
    fixture: str = "deep-research-scope-v1",
    *,
    surface: str = DEFAULT_SURFACE,
) -> Dict[str, Any]:
    path = FIXTURE_LANG
    if fixture != "deep-research-scope-v1":
        candidate = REPO_ROOT / "public" / "fixtures" / "lang" / f"{fixture}.lang"
        if not candidate.is_file():
            return _error(f"unknown fixture: {fixture}", "argument_error")
        path = candidate
    if not path.is_file():
        return _error(f"fixture missing: {path}", "not_found")
    source = path.read_text(encoding="utf-8")
    return paint(source, surface=surface, title=fixture, note=f"fixture:{fixture}")


def clear(surface: str = DEFAULT_SURFACE, note: Optional[str] = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {"action": "clear", "surface": surface}
    if note:
        body["note"] = note
    try:
        data = _request("POST", "/api/lab-control.php", body)
    except RuntimeError as e:
        return _error(str(e), "http_error")
    return _success(surface=surface, lab=data, lab_url=f"{_base_url()}/lab/{surface}.php")


def describe() -> Dict[str, Any]:
    return {
        "name": "sanctum_canvas_lab",
        "version": PLUGIN_VERSION,
        "description": (
            "SMCP control for the canvas-lab isolation page (Deep Research shell). "
            "Optional — the page also paints local fixtures without SMCP. "
            "Use paint/clear when Otto needs to drive the surface remotely."
        ),
        "commands": [
            {
                "name": "status",
                "description": "Read lab-control state for a surface (default deep-research).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "surface": {"type": "string", "default": DEFAULT_SURFACE},
                    },
                },
            },
            {
                "name": "paint",
                "description": "Replace the lab canvas with OpenUI Lang source.",
                "parameters": {
                    "type": "object",
                    "required": ["lang_source"],
                    "properties": {
                        "lang_source": {"type": "string"},
                        "surface": {"type": "string", "default": DEFAULT_SURFACE},
                        "title": {"type": "string"},
                        "note": {"type": "string"},
                    },
                },
            },
            {
                "name": "paint_fixture",
                "description": "Paint a bundled Lang fixture (default deep-research-scope-v1).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "fixture": {"type": "string", "default": "deep-research-scope-v1"},
                        "surface": {"type": "string", "default": DEFAULT_SURFACE},
                    },
                },
            },
            {
                "name": "clear",
                "description": "Clear the lab canvas surface.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "surface": {"type": "string", "default": DEFAULT_SURFACE},
                        "note": {"type": "string"},
                    },
                },
            },
        ],
    }


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Sanctum Canvas Lab SMCP")
    p.add_argument("--describe", action="store_true")
    sub = p.add_subparsers(dest="command")

    s = sub.add_parser("status")
    s.add_argument("--surface", default=DEFAULT_SURFACE)

    s = sub.add_parser("paint")
    s.add_argument("--lang-source", required=True)
    s.add_argument("--surface", default=DEFAULT_SURFACE)
    s.add_argument("--title", default=None)
    s.add_argument("--note", default=None)

    s = sub.add_parser("paint_fixture")
    s.add_argument("--fixture", default="deep-research-scope-v1")
    s.add_argument("--surface", default=DEFAULT_SURFACE)

    s = sub.add_parser("clear")
    s.add_argument("--surface", default=DEFAULT_SURFACE)
    s.add_argument("--note", default=None)

    return p


def main(argv: Optional[List[str]] = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.describe or not args.command:
        print(json.dumps(describe(), indent=2))
        return 0

    if args.command == "status":
        out = status(surface=args.surface)
    elif args.command == "paint":
        out = paint(
            args.lang_source,
            surface=args.surface,
            title=args.title,
            note=args.note,
        )
    elif args.command == "paint_fixture":
        out = paint_fixture(fixture=args.fixture, surface=args.surface)
    elif args.command == "clear":
        out = clear(surface=args.surface, note=args.note)
    else:
        out = _error(f"unknown command {args.command}", "argument_error")

    print(json.dumps(out, indent=2))
    return 0 if out.get("status") == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())

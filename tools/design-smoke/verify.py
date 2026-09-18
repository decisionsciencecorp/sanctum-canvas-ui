#!/usr/bin/env python3
"""
A5.8 — Python Playwright visual capture for foundation components.

Serves public/ from a child HTTP server on an ephemeral port; kills in finally.
Captures mobile (390×844) + desktop (1280×800) for each A5 family on:
  - port lab:     /lab/a5-foundation.html
  - baseline:     /lab/a5-baseline.html  (static OpenUI class fixture from old/)

Output: docs/track-a/screenshots/a5/
"""
from __future__ import annotations

import http.server
import os
import socket
import socketserver
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a5"
OUT.mkdir(parents=True, exist_ok=True)

_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"
_COMPANION_VENV = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)

FAMILIES = (
    "stack",
    "card",
    "content",
    "lists-code-images",
    "tabs",
    "accordion",
    "section",
    "steps",
    "carousel",
    "modal",
)

VIEWPORTS = (
    ("mobile", {"width": 390, "height": 844}),
    ("desktop", {"width": 1280, "height": 800}),
)


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def pick_python() -> str | None:
    for candidate in (_LOCAL_VENV, _COMPANION_VENV):
        if candidate.is_file():
            return str(candidate)
    return None


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def start_server(port: int) -> tuple[socketserver.TCPServer, threading.Thread]:
    # Allow reuse so rapid re-runs do not flake.
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, thread


def capture_page(page, base_url: str, path: str, ready_sel: str, prefix: str) -> list[str]:
    written: list[str] = []
    page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=30000)
    page.wait_for_selector(ready_sel, timeout=15000)
    # Modal open: dialog or openui modal content visible
    if "foundation" in path:
        page.wait_for_selector(
            "#family-modal dialog[open], #family-modal .canvas-modal[open], "
            "#family-modal [data-canvas-component='Modal']",
            timeout=10000,
        )
    else:
        page.wait_for_selector("#family-modal .openui-modal-content", timeout=10000)

    for family in FAMILIES:
        loc = page.locator(f'[data-family="{family}"]')
        loc.scroll_into_view_if_needed()
        page.wait_for_timeout(120)
        # Modal: capture the family section (includes open dialog chrome)
        target = loc
        if family == "modal" and "foundation" in path:
            dlg = page.locator("#family-modal dialog, #family-modal .canvas-modal")
            if dlg.count() and dlg.first.is_visible():
                # Prefer full-page viewport shot with modal open
                out = OUT / f"{prefix}-modal-viewport.png"
                page.screenshot(path=str(out), full_page=False)
                written.append(str(out.relative_to(ROOT)))
                out2 = OUT / f"{prefix}-modal.png"
                loc.screenshot(path=str(out2))
                written.append(str(out2.relative_to(ROOT)))
                continue
        out = OUT / f"{prefix}-{family}.png"
        target.screenshot(path=str(out))
        written.append(str(out.relative_to(ROOT)))
    return written


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        alt = pick_python()
        if alt and Path(alt).resolve() != Path(sys.executable).resolve():
            os.execv(alt, [alt, str(Path(__file__).resolve()), *sys.argv[1:]])
        print(
            "FAIL: playwright not installed. "
            "Create tools/design-smoke/.venv and pip install playwright",
            file=sys.stderr,
        )
        return 2

    port = free_port()
    httpd, _thread = start_server(port)
    base = f"http://127.0.0.1:{port}"
    written: list[str] = []
    try:
        # Brief settle for bind
        time.sleep(0.15)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                for vp_name, size in VIEWPORTS:
                    page = browser.new_page(viewport=size)
                    written.extend(
                        capture_page(
                            page,
                            base,
                            "/lab/a5-foundation.html",
                            "#status[data-lab-ready='1']",
                            f"port-{vp_name}",
                        )
                    )
                    written.extend(
                        capture_page(
                            page,
                            base,
                            "/lab/a5-baseline.html",
                            "#baseline-root[data-baseline-ready='1']",
                            f"baseline-{vp_name}",
                        )
                    )
                    page.close()
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()

    manifest = OUT / "manifest.txt"
    manifest.write_text("\n".join(written) + "\n", encoding="utf-8")
    print(f"OK wrote {len(written)} screenshots → {OUT.relative_to(ROOT)}")
    for w in written:
        print(f"  {w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

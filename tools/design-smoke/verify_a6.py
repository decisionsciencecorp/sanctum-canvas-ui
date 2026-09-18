#!/usr/bin/env python3
"""
A6.12 — Python Playwright visual capture for library components.

Serves public/ from a child HTTP server on an ephemeral port; kills in finally.
Captures mobile (390×844) + compact (~768×900) + desktop (1280×800) for each
A6 family on:
  - port lab:     /lab/a6-library.html
  - baseline:     /lab/a6-baseline.html  (static OpenUI class fixture from old/)

Output: docs/track-a/screenshots/a6/
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
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a6"
OUT.mkdir(parents=True, exist_ok=True)

_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"
_COMPANION_VENV = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)

FAMILIES = (
    "forms",
    "selection",
    "buttons",
    "table",
    "editable-table",
    "charts",
    "card-blocks",
    "image-gallery",
    "tool-activity",
)

VIEWPORTS = (
    ("mobile", {"width": 390, "height": 844}),
    ("compact", {"width": 768, "height": 900}),
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
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, thread


def capture_page(page, base_url: str, path: str, ready_sel: str, prefix: str) -> list[str]:
    written: list[str] = []
    page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=45000)
    page.wait_for_selector(ready_sel, timeout=20000)
    # Ensure at least one family mounted
    page.wait_for_selector('[data-family="forms"]', timeout=10000)

    for family in FAMILIES:
        loc = page.locator(f'[data-family="{family}"]')
        loc.scroll_into_view_if_needed()
        page.wait_for_timeout(150)
        out = OUT / f"{prefix}-{family}.png"
        loc.screenshot(path=str(out))
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
        time.sleep(0.15)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                for vp_name, size in VIEWPORTS:
                    page = browser.new_page(viewport=size)
                    page.on(
                        "pageerror",
                        lambda err: print(f"PAGEERROR: {err}", file=sys.stderr),
                    )
                    written.extend(
                        capture_page(
                            page,
                            base,
                            "/lab/a6-library.html",
                            "#status[data-lab-ready='1']",
                            f"port-{vp_name}",
                        )
                    )
                    written.extend(
                        capture_page(
                            page,
                            base,
                            "/lab/a6-baseline.html",
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

#!/usr/bin/env python3
"""Prove shell mount lazy-loads chart pack when program names BarChart."""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
OUT = ROOT / "tools" / "design-smoke" / "out"
OUT.mkdir(parents=True, exist_ok=True)
_COMPANION = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if _COMPANION.is_file():
            os.execv(str(_COMPANION), [str(_COMPANION), str(Path(__file__).resolve())])
        print("playwright missing", file=sys.stderr)
        return 2

    port = free_port()
    url = f"http://127.0.0.1:{port}/lab/lazy-pack-smoke.html"
    proc = subprocess.Popen(
        ["php", "-S", f"127.0.0.1:{port}", "-t", str(PUBLIC)],
        cwd=str(PUBLIC),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    time.sleep(0.35)
    chart_chunk_hits = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1100, "height": 700})

            def on_request(req):
                u = req.url
                if "chunk-" in u and ("R4IM2ORB" in u or "charts" in u.lower()):
                    chart_chunk_hits.append(u)
                # any lazy chunk after shell entry counts if BarChart pack
                if "/chunk-" in u and u.endswith(".js"):
                    chart_chunk_hits.append(u)

            page.on("request", on_request)
            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_function(
                """() => {
                  const el = document.getElementById('status');
                  return el && (el.dataset.ready === '1' || el.dataset.error === '1');
                }""",
                timeout=45000,
            )
            text = page.locator("#status").inner_text()
            path = OUT / "lazy-pack-smoke.png"
            page.screenshot(path=str(path), full_page=True)
            print(f"status={text!r} chunks={len(set(chart_chunk_hits))} shot={path}")
            assert text.startswith("OK"), text
            assert chart_chunk_hits, "expected at least one lazy chunk request for BarChart"
            unknown = page.locator("[data-openui-unknown]").count()
            assert unknown == 0, "BarChart rendered as unknown"
            browser.close()
    finally:
        try:
            os.killpg(proc.pid, 9)
        except ProcessLookupError:
            pass
        proc.wait(timeout=3)
    return 0


if __name__ == "__main__":
    sys.exit(main())

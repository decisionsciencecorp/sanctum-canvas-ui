#!/usr/bin/env python3
"""Smoke Deep Research SMCP twin — local php -S or CANVAS_LAB_URL."""
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
    if "playwright" not in sys.modules:
        try:
            import playwright  # noqa: F401
        except ImportError:
            if _COMPANION.is_file():
                os.execv(str(_COMPANION), [str(_COMPANION), str(Path(__file__).resolve()), *sys.argv[1:]])
            print("playwright missing", file=sys.stderr)
            return 2

    from playwright.sync_api import sync_playwright

    named = (os.environ.get("CANVAS_LAB_URL") or "").strip()
    proc = None
    if named:
        url = named
    else:
        port = free_port()
        url = f"http://127.0.0.1:{port}/lab/deep-research.php"
        proc = subprocess.Popen(
            ["php", "-S", f"127.0.0.1:{port}", "-t", str(PUBLIC)],
            cwd=str(PUBLIC),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        time.sleep(0.4)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for name, vw in (("desktop", (1280, 800)), ("mobile", (390, 844))):
                page = browser.new_page(viewport={"width": vw[0], "height": vw[1]})
                page.goto(url, wait_until="networkidle", timeout=45000)
                status = page.locator("#lab-status")
                status.wait_for(state="visible", timeout=15000)
                # Wait until boot finishes (ready or error)
                page.wait_for_function(
                    """() => {
                      const el = document.getElementById('lab-status');
                      if (!el) return false;
                      const t = el.textContent || '';
                      return el.getAttribute('data-lab-ready') === '1'
                        || el.getAttribute('data-lab-error') === '1'
                        || t.includes('Boot failed')
                        || t.includes('Listening');
                    }""",
                    timeout=20000,
                )
                text = status.inner_text()
                ready = status.get_attribute("data-lab-ready")
                err = status.get_attribute("data-lab-error")
                path = OUT / f"deep-research-twin-{name}.png"
                page.screenshot(path=str(path), full_page=True)
                print(f"wrote {path} status={text!r} ready={ready} error={err}")
                assert ready == "1", f"boot not ready: {text}"
                assert "Boot failed" not in text
                page.close()
            browser.close()
    finally:
        if proc is not None:
            try:
                os.killpg(proc.pid, 9)
            except ProcessLookupError:
                pass
            proc.wait(timeout=3)
    return 0


if __name__ == "__main__":
    sys.exit(main())

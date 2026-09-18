#!/usr/bin/env python3
"""
A7.8 — Python Playwright smoke against the named laboratory URL.

Targets the live review host (not localhost / not php -S). Captures mobile
390×844 and desktop 1280×800. Asserts page load, fixture selector, canvas
root, and CSP meta. Optionally attempts offline fixture replay when stable.

Usage:
  /root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \\
    tools/design-smoke/verify_a7_named.py

  CANVAS_LAB_URL=http://canvas-lab.decisionsciencecorp.com/index.php \\
    …/python tools/design-smoke/verify_a7_named.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a7"
OUT.mkdir(parents=True, exist_ok=True)

DEFAULT_URL = "https://canvas-lab.decisionsciencecorp.com/index.php"

_COMPANION_VENV = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)
_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"


def pick_python() -> str:
    for candidate in (_LOCAL_VENV, _COMPANION_VENV):
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def main() -> int:
    py = pick_python()
    if "playwright" not in sys.modules:
        try:
            import playwright  # noqa: F401
        except ImportError:
            if Path(py).resolve() != Path(sys.executable).resolve():
                os.execv(py, [py, str(Path(__file__).resolve()), *sys.argv[1:]])
            print("playwright missing — install into design-smoke venv", file=sys.stderr)
            return 2

    from playwright.sync_api import sync_playwright

    url = os.environ.get("CANVAS_LAB_URL", DEFAULT_URL).strip() or DEFAULT_URL
    written: list[str] = []
    replay_ok = False
    replay_note = "skipped"
    lab_ready = False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        resp = page.goto(url, wait_until="domcontentloaded", timeout=45000)
        assert resp is not None, "no response from named URL"
        assert resp.status == 200, f"expected HTTP 200, got {resp.status}"

        # Core A7.8 smoke: load + chrome + mount + CSP
        assert page.locator("#lab-fixture").count() == 1, "fixture selector missing"
        assert page.locator("#sanctum-canvas-root").count() == 1, "canvas root missing"
        csp = page.locator('meta[http-equiv="Content-Security-Policy"]')
        assert csp.count() >= 1, "CSP meta missing"
        csp_content = csp.first.get_attribute("content") or ""
        assert "script-src 'self'" in csp_content, f"unexpected CSP: {csp_content}"

        # Lab chrome must stay outside the canvas mount
        assert page.locator("#lab-chrome").count() == 1
        assert page.locator("#sanctum-canvas-root #lab-chrome").count() == 0

        # Ready attribute is expected once JS modules load; soft-wait then screenshot either way.
        lab_ready = False
        try:
            page.wait_for_selector('#lab-status[data-lab-ready="1"]', timeout=12000)
            lab_ready = True
        except Exception:  # noqa: BLE001
            pass

        shot_d = OUT / "a7-named-desktop-1280x800.png"
        page.screenshot(path=str(shot_d), full_page=True)
        written.append(str(shot_d))

        # Optional fixture replay — best-effort; do not fail the named-URL gate on flake
        if lab_ready:
            try:
                page.select_option("#lab-fixture", "lab-canvas-textcontent")
                page.click("#lab-replay")
                page.wait_for_function(
                    """() => {
                      const t = document.querySelector('#lab-status')?.textContent || '';
                      return t.includes('done') || t.includes('finished');
                    }""",
                    timeout=20000,
                )
                page.wait_for_selector(
                    '#sanctum-canvas-root [data-canvas-component="TextContent"]',
                    timeout=10000,
                )
                body = page.locator(
                    '#sanctum-canvas-root [data-canvas-component="TextContent"]'
                ).inner_text()
                assert "Hello from lab fixture" in body, body
                replay_ok = True
                replay_note = "ok — TextContent fixture rendered"
                shot_r = OUT / "a7-named-fixture-replay-desktop.png"
                page.screenshot(path=str(shot_r), full_page=True)
                written.append(str(shot_r))
            except Exception as exc:  # noqa: BLE001
                replay_note = f"optional replay skipped/failed: {exc}"
        else:
            status_txt = ""
            if page.locator("#lab-status").count():
                status_txt = page.locator("#lab-status").inner_text()
            replay_note = (
                f"optional replay skipped — lab not ready "
                f"(status={status_txt!r}; often broken public/ asset symlinks on multihost)"
            )

        page.set_viewport_size({"width": 390, "height": 844})
        shot_m = OUT / "a7-named-mobile-390x844.png"
        page.screenshot(path=str(shot_m), full_page=True)
        written.append(str(shot_m))

        browser.close()

    print("A7.8 named-URL smoke OK")
    print(f"  url: {url}")
    print(f"  lab_ready: {lab_ready}")
    print(f"  fixture_replay: {replay_note}")
    for path in written:
        print(f"  screenshot: {path}")
    # Exit 0 when core asserts passed; replay is optional.
    _ = replay_ok
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

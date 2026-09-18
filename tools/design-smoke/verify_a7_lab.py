#!/usr/bin/env python3
"""
A7.7 — Python Playwright smoke for the standalone laboratory.

Starts `php -S` as a child on an ephemeral port (always killed in finally).
Proves offline fixture replay: canvas mounts TextContent from lab-canvas-textcontent
without Venice / external network.

Usage:
  /root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \\
    tools/design-smoke/verify_a7_lab.py
"""
from __future__ import annotations

import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a7"
OUT.mkdir(parents=True, exist_ok=True)

_COMPANION_VENV = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)
_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def pick_python() -> str:
    for candidate in (_LOCAL_VENV, _COMPANION_VENV):
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def start_php(port: int) -> subprocess.Popen:
    # Child PHP built-in server — must be killed in finally (no leaked listeners).
    return subprocess.Popen(
        ["php", "-S", f"127.0.0.1:{port}", "-t", str(PUBLIC)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=str(ROOT),
        start_new_session=True,
    )


def stop_php(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            proc.kill()
        proc.wait(timeout=3)


def wait_ready(url: str, timeout: float = 15.0) -> None:
    import urllib.request

    deadline = time.time() + timeout
    last_err: Exception | None = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(0.15)
    raise RuntimeError(f"server not ready: {url} ({last_err})")


def main() -> int:
    py = pick_python()
    # Re-exec under Playwright venv when system python lacks the package.
    if "playwright" not in sys.modules:
        try:
            import playwright  # noqa: F401
        except ImportError:
            if Path(py).resolve() != Path(sys.executable).resolve():
                os.execv(py, [py, str(Path(__file__).resolve()), *sys.argv[1:]])
            print("playwright missing — install into design-smoke venv", file=sys.stderr)
            return 2

    from playwright.sync_api import sync_playwright

    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = start_php(port)
    written: list[str] = []
    try:
        wait_ready(f"{base}/stream.php")
        wait_ready(f"{base}/fixtures/stream/lab-canvas-textcontent.json")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto(f"{base}/stream.php", wait_until="networkidle", timeout=30000)

            # Lab chrome outside canvas mount
            assert page.locator("#lab-chrome").count() == 1
            assert page.locator("#sanctum-canvas-root").count() == 1
            # Mount must not contain lab chrome
            assert page.locator("#sanctum-canvas-root #lab-chrome").count() == 0
            assert page.locator("#sanctum-canvas-root [data-lab-chrome]").count() == 0

            page.wait_for_selector('#lab-status[data-lab-ready="1"]', timeout=15000)

            page.select_option("#lab-fixture", "lab-canvas-textcontent")
            page.click("#lab-replay")
            page.wait_for_function(
                """() => {
                  const t = document.querySelector('#lab-status')?.textContent || '';
                  return t.includes('done') || t.includes('finished');
                }""",
                timeout=15000,
            )

            # Canvas shows TextContent from fixture (offline)
            page.wait_for_selector(
                '#sanctum-canvas-root [data-canvas-component="TextContent"]',
                timeout=10000,
            )
            body = page.locator(
                '#sanctum-canvas-root [data-canvas-component="TextContent"]'
            ).inner_text()
            assert "Hello from lab fixture" in body, body

            # Debug pane reflects finished run
            state_txt = page.locator("#debug-state").inner_text()
            assert "finished" in state_txt

            shot = OUT / "a7-lab-fixture-replay-desktop.png"
            page.screenshot(path=str(shot), full_page=True)
            written.append(str(shot))

            # Mobile smoke
            page.set_viewport_size({"width": 390, "height": 844})
            shot_m = OUT / "a7-lab-fixture-replay-mobile.png"
            page.screenshot(path=str(shot_m), full_page=True)
            written.append(str(shot_m))

            browser.close()

        print("A7.7 lab smoke OK")
        for path in written:
            print(f"  screenshot: {path}")
        return 0
    finally:
        stop_php(proc)


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
A9.6 — Python Playwright smoke for the lab home dashboard and the guided walkthrough.

Local mode (default): starts `php -S` as a child on an ephemeral port (killed in finally).
Remote mode: CANVAS_LAB_URL=https://canvas-lab.decisionsciencecorp.com  (no PHP child).

Walks every walkthrough step with Next, asserts the components each step promises
are on the canvas, exercises the interactive steps (Place reorder, follow-up chip,
modal Send), and captures desktop + mobile screenshots.

Usage:
  /root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \\
    tools/design-smoke/verify_a9_home_walkthrough.py
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
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a9"
OUT.mkdir(parents=True, exist_ok=True)

_COMPANION_VENV = Path("/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python")
_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"

# step id -> selectors that must exist on the canvas after the step lands
EXPECT: dict[str, list[str]] = {
    "welcome": [],
    "ask": [],
    "headline": ['[data-canvas-component="InlineHeader"]', '[data-canvas-component="TextContent"]'],
    "kpis": ['[data-canvas-component="OverviewCardBlock"]'],
    "charts": ['[data-canvas-component="Tabs"]', '[data-canvas-component="BarChart"]'],
    "table": ['[data-canvas-component="Table"]'],
    "alert": ['[data-canvas-component="Callout"]', '[data-canvas-component="TagBlock"]'],
    "sources": ['[data-canvas-component="CardSources"]'],
    "form": ['[data-canvas-component="Form"]', '[data-canvas-component="Select"]', '[data-canvas-component="Slider"]'],
    "tool": ['[data-canvas-component="ToolActivity"]', '[data-canvas-component="RunStatus"]'],
    "steps": ['[data-canvas-component="Steps"]'],
    "accordion": ['[data-canvas-component="Accordion"]'],
    "followups": ['[data-canvas-component="FollowUpBlock"]'],
    "followup-reply": ['[data-canvas-component="SingleStackedBarChart"]'],
    "modal": ['[data-canvas-component="Modal"]'],
    "carousel": ['[data-canvas-component="Carousel"]'],
    "program": ['[data-canvas-component="CodeBlock"]'],
    "done": ['[data-canvas-component="ListBlock"]'],
}
STEP_ORDER = list(EXPECT.keys())


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
            with urllib.request.urlopen(url, timeout=3) as resp:
                if resp.status == 200:
                    return
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(0.15)
    raise RuntimeError(f"server not ready: {url} ({last_err})")


def run(base: str, tag: str) -> list[str]:
    from playwright.sync_api import sync_playwright

    written: list[str] = []
    console_errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))

        # ---- home ----
        page.goto(f"{base}/index.php", wait_until="networkidle", timeout=30000)
        assert page.locator(".home-tile").count() >= 6, "home tiles missing"
        assert page.locator('.home-tile[href="/walkthrough.php"]').count() == 1
        assert page.locator('.home-tile[href="/stream.php"]').count() == 1
        shot = OUT / f"a9-home-desktop-{tag}.png"
        page.screenshot(path=str(shot), full_page=True)
        written.append(str(shot))

        # ---- stream lab still serves ----
        page.goto(f"{base}/stream.php", wait_until="networkidle", timeout=30000)
        assert page.locator("#lab-chrome").count() == 1
        assert page.locator('a[href="/index.php"]').count() >= 1

        # ---- walkthrough ----
        page.goto(f"{base}/walkthrough.php", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#wt-ready[data-lab-ready="1"]', timeout=15000, state="attached")
        assert page.locator("#sanctum-canvas-root [data-lab-chrome]").count() == 0
        canvas = "#sanctum-canvas-root "
        shot = OUT / f"a9-walkthrough-step01-desktop-{tag}.png"
        page.screenshot(path=str(shot), full_page=False)
        written.append(str(shot))

        seen_steps: list[str] = []
        for i, step_id in enumerate(STEP_ORDER):
            if i > 0:
                page.wait_for_selector("#wt-next:not([disabled])", timeout=20000)
                page.click("#wt-next")
            page.wait_for_function(
                "(id) => document.body.dataset.step === id", arg=step_id, timeout=15000
            )
            # Let effects (typewriter / tool phases) finish: Next re-enables when done
            # (on the last step it stays disabled and reads "Finished").
            if step_id != STEP_ORDER[-1]:
                page.wait_for_selector("#wt-next:not([disabled])", timeout=25000)
            else:
                page.wait_for_function("() => document.querySelector('#wt-next').textContent.trim() === 'Finished'", timeout=25000)

            # Interactive steps: perform the real canvas interaction.
            if step_id == "tool":
                page.wait_for_selector(canvas + '[data-canvas-component="Form"]', timeout=10000)
                page.click(canvas + 'button[type="submit"], ' + canvas + '[data-canvas-component="Submit"]')
                page.wait_for_selector(canvas + '[data-canvas-component="RunStatus"]', timeout=20000)
            elif step_id == "followups":
                page.click(canvas + '[data-canvas-component="FollowUpItem"] >> nth=0')
                page.wait_for_selector(canvas + '[data-canvas-component="SingleStackedBarChart"]', timeout=10000)
            elif step_id == "modal":
                page.wait_for_selector(canvas + '[data-canvas-component="Modal"]', timeout=10000)
                shot = OUT / f"a9-walkthrough-modal-desktop-{tag}.png"
                page.screenshot(path=str(shot), full_page=False)
                written.append(str(shot))
                page.click(canvas + '[data-canvas-component="Modal"] button:has-text("Send it")')
                page.wait_for_selector(canvas + '[data-canvas-component="Callout"]:has-text("Note sent")', timeout=10000)

            for sel in EXPECT[step_id]:
                page.wait_for_selector(canvas + sel, timeout=10000, state="attached")
            seen_steps.append(step_id)

            if step_id in ("headline", "charts", "form", "tool", "followup-reply", "done"):
                shot = OUT / f"a9-walkthrough-{step_id}-desktop-{tag}.png"
                page.screenshot(path=str(shot), full_page=False)
                written.append(str(shot))

        assert page.locator("#wt-next").inner_text().strip() == "Finished"
        assert page.locator("#wt-chat .wt-bubble--user").count() >= 3, "chat transcript too short"

        # Deep link restores a late step cold
        page.goto(f"{base}/walkthrough.php?step=followup-reply", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#wt-ready[data-lab-ready="1"]', timeout=15000, state="attached")
        page.wait_for_selector(canvas + '[data-canvas-component="SingleStackedBarChart"]', timeout=10000)
        assert page.locator("#wt-chat .wt-bubble--user").count() >= 2

        # Mobile
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{base}/index.php", wait_until="networkidle", timeout=30000)
        shot = OUT / f"a9-home-mobile-{tag}.png"
        page.screenshot(path=str(shot), full_page=True)
        written.append(str(shot))
        page.goto(f"{base}/walkthrough.php?step=charts", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#wt-ready[data-lab-ready="1"]', timeout=15000, state="attached")
        page.wait_for_selector(canvas + '[data-canvas-component="Tabs"]', timeout=10000)
        shot = OUT / f"a9-walkthrough-charts-mobile-{tag}.png"
        page.screenshot(path=str(shot), full_page=True)
        written.append(str(shot))

        browser.close()

    # frame-ancestors is delivered by the HTTP header; the meta duplicate is defense-in-depth and browsers note it.
    real_errors = [e for e in console_errors if "favicon" not in e and "frame-ancestors" not in e]
    if real_errors:
        print("console errors:")
        for e in real_errors:
            print("  ", e)
        raise AssertionError("console errors during walkthrough")

    print(f"A9 smoke OK ({tag}) — steps: {len(seen_steps)}/{len(STEP_ORDER)}")
    for w in written:
        print("  screenshot:", w)
    return written


def main() -> int:
    py = pick_python()
    try:
        import playwright  # noqa: F401
    except ImportError:
        # venv python symlinks to the system binary — compare paths, not resolved targets.
        if Path(py).is_file() and py != sys.executable and not os.environ.get("A9_SMOKE_REEXEC"):
            os.environ["A9_SMOKE_REEXEC"] = "1"
            os.execv(py, [py, str(Path(__file__).resolve()), *sys.argv[1:]])
        print("playwright missing — install into design-smoke venv", file=sys.stderr)
        return 2

    remote = os.environ.get("CANVAS_LAB_URL", "").rstrip("/")
    if remote:
        if remote.endswith(".php"):
            remote = remote.rsplit("/", 1)[0]
        wait_ready(f"{remote}/index.php")
        run(remote, "live")
        return 0

    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = start_php(port)
    try:
        wait_ready(f"{base}/index.php")
        run(base, "local")
    finally:
        stop_php(proc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

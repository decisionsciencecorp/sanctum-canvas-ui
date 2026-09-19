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
        # "Failed to load resource" console lines omit the URL; record it from the response.
        page.on(
            "response",
            lambda r: console_errors.append(f"http {r.status}: {r.url}") if r.status >= 400 else None,
        )

        # ---- home ----
        page.goto(f"{base}/index.php", wait_until="networkidle", timeout=30000)
        assert page.locator(".home-tile").count() >= 6, "home tiles missing"
        assert page.locator('.home-tile[href="/walkthrough.php"]').count() == 1
        assert page.locator('.home-tile[href="/stream.php"]').count() == 1
        assert page.locator('.home-tile[href="/lab/catalog.html"]').count() == 1, "catalog tile missing"
        shot = OUT / f"a9-home-desktop-{tag}.png"
        page.screenshot(path=str(shot), full_page=True)
        written.append(str(shot))

        # ---- catalog page reads the real library files ----
        page.goto(f"{base}/lab/catalog.html", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#status[data-lab-ready="1"]', timeout=15000, state="attached")
        dash_count = int(page.locator("#count-dashboard").inner_text())
        chat_count = int(page.locator("#count-chat").inner_text())
        assert dash_count >= 80 and chat_count >= 80, (dash_count, chat_count)
        assert page.locator("#groups .cat-group").count() >= 8, "catalog groups missing"
        assert page.locator("#comp-Stack .cat-comp__badge--root").count() == 1, "Stack not marked root"
        assert page.locator("#comp-FormControl .cat-comp__sig").text_content().find("Input | TextArea") >= 0
        # Live draws — not just JSON contracts
        assert page.locator('#comp-Stack .cat-comp__mount [data-canvas-component="Callout"]').count() >= 3
        assert page.locator('#comp-Stack .cat-comp__mount [data-canvas-component="Stack"][data-direction="row"]').count() >= 1
        assert page.locator('#comp-Stack .cat-comp__mount [data-canvas-component="Stack"][data-direction="column"]').count() >= 1
        page.locator("#comp-Stack").scroll_into_view_if_needed()
        shot = OUT / f"a9-catalog-stack-desktop-{tag}.png"
        page.locator("#comp-Stack").screenshot(path=str(shot))
        written.append(str(shot))
        for name in ("Stack", "BarChart", "Form", "Tag", "SnippetCardBlock", "Modal"):
            mount = page.locator(f'#comp-{name} .cat-comp__mount')
            assert mount.count() == 1, f"missing live mount for {name}"
            assert mount.locator("[data-canvas-component]").count() >= 1, f"{name} did not paint"
        assert page.locator("#comp-Modal .cat-comp__open-modal").count() == 1
        assert page.locator("#comp-Series .cat-comp__preview-note").count() == 1
        shot = OUT / f"a9-catalog-desktop-{tag}.png"
        page.screenshot(path=str(shot), full_page=False)
        written.append(str(shot))
        # Crop a chart entry so the live SVG is reviewable
        page.locator("#comp-BarChart").scroll_into_view_if_needed()
        shot = OUT / f"a9-catalog-barchart-desktop-{tag}.png"
        page.locator("#comp-BarChart").screenshot(path=str(shot))
        written.append(str(shot))
        page.fill("#filter", "chart")
        page.wait_for_function("() => document.querySelectorAll('#groups .cat-comp:not(.is-hidden)').length < 30")
        assert page.locator("#groups .cat-comp:not(.is-hidden)").count() >= 9, "chart filter too narrow"
        page.click("#tab-chat")
        page.wait_for_selector("#comp-FollowUpBlock", timeout=5000, state="attached")
        assert page.locator("#comp-Card .cat-comp__badge--root").count() == 1, "chat root is Card"
        assert page.locator("#comp-Modal").count() == 0, "Modal must not be in the chat catalog"
        assert page.locator('#comp-FollowUpBlock [data-canvas-component="FollowUpBlock"]').count() >= 1
        assert page.locator('#comp-SectionBlock [data-canvas-component="SectionBlock"]').count() >= 1
        shot = OUT / f"a9-catalog-chat-desktop-{tag}.png"
        page.screenshot(path=str(shot), full_page=False)
        written.append(str(shot))
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{base}/lab/catalog.html", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#status[data-lab-ready="1"]', timeout=15000, state="attached")
        page.locator("#comp-Tag").scroll_into_view_if_needed()
        shot = OUT / f"a9-catalog-tag-mobile-{tag}.png"
        page.locator("#comp-Tag").screenshot(path=str(shot))
        written.append(str(shot))
        page.set_viewport_size({"width": 1280, "height": 800})

        # ---- A6 gallery: the small-parts section renders every piece ----
        page.goto(f"{base}/lab/a6-library.html", wait_until="networkidle", timeout=30000)
        page.wait_for_selector('#status[data-lab-ready="1"]', timeout=15000, state="attached")
        for comp in ("MarkDownRenderer", "MetricIndicatorInline", "MetricIndicatorWithStrikethrough", "IconText", "ImageText", "ImageTextLarge", "Icon", "Tag"):
            assert page.locator(f'#mount-small-parts [data-canvas-component="{comp}"]').count() >= 1, comp
        assert page.locator('#mount-small-parts [data-canvas-component="MarkDownRenderer"] strong').count() == 1
        page.locator("#family-small-parts").scroll_into_view_if_needed()
        shot = OUT / f"a9-a6-small-parts-desktop-{tag}.png"
        page.locator("#family-small-parts").screenshot(path=str(shot))
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

            if step_id == "steps":
                # Guide must stay on screen when the canvas jumps to the new block.
                title_box = page.locator("#wt-title").bounding_box()
                assert title_box and title_box["y"] > 0, title_box
                steps_box = page.locator(canvas + '[data-canvas-component="Steps"]').bounding_box()
                assert steps_box and steps_box["y"] > 40, steps_box

            for sel in EXPECT[step_id]:
                page.wait_for_selector(canvas + sel, timeout=10000, state="attached")
            if step_id in ("ask", "done"):
                assert page.locator('#wt-links a[href="/lab/catalog.html"]').count() == 1, f"{step_id}: catalog link"
                assert not page.locator("#wt-links-wrap").is_hidden()
            if step_id == "program":
                program_text = page.locator("#wt-program").inner_text()
                assert "root = Stack([" in program_text, program_text[:80]
                assert "Callout(\"warning\"" in page.locator(canvas + '[data-canvas-component="CodeBlock"]').inner_text()
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

#!/usr/bin/env python3
"""
A8.4 — Python Playwright accessibility + responsive smoke on the named lab URL.

Targets https://canvas-lab.decisionsciencecorp.com/ (not localhost / not php -S).
Keyboard Tab order, focus-visible, landmarks/labels, mobile + desktop screenshots.
Also opens deployed A5/A6 lab pages under /lab/ when HTTP 200.

Usage:
  /root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \\
    tools/design-smoke/verify_a8_a11y.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "track-a" / "screenshots" / "a8-a11y"
OUT.mkdir(parents=True, exist_ok=True)

DEFAULT_BASE = "https://canvas-lab.decisionsciencecorp.com"
_COMPANION_VENV = Path(
    "/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python"
)
_LOCAL_VENV = ROOT / "tools" / "design-smoke" / ".venv" / "bin" / "python"

LAB_PAGES = [
    "/lab/a5-baseline.html",
    "/lab/a5-foundation.html",
    "/lab/a5-stack-card.html",
    "/lab/a5-carousel-modal.html",
    "/lab/a6-baseline.html",
    "/lab/a6-library.html",
]


def pick_python() -> str:
    for candidate in (_LOCAL_VENV, _COMPANION_VENV):
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def audit_page(page, label: str) -> dict:
    """Collect WCAG-oriented signals from the live DOM (no axe dependency)."""
    return page.evaluate(
        """({ label }) => {
          const issues = [];
          const notes = [];
          const doc = document;
          const html = doc.documentElement;
          if (!html.getAttribute('lang')) {
            issues.push({ id: 'html-lang', level: 'A', criterion: '3.1.1',
              detail: 'html missing lang' });
          }
          const title = (doc.title || '').trim();
          if (!title) {
            issues.push({ id: 'doc-title', level: 'A', criterion: '2.4.2',
              detail: 'document title empty' });
          }
          const mains = doc.querySelectorAll('main, [role="main"]');
          if (mains.length === 0) {
            issues.push({ id: 'main-landmark', level: 'A', criterion: '1.3.1',
              detail: 'no main landmark' });
          } else if (mains.length > 1) {
            notes.push('multiple main landmarks: ' + mains.length);
          }
          // Images without alt (decorative should be alt="")
          for (const img of doc.querySelectorAll('img')) {
            if (!img.hasAttribute('alt')) {
              issues.push({ id: 'img-alt', level: 'A', criterion: '1.1.1',
                detail: 'img missing alt: ' + (img.getAttribute('src') || '').slice(0, 80) });
            }
          }
          // Form controls without accessible name
          const controls = doc.querySelectorAll('input, select, textarea, button');
          let unnamed = 0;
          for (const el of controls) {
            if (el.disabled || el.getAttribute('aria-hidden') === 'true') continue;
            const type = (el.getAttribute('type') || '').toLowerCase();
            if (type === 'hidden') continue;
            const name =
              (el.getAttribute('aria-label') || '').trim() ||
              (el.getAttribute('aria-labelledby')
                ? (doc.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '')
                : '') ||
              (el.labels && el.labels[0] ? el.labels[0].textContent : '') ||
              (el.textContent || '').trim() ||
              (el.getAttribute('title') || '').trim() ||
              (el.getAttribute('placeholder') || '').trim();
            if (!name) unnamed += 1;
          }
          if (unnamed > 0) {
            issues.push({ id: 'control-name', level: 'A', criterion: '4.1.2',
              detail: unnamed + ' interactive control(s) without accessible name' });
          }
          // Prefer visible focus styles somewhere in the cascade
          const hasFocusRule = [...doc.styleSheets].some((sheet) => {
            try {
              return [...sheet.cssRules].some((r) =>
                String(r.selectorText || '').includes(':focus')
              );
            } catch (_) { return false; }
          });
          if (!hasFocusRule) {
            issues.push({ id: 'focus-css', level: 'AA', criterion: '2.4.7',
              detail: 'no :focus / :focus-visible rules found in stylesheets' });
          }
          const skip = doc.querySelector(
            'a[href="#sanctum-canvas-root"], a.a7-lab-skip, a[href="#canvas-root"]'
          );
          if (!skip && label === 'lab-main') {
            issues.push({ id: 'skip-link', level: 'A', criterion: '2.4.1',
              detail: 'no skip-to-canvas link for dense lab chrome' });
          }
          return {
            label,
            title,
            lang: html.getAttribute('lang') || '',
            issueCount: issues.length,
            issues,
            notes,
            controlCount: controls.length,
          };
        }""",
        {"label": label},
    )


def keyboard_smoke(page) -> dict:
    """Tab through first N focusables; assert focus moves and outline is non-none."""
    page.keyboard.press("Tab")
    first = page.evaluate(
        """() => {
          const el = document.activeElement;
          if (!el || el === document.body) return { ok: false, reason: 'no focus after Tab' };
          const cs = getComputedStyle(el);
          const outline = cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor;
          const box = cs.boxShadow;
          const ringOk =
            (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') ||
            (box && box !== 'none');
          return {
            ok: true,
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            outline,
            boxShadow: box,
            ringOk,
            text: (el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 60),
          };
        }"""
    )
    visited = []
    for _ in range(12):
        info = page.evaluate(
            """() => {
              const el = document.activeElement;
              return el ? (el.id || el.tagName + ':' + (el.name || '')) : '';
            }"""
        )
        if info and info not in visited:
            visited.append(info)
        page.keyboard.press("Tab")
    return {"first": first, "visitedIds": visited, "tabStops": len(visited)}


def capture(page, stem: str, written: list[str]) -> None:
    path = OUT / f"{stem}.png"
    page.screenshot(path=str(path), full_page=True)
    written.append(str(path))


def main() -> int:
    py = pick_python()
    try:
        import playwright  # noqa: F401
    except ImportError:
        if Path(py).resolve() != Path(sys.executable).resolve():
            os.execv(py, [py, str(Path(__file__).resolve()), *sys.argv[1:]])
        print("playwright missing — install into design-smoke venv", file=sys.stderr)
        return 2

    from playwright.sync_api import sync_playwright

    base = (os.environ.get("CANVAS_LAB_URL") or DEFAULT_BASE).rstrip("/")
    # Allow CANVAS_LAB_URL to be a full index.php URL
    if base.endswith(".php"):
        base = base.rsplit("/", 1)[0]
    main_url = f"{base}/stream.php"
    written: list[str] = []
    report: dict = {"base": base, "pages": [], "keyboard": {}, "blockers": [], "warnings": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        resp = page.goto(main_url, wait_until="domcontentloaded", timeout=45000)
        assert resp is not None and resp.status == 200, f"lab main HTTP {resp and resp.status}"
        try:
            page.wait_for_selector('#lab-status[data-lab-ready="1"]', timeout=15000)
        except Exception:  # noqa: BLE001
            pass

        audit = audit_page(page, "lab-main")
        report["pages"].append(audit)
        kb = keyboard_smoke(page)
        report["keyboard"]["lab-main"] = kb
        if not kb["first"].get("ok"):
            report["blockers"].append("keyboard: no focus after Tab on lab-main")
        elif not kb["first"].get("ringOk"):
            report["blockers"].append(
                "WCAG 2.4.7: first Tab focus has no visible outline/box-shadow on lab-main "
                f"(active={kb['first'].get('id') or kb['first'].get('tag')})"
            )
        for issue in audit["issues"]:
            report["blockers"].append(f"{issue['criterion']} {issue['id']}: {issue['detail']}")
        for note in audit.get("notes") or []:
            report["warnings"].append(note)

        capture(page, "lab-main-desktop-1280x800", written)
        # Focus ring proof crop — second Tab often lands on a control
        page.keyboard.press("Tab")
        capture(page, "lab-main-keyboard-focus", written)

        page.set_viewport_size({"width": 390, "height": 844})
        capture(page, "lab-main-mobile-390x844", written)

        # Replay a fixture so canvas has content for mobile/desktop a11y glance
        page.set_viewport_size({"width": 1280, "height": 800})
        if page.locator("#lab-fixture").count():
            try:
                page.select_option("#lab-fixture", "lab-canvas-textcontent")
                page.click("#lab-replay")
                page.wait_for_selector(
                    '#sanctum-canvas-root [data-canvas-component="TextContent"]',
                    timeout=15000,
                )
                capture(page, "lab-main-fixture-desktop", written)
                page.set_viewport_size({"width": 390, "height": 844})
                capture(page, "lab-main-fixture-mobile", written)
            except Exception as exc:  # noqa: BLE001
                report["warnings"].append(f"fixture replay skipped: {exc}")

        # A5 / A6 lab pages
        for path in LAB_PAGES:
            url = f"{base}{path}"
            page.set_viewport_size({"width": 1280, "height": 800})
            r = page.goto(url, wait_until="domcontentloaded", timeout=30000)
            status = r.status if r else 0
            stem = path.strip("/").replace("/", "-").replace(".html", "")
            entry = {"path": path, "status": status}
            if status != 200:
                report["warnings"].append(f"{path} HTTP {status} — skipped")
                report["pages"].append(entry)
                continue
            page.wait_for_timeout(400)
            a = audit_page(page, stem)
            entry.update(a)
            report["pages"].append(entry)
            for issue in a["issues"]:
                # Lab gallery pages may intentionally omit main; escalate only hard A criteria
                if issue["id"] in ("html-lang", "doc-title", "img-alt", "control-name"):
                    report["blockers"].append(
                        f"{path}: {issue['criterion']} {issue['id']}: {issue['detail']}"
                    )
                else:
                    report["warnings"].append(
                        f"{path}: {issue['criterion']} {issue['id']}: {issue['detail']}"
                    )
            capture(page, f"{stem}-desktop-1280x800", written)
            page.set_viewport_size({"width": 390, "height": 844})
            capture(page, f"{stem}-mobile-390x844", written)

        browser.close()

    report["screenshots"] = written
    report["blockerCount"] = len(report["blockers"])
    out_json = OUT / "a8-a11y-report.json"
    out_json.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("A8.4 a11y smoke")
    print(f"  url: {main_url}")
    print(f"  blockers: {report['blockerCount']}")
    for b in report["blockers"]:
        print(f"  BLOCKER: {b}")
    for w in report["warnings"]:
        print(f"  warn: {w}")
    for path in written:
        print(f"  screenshot: {path}")
    print(f"  report: {out_json}")

    return 1 if report["blockers"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

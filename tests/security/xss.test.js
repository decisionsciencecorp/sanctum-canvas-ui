/**
 * A8.3 — XSS / markdown hostile regression (no named URL required).
 * Reuses tests/fixtures/hostile/* markdown cases.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  markdownToSafeHtml,
  sanitizeHtml,
} from "../../src/Browser/security/markdown.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createTestDom } from "../browser/helpers/miniDom.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const hostileDir = join(root, "tests/fixtures/hostile");

describe("security/xss — hostile markdown fixtures", () => {
  const files = readdirSync(hostileDir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 5, "expected hostile fixture corpus");

  for (const file of files) {
    const fixture = JSON.parse(readFileSync(join(hostileDir, file), "utf8"));
    if (fixture.kind !== "markdown") continue;

    it(`${fixture.id || file} stays inert`, () => {
      const html = markdownToSafeHtml(fixture.input);
      for (const re of fixture.mustNotMatch || []) {
        assert.doesNotMatch(html, new RegExp(re, "i"), `${file} matched /${re}/`);
      }
      for (const re of fixture.mustMatch || []) {
        assert.match(html, new RegExp(re, "i"), `${file} missing /${re}/`);
      }
    });
  }

  it("sanitizeHtml strips handlers and script tags", () => {
    const clean = sanitizeHtml(
      '<p onclick="alert(1)">x</p><script>bad()</script><img src=x onerror=alert(1)>',
    );
    assert.doesNotMatch(clean, /onclick/i);
    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /onerror/i);
  });
});

describe("security/xss — unknown component fail-closed", () => {
  it("hostile unknown-component fixture never mounts scripts", () => {
    const fixture = JSON.parse(
      readFileSync(join(hostileDir, "unknown-component.json"), "utf8"),
    );
    const { document } = createTestDom();
    const registry = createComponentRegistry({});
    const el = registry.render(fixture.input.type, fixture.input.props || {}, {
      document,
    });
    assert.equal(el.getAttribute(fixture.assert.attribute), fixture.assert.value);
    const html = typeof el.outerHTML === "string" ? el.outerHTML : String(el);
    assert.doesNotMatch(html, /<script/i);
  });
});

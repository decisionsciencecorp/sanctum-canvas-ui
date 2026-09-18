/**
 * A8.3 — XSS / markdown hostile regression (Doc #1379 §9.1 / H12).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  markdownToSafeHtml,
  markdownToSafeDom,
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

describe("security/xss — allowlisted markdown features", () => {
  it("renders headings, emphasis, lists, fence, blockquote, table, safe link", () => {
    const md = [
      "# Title",
      "",
      "Hello **bold** and *em* and `code`",
      "",
      "> quote [ok](https://example.com) [bad](javascript:alert(1))",
      "",
      "- one",
      "- two",
      "",
      "1. a",
      "2. b",
      "",
      "```",
      "no <script>",
      "```",
      "",
      "| H | I |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "See [1] and [2][3]",
    ].join("\n");
    const html = markdownToSafeHtml(md);
    assert.match(html, /<h1/i);
    assert.match(html, /<strong/i);
    assert.match(html, /<em/i);
    assert.match(html, /<code/i);
    assert.match(html, /<blockquote/i);
    assert.match(html, /<ul/i);
    assert.match(html, /<ol/i);
    assert.match(html, /<pre/i);
    assert.match(html, /<table/i);
    assert.match(html, /href="https:\/\/example\.com"/i);
    assert.doesNotMatch(html, /javascript:/i);
    assert.match(html, /data-citation="1"/i);
    assert.doesNotMatch(html, /<script/i);
  });

  it("markdownToSafeDom empty / null is empty container", () => {
    const { document } = createTestDom();
    const a = markdownToSafeDom(null, document);
    const b = markdownToSafeDom("", document);
    assert.equal(a.childNodes.length, 0);
    assert.equal(b.childNodes.length, 0);
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

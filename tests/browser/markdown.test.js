import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToSafeHtml, sanitizeHtml, escapeHtml } from "../../src/Browser/security/markdown.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const hostileDir = join(root, "tests/fixtures/hostile");

describe("markdown", () => {
  it("renders basic formatting", () => {
    const html = markdownToSafeHtml("Hello **bold** and *em* and `code`");
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<em>em<\/em>/);
    assert.match(html, /<code>code<\/code>/);
    assert.match(html, /<p>/);
  });

  it("renders headings, lists, blockquote, pre", () => {
    const md = [
      "# H1",
      "## H2",
      "### H3",
      "",
      "- a",
      "- b",
      "",
      "1. one",
      "",
      "> quote",
      "",
      "```",
      "line",
      "```",
    ].join("\n");
    const html = markdownToSafeHtml(md);
    assert.match(html, /<h1>H1<\/h1>/);
    assert.match(html, /<h2>H2<\/h2>/);
    assert.match(html, /<h3>H3<\/h3>/);
    assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
    assert.match(html, /<ol><li>one<\/li><\/ol>/);
    assert.match(html, /<blockquote>quote<\/blockquote>/);
    assert.match(html, /<pre><code>line<\/code><\/pre>/);
  });

  it("allows safe http(s) links via sanitizeUrl", () => {
    const html = markdownToSafeHtml("[ok](https://example.com/path)");
    assert.match(html, /<a href="https:\/\/example\.com\/path" rel="noopener noreferrer">ok<\/a>/);
  });

  it("rejects javascript: URLs in markdown links", () => {
    const html = markdownToSafeHtml("[x](javascript:alert(1))");
    assert.doesNotMatch(html, /javascript:/i);
    assert.doesNotMatch(html, /<a\b/i);
    assert.match(html, /x/);
  });

  it("escapes raw HTML / script payloads", () => {
    const html = markdownToSafeHtml('Hi <script>alert(1)</script> <img src=x onerror=alert(1)>');
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /onerror/i);
    assert.doesNotMatch(html, /<img/i);
    assert.match(html, /&lt;script&gt;/i);
  });

  it("sanitizeHtml strips on* handlers and blocked tags", () => {
    const dirty =
      '<p onclick="alert(1)" style="x:y">ok</p><script>bad()</script><iframe src="x"></iframe>' +
      '<a href="javascript:alert(1)">nope</a><a href="https://ok.example">yes</a>';
    const clean = sanitizeHtml(dirty);
    assert.doesNotMatch(clean, /onclick/i);
    assert.doesNotMatch(clean, /style=/i);
    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /iframe/i);
    assert.doesNotMatch(clean, /javascript:/i);
    assert.match(clean, /<a href="https:\/\/ok\.example"/);
    assert.match(clean, /nope/);
  });

  it("escapeHtml encodes entities", () => {
    assert.equal(escapeHtml(`<&"'`), "&lt;&amp;&quot;&#39;");
  });

  it("hostile fixtures produce no executable sinks", () => {
    const files = readdirSync(hostileDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 3, "expected ≥3 hostile fixtures");
    for (const file of files) {
      const fixture = JSON.parse(readFileSync(join(hostileDir, file), "utf8"));
      if (fixture.kind === "markdown") {
        const html = markdownToSafeHtml(fixture.input);
        for (const re of fixture.mustNotMatch || []) {
          assert.doesNotMatch(html, new RegExp(re, "i"), `${file} matched /${re}/`);
        }
        for (const re of fixture.mustMatch || []) {
          assert.match(html, new RegExp(re, "i"), `${file} missing /${re}/`);
        }
      }
    }
  });
});

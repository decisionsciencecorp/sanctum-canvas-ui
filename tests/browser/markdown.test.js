import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  markdownToSafeHtml,
  markdownToSafeDom,
  sanitizeHtml,
  escapeHtml,
  serializeDom,
} from "../../src/Browser/security/markdown.js";
import { createTestDom } from "./helpers/miniDom.js";

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

  it("renders GFM tables", () => {
    const md = ["| Name | Qty |", "| --- | --- |", "| a | 1 |", "| **b** | 2 |"].join("\n");
    const html = markdownToSafeHtml(md);
    assert.match(html, /<table>/);
    assert.match(html, /<thead><tr><th>Name<\/th><th>Qty<\/th><\/tr><\/thead>/);
    assert.match(html, /<td><strong>b<\/strong><\/td>/);
    assert.doesNotMatch(html, /<script/i);
  });

  it("renders citations as cite[data-citation]", () => {
    const html = markdownToSafeHtml("Claim [1][2] stands.");
    assert.match(html, /<cite data-citation="1">1<\/cite>/);
    assert.match(html, /<cite data-citation="2">2<\/cite>/);
    assert.doesNotMatch(html, /\[1\]/);
  });

  it("does not treat [1](url) as citation — still a link", () => {
    const html = markdownToSafeHtml("[1](https://example.com/ref)");
    assert.match(html, /<a href="https:\/\/example\.com\/ref"/);
    assert.doesNotMatch(html, /<cite/);
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

  it("keeps math and iframe payloads inert", () => {
    const html = markdownToSafeHtml('See <math><mi>x</mi></math> and <iframe src="https://evil"></iframe>');
    assert.doesNotMatch(html, /<math/i);
    assert.doesNotMatch(html, /<iframe/i);
    assert.match(html, /&lt;math/);
  });

  it("sanitizeHtml strips on* handlers and blocked tags", () => {
    const dirty =
      '<p onclick="alert(1)" style="x:y">ok</p><script>bad()</script><iframe src="x"></iframe>' +
      '<a href="javascript:alert(1)">nope</a><a href="https://ok.example">yes</a>' +
      '<cite data-citation="3"><b>3</b></cite>';
    const clean = sanitizeHtml(dirty);
    assert.doesNotMatch(clean, /onclick/i);
    assert.doesNotMatch(clean, /style=/i);
    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /iframe/i);
    assert.doesNotMatch(clean, /javascript:/i);
    assert.match(clean, /<a href="https:\/\/ok\.example"/);
    assert.match(clean, /nope/);
    assert.match(clean, /<cite data-citation="3">/);
  });

  it("escapeHtml encodes entities", () => {
    assert.equal(escapeHtml(`<&"'`), "&lt;&amp;&quot;&#39;");
  });

  it("paragraph then table stops paragraph accumulation", () => {
    const html = markdownToSafeHtml("Intro line\n| a | b |\n| --- | --- |\n| 1 | 2 |");
    assert.match(html, /<p>Intro line<\/p>/);
    assert.match(html, /<table>/);
    assert.match(html, /<td>1<\/td>/);
  });

  it("null/empty markdown and serializeDom edge cases", () => {
    assert.equal(markdownToSafeHtml(null), "");
    assert.equal(markdownToSafeHtml(""), "");
    assert.equal(serializeDom(null), "");
    assert.equal(serializeDom({ nodeType: 99 }), "");
    const { document } = createTestDom();
    const orphanText = document.createTextNode("hi<");
    assert.equal(serializeDom(orphanText), "hi&lt;");
    const badLink = document.createElement("a");
    badLink.setAttribute("href", "javascript:1");
    badLink.setAttribute("onclick", "x");
    badLink.appendChild(document.createTextNode("z"));
    assert.equal(serializeDom(badLink), "<a>z</a>");
  });

  it("markdownToSafeDom uses createElement path with miniDom", () => {
    const { document } = createTestDom();
    const root = markdownToSafeDom("Hello **x** [1]", document);
    assert.equal(root.tagName, "DIV");
    const html = serializeDom(root).replace(/^<div>|<\/div>$/g, "");
    // serializeDom on container includes wrapper — use child serialize via markdownToSafeHtml
    const via = markdownToSafeHtml("Hello **x** [1]", document);
    assert.match(via, /<strong>x<\/strong>/);
    assert.match(via, /<cite data-citation="1">1<\/cite>/);
    assert.ok(root.childNodes.length >= 1);
  });

  it("table cells cannot smuggle script via raw HTML", () => {
    const md = ["| a | b |", "| --- | --- |", "| <script>x</script> | ok |"].join("\n");
    const html = markdownToSafeHtml(md);
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /&lt;script&gt;/);
  });

  it("hostile fixtures produce no executable sinks", () => {
    const files = readdirSync(hostileDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 5, "expected ≥5 hostile fixtures");
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

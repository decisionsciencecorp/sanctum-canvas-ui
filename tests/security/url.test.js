/**
 * A8.3 — URL / CSS-url policy regression (H4).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { safeUrl, toCssUrl } from "../../src/Browser/security/urlPolicy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const casesPath = join(root, "resources/fixtures/url-policy/safeUrl.cases.json");
const handoffOpenUrl = JSON.parse(
  readFileSync(
    join(root, "tests/fixtures/handoff/open-url-callback.json"),
    "utf8",
  ),
);

describe("security/url — safeUrl corpus", () => {
  const fixture = JSON.parse(readFileSync(casesPath, "utf8"));
  for (const c of fixture.cases) {
    it(`case ${c.id}`, () => {
      const out = safeUrl(c.input);
      if (c.expect === null) assert.equal(out, undefined);
      else assert.equal(out, c.expect);
    });
  }
});

describe("security/url — encoded and obfuscated schemes", () => {
  const hostile = [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "  java\u0000script:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "file:///etc/passwd",
    "//evil.example/phish",
  ];
  for (const url of hostile) {
    it(`rejects ${JSON.stringify(url)}`, () => {
      assert.equal(safeUrl(url), undefined);
      assert.equal(toCssUrl(url), undefined);
    });
  }

  it("toCssUrl wraps only safe https", () => {
    const css = toCssUrl("https://cdn.example/a.png");
    assert.match(css, /^url\("https:\/\/cdn\.example\/a\.png"\)$/);
  });

  it("handoff OpenUrl cases agree with policy", () => {
    for (const c of handoffOpenUrl.cases) {
      if (!("expectSafeUrl" in c)) continue;
      const out = safeUrl(c.step.url);
      if (c.expectSafeUrl === null) assert.equal(out, undefined);
      else assert.equal(out, c.expectSafeUrl);
    }
  });
});

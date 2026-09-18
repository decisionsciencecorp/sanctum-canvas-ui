/**
 * A8.3 — URL / CSS-url policy regression (H4) — Doc #1379 §9.3.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  safeUrl,
  sanitizeUrl,
  toCssUrl,
  isHostAllowed,
  mergeNoopenerFeatures,
  relForTarget,
  safeOpenUrl,
} from "../../src/Browser/security/urlPolicy.js";

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

describe("security/url — relatives, hosts, open helpers", () => {
  it("allows relative / hash paths", () => {
    assert.equal(safeUrl("/assets/x.png"), "/assets/x.png");
    assert.equal(safeUrl("./local.svg"), "./local.svg");
    assert.equal(safeUrl("../up.png"), "../up.png");
    assert.equal(safeUrl("#section"), "#section");
    assert.equal(sanitizeUrl("/ok"), "/ok");
  });

  it("mailto passes; ftp rejected", () => {
    assert.equal(safeUrl("mailto:a@b.com"), "mailto:a@b.com");
    assert.equal(safeUrl("ftp://files.example/a"), undefined);
  });

  it("isHostAllowed matches apex and suffix forms", () => {
    assert.equal(isHostAllowed("cdn.example.com", ["cdn.example.com"]), true);
    assert.equal(isHostAllowed("a.cdn.example.com", [".example.com"]), true);
    assert.equal(isHostAllowed("evil.test", [".example.com"]), false);
    assert.equal(isHostAllowed("x.example.com", ["*.example.com"]), true);
    assert.equal(isHostAllowed("", ["example.com"]), false);
    assert.equal(isHostAllowed("any", []), true);
  });

  it("allowedHosts gates absolute https", () => {
    assert.equal(
      safeUrl("https://cdn.example.com/a", { allowedHosts: ["cdn.example.com"] }),
      "https://cdn.example.com/a",
    );
    assert.equal(
      safeUrl("https://evil.test/a", { allowedHosts: ["cdn.example.com"] }),
      undefined,
    );
    assert.equal(
      safeUrl("/local", { allowedHosts: ["cdn.example.com"] }),
      "/local",
    );
    assert.equal(
      safeUrl("mailto:x@y.z", { allowedHosts: ["cdn.example.com"] }),
      "mailto:x@y.z",
    );
  });

  it("mergeNoopenerFeatures and relForTarget", () => {
    assert.match(mergeNoopenerFeatures(""), /noopener/);
    assert.match(mergeNoopenerFeatures("resizable"), /noreferrer/);
    assert.equal(relForTarget("_blank"), "noopener noreferrer");
    assert.equal(relForTarget("_self"), "");
  });

  it("safeOpenUrl no-ops without window and rejects hostile", () => {
    const prev = globalThis.window;
    try {
      delete globalThis.window;
      assert.equal(safeOpenUrl("https://example.com"), null);
      globalThis.window = {
        open(url, target, features) {
          return { url, target, features };
        },
      };
      assert.equal(safeOpenUrl("javascript:alert(1)"), null);
      const win = safeOpenUrl("https://example.com/ok", "_blank", "resizable");
      assert.equal(win.url, "https://example.com/ok");
      assert.match(win.features, /noopener/);
    } finally {
      if (prev === undefined) delete globalThis.window;
      else globalThis.window = prev;
    }
  });
});

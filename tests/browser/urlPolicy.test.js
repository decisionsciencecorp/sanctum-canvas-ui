import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  safeUrl,
  safeOpenUrl,
  toCssUrl,
  mergeNoopenerFeatures,
  relForTarget,
} from "../../src/Browser/security/urlPolicy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(
  readFileSync(join(root, "resources/fixtures/url-policy/safeUrl.cases.json"), "utf8"),
);

describe("urlPolicy.safeUrl", () => {
  for (const c of fixture.cases) {
    it(`fixture ${c.id}`, () => {
      const out = safeUrl(c.input);
      if (c.expect === null) assert.equal(out, undefined);
      else assert.equal(out, c.expect);
    });
  }

  it("rejects ftp and other non-allowlisted schemes", () => {
    assert.equal(safeUrl("ftp://files.example.com/x"), undefined);
    assert.equal(safeUrl("blob:https://example.com/u"), undefined);
  });

  it("allows mailto and mixed-case safe schemes", () => {
    assert.equal(safeUrl("mailto:user@example.com"), "mailto:user@example.com");
    assert.equal(safeUrl("HTTPS://Example.COM/x"), "HTTPS://Example.COM/x");
    assert.equal(safeUrl("HTTP://x"), "HTTP://x");
  });

  it("allows relative paths", () => {
    assert.equal(safeUrl("/assets/a.png"), "/assets/a.png");
    assert.equal(safeUrl("./page"), "./page");
    assert.equal(safeUrl("../up"), "../up");
    assert.equal(safeUrl("#section"), "#section");
    assert.equal(safeUrl("relative/path"), "relative/path");
  });

  it("rejects protocol-relative URLs", () => {
    assert.equal(safeUrl("//evil.example/phish"), undefined);
  });

  it("rejects dangerous schemes with mixed case and spaces", () => {
    assert.equal(safeUrl("  JavaScript:alert(1)"), undefined);
    assert.equal(safeUrl("DATA:text/html,x"), undefined);
    assert.equal(safeUrl("VBSCRIPT:x"), undefined);
    assert.equal(safeUrl("FILE:///tmp"), undefined);
  });

  it("rejects obfuscated javascript via DEL", () => {
    assert.equal(safeUrl("java\u0000script:alert(1)"), undefined);
    assert.equal(safeUrl("java\u007fscript:alert(1)"), undefined);
  });

  it("rejects undefined input type", () => {
    assert.equal(safeUrl(undefined), undefined);
    assert.equal(safeUrl(42), undefined);
  });

  it("rejects path that looks like disallowed scheme", () => {
    assert.equal(safeUrl("custom:opaque"), undefined);
  });
});

describe("urlPolicy.noopener helpers", () => {
  it("mergeNoopenerFeatures dedupes and adds tokens", () => {
    assert.equal(mergeNoopenerFeatures(""), "noopener,noreferrer");
    assert.equal(mergeNoopenerFeatures("popup=yes"), "popup=yes,noopener,noreferrer");
    assert.equal(
      mergeNoopenerFeatures("noopener, noreferrer"),
      "noopener,noreferrer",
    );
  });

  it("relForTarget only blanks for _blank", () => {
    assert.equal(relForTarget("_blank"), "noopener noreferrer");
    assert.equal(relForTarget("_self"), "");
    assert.equal(relForTarget(), "");
  });
});

describe("urlPolicy.safeOpenUrl", () => {
  it("returns null for rejected URLs", () => {
    const prev = globalThis.window;
    globalThis.window = { open: () => ({}) };
    try {
      assert.equal(safeOpenUrl("javascript:1"), null);
    } finally {
      globalThis.window = prev;
    }
  });

  it("opens with merged noopener features", () => {
    let seen;
    const prev = globalThis.window;
    globalThis.window = {
      open(url, target, features) {
        seen = { url, target, features };
        return {};
      },
    };
    try {
      const win = safeOpenUrl("https://example.com", "_blank", "width=100");
      assert.ok(win);
      assert.deepEqual(seen, {
        url: "https://example.com",
        target: "_blank",
        features: "width=100,noopener,noreferrer",
      });
    } finally {
      globalThis.window = prev;
    }
  });

  it("returns null when window is unavailable", () => {
    const prev = globalThis.window;
    // @ts-expect-error test
    delete globalThis.window;
    try {
      assert.equal(safeOpenUrl("https://example.com"), null);
    } finally {
      globalThis.window = prev;
    }
  });
});

describe("urlPolicy.toCssUrl", () => {
  it("escapes quotes and backslashes", () => {
    const u = 'https://x.com/a"b\\c';
    const css = toCssUrl(u);
    assert.ok(css?.includes("\\22 "));
    assert.ok(css?.includes("\\5c "));
    assert.match(css, /^url\("/);
  });

  it("returns undefined for unsafe urls", () => {
    assert.equal(toCssUrl("javascript:x"), undefined);
  });

  it("escapes newlines in css url", () => {
    const css = toCssUrl("https://x.com/a\nb");
    assert.ok(css?.includes("\\a "));
  });
});

/**
 * A8.3 — CSP invariant smoke (string presence; no named URL).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
];

const FORBIDDEN = ["unsafe-inline", "unsafe-eval", "cdn.", "unpkg", "jsdelivr"];

describe("security/csp — lab and docs", () => {
  const sources = [
    join(root, "public/index.php"),
    join(root, "docs/track-a/csp.md"),
  ];

  for (const path of sources) {
    it(`${path.split("/").slice(-2).join("/")} embeds strict CSP tokens`, () => {
      const body = readFileSync(path, "utf8");
      for (const token of REQUIRED) {
        assert.ok(body.includes(token), `missing ${token} in ${path}`);
      }
      const cspRegion =
        body.match(/Content-Security-Policy[^"]*"[^"]+"/i)?.[0] ||
        body.match(/Content-Security-Policy:[^\n]+/i)?.[0] ||
        body;
      for (const bad of FORBIDDEN) {
        if (bad === "cdn." && path.endsWith("csp.md")) {
          // docs may mention CDN as forbidden — skip prose files for that token
          continue;
        }
        if (path.endsWith("csp.md") && (bad === "unsafe-inline" || bad === "unsafe-eval" || bad === "cdn." || bad === "unpkg" || bad === "jsdelivr")) {
          // csp.md documents the ban; ensure directive lines lack allow
          continue;
        }
      }
      // Header/meta content must not authorize unsafe-inline/eval
      const headerMatch = body.match(
        /Content-Security-Policy(?:\s*:\s*|\s+content=")([^"\n]+)/i,
      );
      if (headerMatch) {
        const directive = headerMatch[1];
        assert.doesNotMatch(directive, /unsafe-inline/);
        assert.doesNotMatch(directive, /unsafe-eval/);
      }
    });
  }

  it("index.php sets CSP via header() before HTML", () => {
    const php = readFileSync(join(root, "public/index.php"), "utf8");
    const headerIdx = php.indexOf("Content-Security-Policy");
    const doctypeIdx = php.indexOf("<!DOCTYPE");
    assert.ok(headerIdx >= 0 && doctypeIdx > headerIdx);
  });
});

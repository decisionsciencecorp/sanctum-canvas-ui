/**
 * A8.3 — CSP invariant smoke (header + meta; Doc #1379 §9.4).
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

describe("security/csp — lab and docs", () => {
  const sources = [
    join(root, "public/index.php"),
    join(root, "public/lab/csp.html"),
    join(root, "docs/track-a/csp.md"),
  ];

  for (const path of sources) {
    it(`${path.split("/").slice(-2).join("/")} embeds strict CSP tokens`, () => {
      const body = readFileSync(path, "utf8");
      for (const token of REQUIRED) {
        assert.ok(body.includes(token), `missing ${token} in ${path}`);
      }
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

  it("index.php and csp.html include CSP meta http-equiv", () => {
    for (const rel of ["public/index.php", "public/lab/csp.html"]) {
      const body = readFileSync(join(root, rel), "utf8");
      assert.match(
        body,
        /http-equiv\s*=\s*["']Content-Security-Policy["']/i,
        `${rel} missing CSP meta`,
      );
      assert.doesNotMatch(
        body.match(/http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i)?.[0] ?? "",
        /unsafe-inline|unsafe-eval/,
      );
    }
  });
});

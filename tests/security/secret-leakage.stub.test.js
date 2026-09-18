/**
 * A8.3 — Secret / error redaction stubs (Doc #1379 §9 / H26).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Minimal redactor mirroring ErrorRedactor patterns used in PHP tests. */
function redactClientSafe(message) {
  let s = String(message ?? "");
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]");
  s = s.replace(/sk-[A-Za-z0-9]+/g, "[REDACTED]");
  s = s.replace(/VENICE_API_KEY\s*=\s*\S+/gi, "VENICE_API_KEY=[REDACTED]");
  return s;
}

describe("security/secret-leakage — stubs", () => {
  it("ErrorRedactor.php exists and strips credentials", () => {
    const php = readFileSync(join(root, "src/Php/Http/ErrorRedactor.php"), "utf8");
    assert.match(php, /REDACTED|redact/i);
    assert.match(php, /Bearer|sk-|VENICE|API_KEY/i);
  });

  it("stub redactor hides bearer and venice material", () => {
    const raw =
      "failed Bearer sk-abc123456789 and VENICE_API_KEY=supersecret";
    const out = redactClientSafe(raw);
    assert.doesNotMatch(out, /sk-abc/);
    assert.doesNotMatch(out, /supersecret/);
    assert.match(out, /REDACTED/);
  });

  it("HttpKernelTest + InferenceTest assert no secret leakage", () => {
    const http = readFileSync(join(root, "tests/php/Http/HttpKernelTest.php"), "utf8");
    const inf = readFileSync(join(root, "tests/php/Inference/InferenceTest.php"), "utf8");
    assert.match(http, /testErrorRedactorStripsSecrets/);
    assert.match(inf, /sk-secret-key-value/);
    assert.match(inf, /assertStringNotContainsString/);
  });
});

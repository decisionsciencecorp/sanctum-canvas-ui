/**
 * A8.3 — CSRF / IDOR stubs (Doc #1379 §9.5 / §9.9).
 * Unit-level contract proofs; named-host e2e still open on #4171.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** JS twin of Sanctum\Canvas\Php\Http\Csrf (HMAC double-submit). */
function mintCsrf(sessionKey, secret = "canvas-csrf-dev") {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", secret)
    .update(`${sessionKey}|${nonce}`)
    .digest("hex");
  return `${nonce}.${sig}`;
}

function validateCsrf(sessionKey, token, secret = "canvas-csrf-dev") {
  if (!token || !token.includes(".")) return false;
  const [nonce, sig] = token.split(".", 2);
  if (!nonce || !sig || !/^[0-9a-f]+$/i.test(nonce)) return false;
  const expected = createHmac("sha256", secret)
    .update(`${sessionKey}|${nonce}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

describe("security/csrf-idor — stubs", () => {
  it("Csrf PHP exports HEADER/COOKIE and requireValid", () => {
    const php = readFileSync(join(root, "public/includes/Php/Http/Csrf.php"), "utf8");
    assert.match(php, /X-CSRF-Token/);
    assert.match(php, /canvas_csrf/);
    assert.match(php, /csrf_failed/);
    assert.match(php, /requireValid/);
  });

  it("mint/validate round-trip; wrong scope fails", () => {
    const token = mintCsrf("owner:project", "sec");
    assert.equal(validateCsrf("owner:project", token, "sec"), true);
    assert.equal(validateCsrf("other:scope", token, "sec"), false);
    assert.equal(validateCsrf("owner:project", "bad", "sec"), false);
  });

  it("ProgramController scopes persistence (IDOR surface documented)", () => {
    const php = readFileSync(join(root, "public/includes/Php/Storage/ProgramController.php"), "utf8");
    assert.match(php, /csrf->requireValid/);
    assert.match(php, /AuthContext|\$auth/);
    // Owner/project must come from auth — spoofed body owner is not trusted
    assert.doesNotMatch(php, /\$body\[['"]ownerId['"]\]/);
  });

  it("PersistenceTest covers spoofed owner (PHP twin)", () => {
    const test = readFileSync(
      join(root, "tests/php/Storage/PersistenceTest.php"),
      "utf8",
    );
    assert.match(test, /testControllerEnforcesCsrfAndIgnoresSpoofedOwner/);
  });
});

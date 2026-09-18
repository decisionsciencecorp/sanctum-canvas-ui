/**
 * A8.3 — Rate-limit stubs (Doc #1379 §9.5).
 *
 * Mirrors Sanctum\Canvas\Php\Http\RateLimiter fixed-window semantics in-process.
 * Full CSRF/IDOR/rate e2e on a named host remains open on Tasks #4171.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * In-memory fixed-window limiter (parity with PHP RateLimiter when persistDir=null).
 */
export function createMemoryRateLimiter(maxRequests = 60, windowSeconds = 60, nowFn = () => Date.now()) {
  /** @type {Map<string, { count: number, reset: number }>} */
  const memory = new Map();
  return {
    hit(key) {
      const now = Math.floor(nowFn() / 1000);
      let state = memory.get(key);
      if (!state || state.reset <= now) {
        state = { count: 0, reset: now + windowSeconds };
      }
      state.count += 1;
      memory.set(key, state);
      if (state.count > maxRequests) {
        const err = new Error("Rate limit exceeded");
        err.code = "rate_limited";
        err.status = 429;
        throw err;
      }
    },
    peek(key) {
      return memory.get(key) ?? null;
    },
  };
}

describe("security/rate-limits — stub mirrors PHP contract", () => {
  it("PHP RateLimiter source declares fixed-window + 429", () => {
    const php = readFileSync(join(root, "public/includes/Php/Http/RateLimiter.php"), "utf8");
    assert.match(php, /rate_limited/);
    assert.match(php, /429/);
    assert.match(php, /maxRequests/);
    assert.match(php, /windowSeconds/);
  });

  it("memory limiter allows max then trips", () => {
    const rl = createMemoryRateLimiter(2, 60, () => 1_000_000);
    rl.hit("tools:o:p");
    rl.hit("tools:o:p");
    assert.throws(() => rl.hit("tools:o:p"), (e) => e.code === "rate_limited" && e.status === 429);
  });

  it("window reset clears budget", () => {
    let t = 1_000_000;
    const rl = createMemoryRateLimiter(1, 10, () => t);
    rl.hit("k");
    assert.throws(() => rl.hit("k"), (e) => e.code === "rate_limited");
    t += 11_000; // past window
    rl.hit("k"); // ok again
    assert.equal(rl.peek("k")?.count, 1);
  });

  it("ToolDispatcher / ProgramController wire RateLimiter", () => {
    const tools = readFileSync(join(root, "public/includes/Php/Tools/ToolDispatcher.php"), "utf8");
    const programs = readFileSync(join(root, "public/includes/Php/Storage/ProgramController.php"), "utf8");
    assert.match(tools, /RateLimiter/);
    assert.match(programs, /RateLimiter/);
  });
});

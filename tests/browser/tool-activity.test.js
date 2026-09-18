/**
 * A6.11 — Tool activity + run status stream transitions (miniDom).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  registerTools,
  TOOL_COMPONENTS,
  ToolActivity,
  RunStatus,
  partialJSONParse,
  balanceOpenJSON,
  isPartialJsonString,
  redactValue,
  redactForDisplay,
  isSensitiveKey,
  normalizeToolActivity,
  normalizeRunStatus,
} from "../../src/Browser/components/tools/index.js";
import { defaultToolLabel, prefersReducedMotion } from "../../src/Browser/components/tools/shared.js";
import { resolveRequestDisplay } from "../../src/Browser/components/tools/ToolActivity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const streamFixture = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/components/tool-activity.stream.json"), "utf8"),
);

function ctx(extra = {}) {
  const { document } = createTestDom();
  return { document, ...extra };
}

function find(root, attr, value) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (value == null ? n.hasAttribute(attr) : n.getAttribute(attr) === value) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(root);
  return out;
}

describe("A6.11 partial JSON", () => {
  it("parses complete and balanced partial objects", () => {
    assert.deepEqual(partialJSONParse('{"q":"hi"}'), { q: "hi" });
    const partial = partialJSONParse('{"q":"hel');
    assert.equal(typeof partial, "object");
    assert.equal(/** @type {any} */ (partial).q, "hel");
    assert.deepEqual(partialJSONParse("{not-json::::"), {});
    assert.equal(isPartialJsonString('{"a":1}'), false);
    assert.equal(isPartialJsonString('{"a":'), true);
    assert.match(balanceOpenJSON('{"a":"x'), /\}$/);
  });
});

describe("A6.11 redaction", () => {
  it("redacts sensitive keys and opaque tokens", () => {
    assert.equal(isSensitiveKey("password"), true);
    assert.equal(isSensitiveKey("api_key"), true);
    assert.equal(isSensitiveKey("q"), false);
    const red = /** @type {any} */ (
      redactValue({ username: "ada", password: "hunter2", nested: { token: "abc" } })
    );
    assert.equal(red.password, "[REDACTED]");
    assert.equal(red.nested.token, "[REDACTED]");
    assert.equal(red.username, "ada");
    assert.match(redactForDisplay({ apiKey: "x" }), /REDACTED/);
  });
});

describe("A6.11 registerTools", () => {
  it("registers ToolActivity, RunStatus, aliases", () => {
    const registry = createComponentRegistry();
    registerTools(registry);
    for (const name of Object.keys(TOOL_COMPONENTS)) {
      assert.equal(registry.has(name), true, name);
    }
  });
});

describe("A6.11 stream fixture transitions", () => {
  for (const step of streamFixture.transitions) {
    it(`${step.id} (${step.event})`, () => {
      const c = ctx({
        reducedMotion: step.props.reducedMotion === true,
      });
      if (step.component === "RunStatus") {
        const el = RunStatus.create(step.props, c);
        assert.equal(el.getAttribute("data-phase"), step.expect.phase);
        if (step.expect.ariaLive) {
          const live = find(el, "aria-live", "polite");
          assert.equal(live.length >= 1, true);
        }
        return;
      }

      const el = ToolActivity.create(step.props, c);
      if (step.expect.status) {
        assert.equal(el.getAttribute("data-status"), step.expect.status);
      }
      if (step.expect.partial != null) {
        assert.equal(el.getAttribute("data-partial"), step.expect.partial ? "1" : "0");
      }
      if (step.expect.ariaLive) {
        assert.equal(find(el, "aria-live", "polite").length >= 1, true);
      }
      if (step.expect.hasResult) {
        assert.equal(find(el, "data-role", "result").length >= 1, true);
      }
      if (step.expect.hasError) {
        assert.equal(find(el, "data-role", "error").length >= 1, true);
      }
      if (step.expect.redacts) {
        const result = find(el, "data-role", "result")[0];
        assert.ok(result);
        assert.match(result.textContent || "", /REDACTED/);
        assert.equal(/sk-secret/.test(result.textContent || ""), false);
      }
      if (step.expect.redactsKeys) {
        const req = find(el, "data-role", "args")[0];
        assert.ok(req);
        for (const key of step.expect.redactsKeys) {
          assert.match(req.textContent || "", /REDACTED/);
          // Ensure raw secret values are not present
          if (key === "password") assert.equal(/hunter2/.test(req.textContent || ""), false);
        }
      }
      if (step.expect.renders) {
        assert.equal(el.getAttribute("data-canvas-component"), "ToolActivity");
      }
      if (step.expect.reducedMotion) {
        assert.match(el.getAttribute("class") || "", /reduced-motion/);
      }
    });
  }
});

describe("A6.11 normalize + labels", () => {
  it("maps activity shapes and resolves request display", () => {
    const a = normalizeToolActivity({
      activity: {
        status: "streaming",
        toolName: "search",
        toolCall: { id: "1", function: { name: "search", arguments: '{"q":"x"' } },
      },
    });
    assert.equal(a.status, "streaming");
    assert.equal(a.isPartial, true);
    assert.match(resolveRequestDisplay(a), /q/);

    const run = normalizeRunStatus({ event: "RUN_FINISHED", runId: "r1" });
    assert.equal(run.phase, "finish");
    assert.equal(defaultToolLabel("error", "search"), "search failed");
    assert.equal(defaultToolLabel("streaming", ""), "Calling the tool");
    assert.equal(prefersReducedMotion({ reducedMotion: true }), true);
  });

  it("updates through streaming → executing → complete → error", () => {
    const c = ctx();
    const el = ToolActivity.create(
      { status: "streaming", toolName: "x", rawArgs: '{"a":' },
      c,
    );
    assert.equal(el.getAttribute("data-status"), "streaming");
    ToolActivity.update(el, { status: "executing", toolName: "x", input: { a: 1 } }, c);
    assert.equal(el.getAttribute("data-status"), "executing");
    ToolActivity.update(
      el,
      { status: "complete", toolName: "x", input: { a: 1 }, result: '{"ok":true}' },
      c,
    );
    assert.equal(el.getAttribute("data-status"), "complete");
    ToolActivity.update(
      el,
      { status: "error", toolName: "x", errorText: "nope", isError: true },
      c,
    );
    assert.equal(el.getAttribute("data-status"), "error");
    assert.equal(find(el, "role", "alert").length >= 1, true);
  });

  it("ToolResult alias forces result status", () => {
    const c = ctx();
    const entry = TOOL_COMPONENTS.ToolResult;
    const el = entry.create({ toolName: "x", result: '{"a":1}' }, c);
    assert.equal(el.getAttribute("data-status"), "result");
  });
});

/**
 * A8.3 — Tool-abuse / partial-gate / incomplete-program regressions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createActionRunner } from "../../src/Browser/runtime/actionRunner.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";
import { guardedToolInvoke } from "../../src/Browser/renderer/safeRender.js";
import {
  createInitialState,
  reduceEvent,
  EventType,
} from "../../src/Browser/transport/eventReducer.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const boundary = JSON.parse(
  readFileSync(
    join(root, "tests/fixtures/handoff/tool-dispatch-boundary.json"),
    "utf8",
  ),
);
const toolLife = JSON.parse(
  readFileSync(
    join(root, "tests/fixtures/handoff/ag-ui-tool-lifecycle.json"),
    "utf8",
  ),
);

function memoryStore() {
  const data = new Map();
  return {
    get: (k) => data.get(k),
    set: (k, v) => data.set(k, v),
    reset: () => data.clear(),
  };
}

describe("security/tool-abuse — incomplete program gate", () => {
  it("OpenUrl blocked while incomplete", async () => {
    let opened = null;
    const runner = createActionRunner({
      store: memoryStore(),
      host: { openUrl: (u) => { opened = u; } },
      isProgramComplete: () => false,
    });
    const result = await runner.run(
      { steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://example.com" }] },
      { userGesture: true },
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "incomplete-program");
    assert.equal(opened, null);
  });

  it("guardedToolInvoke blocks partial ctx", () => {
    let invoked = false;
    const r = guardedToolInvoke({ partial: true }, () => {
      invoked = true;
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "partial-gate");
    assert.equal(invoked, false);
  });
});

describe("security/tool-abuse — TOOL_CALL_ARGS never imply execution", () => {
  it("reducer reaches executing only after TOOL_CALL_END without running handlers", () => {
    let state = createInitialState();
    for (const ev of toolLife.events) {
      if (ev.type === EventType.TOOL_CALL_RESULT || ev.type === "TOOL_CALL_RESULT") {
        // Stop before result — after END status should be executing
        break;
      }
      state = reduceEvent(state, ev);
      if (ev.type === EventType.TOOL_CALL_ARGS || ev.type === "TOOL_CALL_ARGS") {
        const tool = state.tools.find((t) => t.id === ev.toolCallId || t.toolCallId === ev.toolCallId);
        // Args streaming must not flip to complete
        assert.notEqual(tool?.status, "complete");
      }
    }
    const afterEnd = toolLife.events.find((e) => e.type === "TOOL_CALL_END");
    assert.ok(afterEnd);
    // Replay through END
    state = createInitialState();
    for (const ev of toolLife.events) {
      state = reduceEvent(state, ev);
      if (ev.type === "TOOL_CALL_END") {
        const tool = state.tools[0];
        assert.ok(tool);
        assert.equal(tool.status, "executing");
        break;
      }
    }
  });
});

describe("security/tool-abuse — hostile name corpus documented", () => {
  it("handoff rejectNames list is non-empty and includes classics", () => {
    assert.ok(Array.isArray(boundary.rejectNames));
    assert.ok(boundary.rejectNames.length >= 5);
    assert.ok(boundary.rejectNames.includes("system"));
    assert.ok(boundary.rejectNames.includes("eval"));
    // PHP coverage: tests/php/Security/ToolSecurityTest.php
  });
});

/**
 * A8.3 — Handoff fixture structural smoke (Track B contract drafts).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createInitialState,
  reduceEvent,
  summarizeState,
} from "../../src/Browser/transport/eventReducer.js";
import {
  dispatchContinueConversation,
  MAX_CONTINUE_CHARS,
} from "../../src/Browser/components/chat/continueConversation.js";

const handoffDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/handoff",
);

describe("security/handoff — fixture corpus present", () => {
  const files = readdirSync(handoffDir).filter((f) => f.endsWith(".json"));
  it("has core handoff JSON files", () => {
    for (const name of [
      "version-negotiation.json",
      "canvas-initiation.json",
      "ag-ui-text-run.json",
      "continue-conversation.json",
      "open-url-callback.json",
      "tool-dispatch-boundary.json",
      "cancel-and-errors.json",
      "mount-lease-expectations.json",
    ]) {
      assert.ok(files.includes(name), `missing ${name}`);
    }
  });

  it("version-negotiation requires canvas-host-v1", () => {
    const v = JSON.parse(
      readFileSync(join(handoffDir, "version-negotiation.json"), "utf8"),
    );
    assert.equal(v.contract, "canvas-host-v1");
    assert.equal(v.adapterAccept.contract, "canvas-host-v1");
  });

  it("ag-ui-text-run reduces to finished", () => {
    const fix = JSON.parse(
      readFileSync(join(handoffDir, "ag-ui-text-run.json"), "utf8"),
    );
    let state = createInitialState();
    for (const ev of fix.events) state = reduceEvent(state, ev);
    const snap = summarizeState(state);
    assert.equal(snap.runStatus, "finished");
    assert.equal(snap.messages, 1);
  });

  it("continue-conversation fixture cases match helper", () => {
    const fix = JSON.parse(
      readFileSync(join(handoffDir, "continue-conversation.json"), "utf8"),
    );
    assert.equal(MAX_CONTINUE_CHARS, fix.cases.find((c) => c.maxChars)?.maxChars ?? 4000);
    for (const c of fix.cases) {
      if (!c.expect) continue;
      const calls = [];
      const ctx = {
        stream: { isStreaming: !!c.opts?.streaming },
        continueConversation: (m, cx) => calls.push([m, cx]),
      };
      const r = dispatchContinueConversation(ctx, c.props, {
        userGesture: c.opts?.userGesture,
      });
      assert.equal(r.ok, c.expect.ok, c.id);
      if (c.expect.reason) assert.equal(r.reason, c.expect.reason, c.id);
      if (c.expect.ok) assert.equal(calls.length, 1, c.id);
    }
  });

  it("mount-lease forbids lab chrome imports", () => {
    const m = JSON.parse(
      readFileSync(join(handoffDir, "mount-lease-expectations.json"), "utf8"),
    );
    assert.equal(m.root_id, "sanctum-canvas-root");
    assert.equal(m.compatibleContract, "canvas-host-v1");
    assert.ok(m.mustNotImport.some((p) => p.includes("lab")));
  });
});

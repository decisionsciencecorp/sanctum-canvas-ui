/**
 * A4.3 — last-good-subtree recovery + partial-node gates.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  assertInteractive,
  isPartial,
  markPartial,
  createPartialSkeleton,
  PARTIAL_ATTR,
} from "../../src/Browser/renderer/partialGate.js";
import {
  clearAllLastGood,
  captureLastGood,
  hasLastGood,
} from "../../src/Browser/renderer/lastGoodSubtree.js";
import {
  safeRender,
  guardedToolInvoke,
} from "../../src/Browser/renderer/safeRender.js";
import { createTestDom } from "./helpers/miniDom.js";

const brokenTailFixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/hostile/broken-tail.json"),
    "utf8",
  ),
);

function makeRegistry() {
  return createComponentRegistry({
    Box: (_props, ctx) => ctx.document.createElement("div"),
    Text: (_props, ctx) => ctx.document.createElement("span"),
    EvilBrokenTail: () => {
      throw new Error("EvilBrokenTail must never mount");
    },
  });
}

beforeEach(() => {
  clearAllLastGood();
});

describe("partialGate", () => {
  it("marks DOM partial and assertInteractive blocks", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    assert.equal(assertInteractive(el), true);
    markPartial(el, true);
    assert.equal(el.getAttribute(PARTIAL_ATTR), "1");
    assert.equal(el.getAttribute("aria-busy"), "true");
    assert.equal(isPartial(el), true);
    assert.equal(assertInteractive(el), false);
    assert.throws(() => assertInteractive(el, { throw: true }), /partial-gate/);
  });

  it("partial vnode ctx blocks fake tool invoke", () => {
    let invoked = false;
    const result = guardedToolInvoke({ partial: true }, () => {
      invoked = true;
      return "ran";
    });
    assert.deepEqual(result, { ok: false, reason: "partial-gate" });
    assert.equal(invoked, false);

    const ok = guardedToolInvoke({ partial: false }, () => {
      invoked = true;
      return "ran";
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.result, "ran");
    assert.equal(invoked, true);
  });

  it("createPartialSkeleton sets data-openui-partial and aria-busy", () => {
    const { document } = createTestDom();
    const el = createPartialSkeleton(document, { typeName: "Button" });
    assert.equal(el.getAttribute(PARTIAL_ATTR), "1");
    assert.equal(el.getAttribute("aria-busy"), "true");
    assert.equal(el.getAttribute("data-openui-partial-of"), "Button");
  });
});

describe("safeRender last-good", () => {
  it("broken-tail fixture keeps prior UI and blocks tool side effects", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const errors = [];
    let toolInvokes = 0;
    const ctx = {
      document,
      registry,
      rootKey: "hostile-broken-tail",
      development: true,
      onRenderError(err) {
        errors.push(err);
      },
    };

    const first = safeRender(root, brokenTailFixture.good, ctx);
    assert.equal(first.ok, true);
    assert.equal(root.textContent, brokenTailFixture.assert.preserveText);
    assert.equal(hasLastGood(first.rootKey), true);

    const second = safeRender(root, brokenTailFixture.brokenTail, ctx);
    assert.equal(second.ok, false);
    assert.equal(second.restored, brokenTailFixture.assert.restored);
    assert.equal(second.sideEffectsAllowed, false);
    assert.equal(root.textContent, brokenTailFixture.assert.preserveText);
    assert.ok(errors.length >= 1);
    assert.match(errors[0].message, /broken-tail|EvilBrokenTail|malformed/i);

    if (brokenTailFixture.assert.noToolInvoke) {
      const gate = guardedToolInvoke(
        { partial: true },
        () => {
          toolInvokes += 1;
        },
      );
      assert.equal(gate.ok, false);
      assert.equal(toolInvokes, 0);
    }

    // Even a complete ctx must not treat the failed pass as authorizing tools.
    assert.equal(second.sideEffectsAllowed, false);
  });

  it("partial node renders non-interactive skeleton", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const result = safeRender(
      root,
      {
        type: "Box",
        children: [
          {
            type: "Button",
            partial: true,
            props: { onClick: "tool.invoke('x')" },
            children: ["Click"],
          },
        ],
      },
      { document, registry, rootKey: "partial-skel" },
    );
    assert.equal(result.ok, true);
    const skel = root.childNodes[0].childNodes[0];
    assert.equal(skel.getAttribute(PARTIAL_ATTR), "1");
    assert.equal(skel.getAttribute("aria-busy"), "true");
    assert.equal(assertInteractive(skel), false);
  });

  it("error in child does not wipe sibling last-good", () => {
    const { document } = createTestDom();
    const registry = makeRegistry();
    const rootA = document.createElement("div");
    const rootB = document.createElement("div");

    const ctxA = { document, registry, rootKey: "sibling-a" };
    const ctxB = { document, registry, rootKey: "sibling-b" };

    assert.equal(safeRender(rootA, { type: "Box", children: ["AAA"] }, ctxA).ok, true);
    assert.equal(safeRender(rootB, { type: "Box", children: ["BBB"] }, ctxB).ok, true);
    assert.equal(rootA.textContent, "AAA");
    assert.equal(rootB.textContent, "BBB");

    const failA = safeRender(
      rootA,
      {
        type: "Box",
        children: [{ type: "EvilBrokenTail", brokenTail: true, props: { __throw: true } }],
      },
      ctxA,
    );
    assert.equal(failA.ok, false);
    assert.equal(failA.restored, true);
    assert.equal(rootA.textContent, "AAA");

    // Sibling B snapshot + live DOM untouched.
    assert.equal(hasLastGood("sibling-b"), true);
    assert.equal(rootB.textContent, "BBB");
    captureLastGood("sibling-b", rootB);
    assert.equal(rootB.textContent, "BBB");
  });

  it("production errors omit diagnostic detail", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    safeRender(root, { type: "Box", children: ["ok"] }, {
      document,
      registry,
      rootKey: "prod",
    });
    const fail = safeRender(
      root,
      { type: "Box", children: [{ type: "X", brokenTail: true }] },
      { document, registry, rootKey: "prod", development: false },
    );
    assert.equal(fail.ok, false);
    assert.deepEqual(fail.error, { message: "render-failed" });
  });
});

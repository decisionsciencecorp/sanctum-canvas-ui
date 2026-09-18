/**
 * A4 coverage push — context.js + lastGoodSubtree.js ≥90% line.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRenderContext,
  createStubFocusManager,
} from "../../src/Browser/renderer/context.js";
import {
  getRootKey,
  captureLastGood,
  restoreLastGood,
  clearLastGood,
  clearAllLastGood,
  hasLastGood,
} from "../../src/Browser/renderer/lastGoodSubtree.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createTestDom } from "./helpers/miniDom.js";

describe("A4 coverage gaps — context", () => {
  it("stub focus remember/restore/getFocused", () => {
    const { document } = createTestDom();
    const focus = createStubFocusManager();
    assert.equal(focus.getFocused(), null);
    const el = document.createElement("button");
    let focused = false;
    el.focus = () => {
      focused = true;
    };
    focus.remember(el);
    assert.equal(focus.getFocused(), el);
    focus.restore();
    assert.equal(focused, true);
    focus.remember(null);
    assert.equal(focus.getFocused(), null);
    focus.restore(); // no-op
  });

  it("default reportError and renderChildren via context", () => {
    const { document } = createTestDom();
    const errors = [];
    const orig = console.error;
    console.error = (...args) => errors.push(args);
    try {
      const reg = createComponentRegistry({
        Box: (_p, ctx) => {
          const el = ctx.document.createElement("div");
          el.setAttribute("data-box", "1");
          return el;
        },
      });
      const ctx = createRenderContext({
        document,
        registry: reg,
        customFlag: true,
      });
      assert.equal(ctx.customFlag, true);
      assert.equal(typeof ctx.renderChildren, "function");
      assert.equal(typeof ctx.reportError, "function");
      ctx.reportError(new Error("probe"));
      assert.ok(errors.length >= 1);

      const parent = document.createElement("div");
      ctx.renderChildren(parent, [
        { type: "Box", props: {}, key: "a" },
        null,
      ]);
      assert.ok(parent.childNodes.length >= 1);
      ctx.renderChildren(parent, undefined);
    } finally {
      console.error = orig;
    }
  });

  it("custom reportError wins over default", () => {
    const { document } = createTestDom();
    const seen = [];
    const ctx = createRenderContext({
      document,
      reportError: (e) => seen.push(e),
    });
    ctx.reportError("x");
    assert.deepEqual(seen, ["x"]);
  });
});

describe("A4 coverage gaps — lastGoodSubtree", () => {
  it("getRootKey prefers ctx, then data-openui-root, then nodeId, else default", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    assert.equal(getRootKey(el, { rootKey: "explicit" }), "explicit");
    el.setAttribute("data-openui-root", "from-attr");
    assert.equal(getRootKey(el, {}), "from-attr");
    const el2 = document.createElement("div");
    el2.nodeId = 42;
    assert.equal(getRootKey(el2, {}), "node:42");
    // miniDom always assigns nodeId — fall through is node:<id>, not "default"
    const el3 = document.createElement("div");
    assert.match(getRootKey(el3, {}), /^node:/);
    // bare object without attr/nodeId → default
    assert.equal(getRootKey({}, {}), "default");
  });

  it("capture/restore with Map attrs and getAttributeNames paths", () => {
    clearAllLastGood();
    const { document } = createTestDom();
    const root = document.createElement("div");
    const child = document.createElement("span");
    // Force Map-backed attrs if miniDom uses them; also setAttribute path.
    child.setAttribute("data-x", "1");
    child.appendChild(document.createTextNode("hi"));
    root.appendChild(child);

    captureLastGood("k1", root);
    assert.equal(hasLastGood("k1"), true);

    // Mutate live tree
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(document.createTextNode("gone"));

    assert.equal(restoreLastGood("k1", root, { document }), true);
    assert.equal(root.childNodes.length, 1);
    assert.equal(root.firstChild.tagName?.toLowerCase(), "span");
    assert.match(root.textContent ?? "", /hi/);

    clearLastGood("k1");
    assert.equal(hasLastGood("k1"), false);
    assert.equal(restoreLastGood("k1", root, { document }), false);

    assert.throws(() => captureLastGood("", root));
    assert.throws(() => captureLastGood("k", null));
  });

  it("restore throws without document", () => {
    clearAllLastGood();
    const { document } = createTestDom();
    const root = document.createElement("div");
    root.appendChild(document.createTextNode("a"));
    captureLastGood("nodoc", root);
    const bare = {
      childNodes: [],
      firstChild: null,
      removeChild() {},
      appendChild() {},
      ownerDocument: null,
    };
    // Ensure no global document fallback issues — pass empty ctx with broken doc
    assert.throws(() =>
      restoreLastGood("nodoc", bare, { document: { createElement: null } }),
    );
    clearAllLastGood();
  });
});

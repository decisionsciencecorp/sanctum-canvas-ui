/**
 * A4.2 — Stream-safe keyed reconciliation + interactive state preserve.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import {
  render,
  childKey,
  captureInteractiveState,
  restoreInteractiveState,
} from "../../src/Browser/renderer/reconciler.js";
import { createTestDom } from "./helpers/miniDom.js";

function streamRegistry() {
  return createComponentRegistry({
    Box: (_props, ctx) => ctx.document.createElement("div"),
    Text: (_props, ctx) => ctx.document.createElement("span"),
    Input: {
      create(props, ctx) {
        const el = ctx.document.createElement("input");
        if (props?.value != null) el.value = String(props.value);
        if (props?.name != null) el.setAttribute("name", String(props.name));
        return el;
      },
      update(el, props) {
        if (props?.name != null) el.setAttribute("name", String(props.name));
        // do not overwrite live value from props during stream updates
      },
      destroy() {},
    },
    Scroll: {
      create(_p, ctx) {
        const el = ctx.document.createElement("div");
        el.scrollTop = 0;
        return el;
      },
      update() {},
      destroy() {},
    },
    Details: {
      create(_p, ctx) {
        const el = ctx.document.createElement("details");
        el.open = false;
        return el;
      },
      update() {},
      destroy() {},
    },
  });
}

describe("childKey prefers statement id + type", () => {
  it("uses type::id when key absent", () => {
    assert.equal(childKey({ type: "Box", id: "s1" }, 0), "Box::s1");
    assert.equal(childKey({ type: "Box", id: "s1", key: "explicit" }, 0), "explicit");
    assert.equal(childKey({ type: "Box" }, 3), 3);
  });
});

describe("stream progressive reconcile", () => {
  it("appends children by statement id without remounting earlier siblings", () => {
    const { document, root } = createTestDom();
    const registry = streamRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Box",
        id: "root",
        children: [
          { type: "Input", id: "field-a", props: { name: "a", value: "" } },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const input = box.childNodes[0];
    input.value = "typed-mid-stream";
    input.focus();
    assert.equal(document.activeElement, input);

    // Progressive stream: same root + field-a, append Text statement
    render(
      root,
      {
        type: "Box",
        id: "root",
        children: [
          { type: "Input", id: "field-a", props: { name: "a", value: "from-llm" } },
          { type: "Text", id: "label-b", children: ["hello"] },
        ],
      },
      ctx,
    );

    assert.equal(box.childNodes.length, 2);
    assert.equal(box.childNodes[0], input); // identity preserved
    assert.equal(input.value, "typed-mid-stream"); // live value preserved
    assert.equal(document.activeElement, input); // focus survives
    assert.equal(box.childNodes[1].textContent, "hello");
  });

  it("never wipes root via innerHTML (child identity survives reorder append)", () => {
    const { document, root } = createTestDom();
    const registry = streamRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Box",
        id: "r",
        children: [
          { type: "Text", id: "a", props: { "data-k": "a" }, children: ["A"] },
          { type: "Text", id: "b", props: { "data-k": "b" }, children: ["B"] },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const a = box.childNodes[0];
    const b = box.childNodes[1];

    // Assigning innerHTML on miniDom throws — ensure render path never does.
    assert.throws(() => {
      box.innerHTML = "";
    }, /innerHTML assignment forbidden/);

    render(
      root,
      {
        type: "Box",
        id: "r",
        children: [
          { type: "Text", id: "b", props: { "data-k": "b" }, children: ["B"] },
          { type: "Text", id: "a", props: { "data-k": "a" }, children: ["A"] },
          { type: "Text", id: "c", props: { "data-k": "c" }, children: ["C"] },
        ],
      },
      ctx,
    );

    assert.equal(box.childNodes[0], b);
    assert.equal(box.childNodes[1], a);
    assert.equal(box.childNodes.length, 3);
  });

  it("preserves scrollTop and details open across in-place update", () => {
    const { document, root } = createTestDom();
    const registry = streamRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Box",
        id: "wrap",
        children: [
          { type: "Scroll", id: "sc" },
          { type: "Details", id: "dt" },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const scroll = box.childNodes[0];
    const details = box.childNodes[1];
    scroll.scrollTop = 42;
    details.open = true;

    render(
      root,
      {
        type: "Box",
        id: "wrap",
        props: { "data-rev": "2" },
        children: [
          { type: "Scroll", id: "sc" },
          { type: "Details", id: "dt" },
        ],
      },
      ctx,
    );

    assert.equal(box.childNodes[0], scroll);
    assert.equal(box.childNodes[1], details);
    assert.equal(scroll.scrollTop, 42);
    assert.equal(details.open, true);
  });

  it("captureInteractiveState / restoreInteractiveState round-trip", () => {
    const { document } = createTestDom();
    const input = document.createElement("input");
    input.value = "x";
    input.selectionStart = 1;
    input.selectionEnd = 1;
    input.focus();
    const snap = captureInteractiveState(input);
    input.value = "";
    input.blur();
    restoreInteractiveState(snap);
    assert.equal(input.value, "x");
    assert.equal(document.activeElement, input);
  });
});

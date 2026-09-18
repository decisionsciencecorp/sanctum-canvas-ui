import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { render, unmount } from "../../src/Browser/renderer/reconciler.js";
import { createTestDom } from "./helpers/miniDom.js";

const hostileUnknown = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/hostile/unknown-component.json"),
    "utf8",
  ),
);

function makeRegistry() {
  return createComponentRegistry({
    Box: (_props, ctx) => ctx.document.createElement("div"),
    Text: (_props, ctx) => ctx.document.createElement("span"),
  });
}

describe("reconciler", () => {
  it("renders a vnode tree with text children", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    render(
      root,
      {
        type: "Box",
        props: { "data-id": "root" },
        children: ["hello", { type: "Text", children: ["world"] }],
      },
      { document, registry },
    );
    assert.equal(root.childNodes.length, 1);
    const box = root.childNodes[0];
    assert.equal(box.getAttribute("data-id"), "root");
    assert.equal(box.childNodes[0].textContent, "hello");
    assert.equal(box.childNodes[1].textContent, "world");
  });

  it("keyed reorder preserves element identity", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const ctx = { document, registry };

    render(
      root,
      {
        type: "Box",
        children: [
          { type: "Text", key: "a", props: { "data-k": "a" }, children: ["A"] },
          { type: "Text", key: "b", props: { "data-k": "b" }, children: ["B"] },
          { type: "Text", key: "c", props: { "data-k": "c" }, children: ["C"] },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const before = [...box.childNodes];
    assert.deepEqual(
      before.map((n) => n.getAttribute("data-k")),
      ["a", "b", "c"],
    );

    render(
      root,
      {
        type: "Box",
        children: [
          { type: "Text", key: "c", props: { "data-k": "c" }, children: ["C"] },
          { type: "Text", key: "a", props: { "data-k": "a" }, children: ["A"] },
          { type: "Text", key: "b", props: { "data-k": "b" }, children: ["B"] },
        ],
      },
      ctx,
    );
    const after = box.childNodes;
    assert.equal(after[0], before[2]);
    assert.equal(after[1], before[0]);
    assert.equal(after[2], before[1]);
    assert.deepEqual(
      [...after].map((n) => n.getAttribute("data-k")),
      ["c", "a", "b"],
    );
  });

  it("removes gone nodes and calls onDispose", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const disposed = [];
    const ctx = {
      document,
      registry,
      onDispose(el) {
        disposed.push(el);
      },
    };

    render(
      root,
      {
        type: "Box",
        children: [
          { type: "Text", key: "keep", children: ["1"] },
          { type: "Text", key: "gone", children: ["2"] },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const goneEl = box.childNodes[1];

    render(
      root,
      {
        type: "Box",
        children: [{ type: "Text", key: "keep", children: ["1-updated"] }],
      },
      ctx,
    );

    assert.equal(box.childNodes.length, 1);
    assert.equal(box.childNodes[0].textContent, "1-updated");
    assert.ok(disposed.includes(goneEl));
  });

  it("index-matches when keys are absent", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const ctx = { document, registry };

    render(
      root,
      {
        type: "Box",
        children: [
          { type: "Text", props: { "data-i": "0" }, children: ["one"] },
          { type: "Text", props: { "data-i": "1" }, children: ["two"] },
        ],
      },
      ctx,
    );
    const box = root.childNodes[0];
    const first = box.childNodes[0];

    render(
      root,
      {
        type: "Box",
        children: [
          { type: "Text", props: { "data-i": "0" }, children: ["ONE"] },
          { type: "Text", props: { "data-i": "1" }, children: ["TWO"] },
        ],
      },
      ctx,
    );
    assert.equal(box.childNodes[0], first);
    assert.equal(first.textContent, "ONE");
  });

  it("hostile unknown component fixture → data-openui-unknown", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    render(root, hostileUnknown.input, { document, registry });
    const el = root.childNodes[0];
    assert.equal(
      el.getAttribute(hostileUnknown.assert.attribute),
      hostileUnknown.assert.value,
    );
  });

  it("unmount disposes all children", () => {
    const { document, root } = createTestDom();
    const registry = makeRegistry();
    const disposed = [];
    const ctx = {
      document,
      registry,
      onDispose(el) {
        disposed.push(el);
      },
    };
    render(root, { type: "Box", children: ["x"] }, ctx);
    unmount(root, ctx);
    assert.equal(root.childNodes.length, 0);
    assert.ok(disposed.length >= 1);
  });
});

/**
 * Legacy A4.1 sketch tests superseded by registry.test.js + reconciler.test.js.
 * Kept as a thin smoke that the public exports still resolve.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComponentRegistry, createRendererRegistry } from "../../src/Browser/renderer/registry.js";
import { render, reconcileChildren } from "../../src/Browser/renderer/reconciler.js";
import { createTestDom } from "./helpers/miniDom.js";

describe("renderer exports (compat)", () => {
  it("createRendererRegistry aliases createComponentRegistry", () => {
    assert.equal(createRendererRegistry, createComponentRegistry);
  });

  it("render + reconcileChildren are callable", () => {
    const { document, root } = createTestDom();
    const registry = createComponentRegistry({
      Box: (_p, ctx) => ctx.document.createElement("div"),
    });
    render(root, { type: "Box" }, { document, registry });
    assert.equal(root.childNodes.length, 1);
    reconcileChildren(root, [], { document, registry });
    assert.equal(root.childNodes.length, 0);
  });
});

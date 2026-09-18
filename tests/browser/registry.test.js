import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createTestDom } from "./helpers/miniDom.js";

describe("renderer registry", () => {
  it("register / get / has / list", () => {
    const { document } = createTestDom();
    const reg = createComponentRegistry();
    const box = (props, ctx) => {
      const el = ctx.document.createElement("div");
      el.setAttribute("data-box", String(props?.id ?? ""));
      return el;
    };
    reg.register("Box", box);
    assert.equal(reg.has("Box"), true);
    assert.equal(reg.has("Missing"), false);
    const life = reg.get("Box");
    assert.equal(typeof life.create, "function");
    assert.equal(life.create, reg.resolve("Box").create);
    assert.deepEqual(reg.list(), ["Box"]);
    const el = reg.render("Box", { id: "1" }, { document });
    assert.equal(el.getAttribute("data-box"), "1");
  });

  it("accepts initial map", () => {
    const { document } = createTestDom();
    const reg = createComponentRegistry({
      Text: (props, ctx) => {
        const el = ctx.document.createElement("span");
        el.textContent = String(props?.t ?? "");
        return el;
      },
    });
    assert.equal(reg.has("Text"), true);
    const el = reg.render("Text", { t: "hi" }, { document });
    assert.equal(el.textContent, "hi");
  });

  it("unknown types render data-openui-unknown fallback", () => {
    const { document } = createTestDom();
    const reg = createComponentRegistry();
    assert.equal(reg.has("EvilWidget"), false);
    const el = reg.render("EvilWidget", {}, { document });
    assert.equal(el.nodeType, 1);
    assert.equal(el.getAttribute("data-openui-unknown"), "EvilWidget");
    // Fallback must not execute anything — no script-ish attrs.
    assert.equal(el.getAttribute("onclick"), null);
  });

  it("register rejects bad args", () => {
    const reg = createComponentRegistry();
    assert.throws(() => reg.register("", () => {}), /non-empty/);
    assert.throws(() => reg.register("X", null), /create/);
  });
});

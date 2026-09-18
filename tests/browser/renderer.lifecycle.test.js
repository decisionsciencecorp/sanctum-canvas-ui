/**
 * A4.1 — Component registry lifecycle + render context.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import { render, unmount } from "../../src/Browser/renderer/reconciler.js";
import { createTestDom } from "./helpers/miniDom.js";
import * as urlPolicy from "../../src/Browser/security/urlPolicy.js";

describe("renderer registry lifecycle", () => {
  it("register / resolve / has / list with renderFn wrap", () => {
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
    const life = reg.resolve("Box");
    assert.equal(typeof life.create, "function");
    assert.equal(typeof life.update, "function");
    assert.equal(typeof life.destroy, "function");
    assert.deepEqual(reg.list(), ["Box"]);
    const el = reg.render("Box", { id: "1" }, { document });
    assert.equal(el.getAttribute("data-box"), "1");
  });

  it("registers explicit create/update/destroy", () => {
    const log = [];
    const reg = createComponentRegistry();
    reg.register("Tracked", {
      create(props, ctx) {
        log.push(`create:${props?.n}`);
        const el = ctx.document.createElement("div");
        el.setAttribute("data-n", String(props?.n ?? ""));
        return el;
      },
      update(el, props) {
        log.push(`update:${props?.n}`);
        el.setAttribute("data-n", String(props?.n ?? ""));
      },
      destroy(el) {
        log.push(`destroy:${el.getAttribute("data-n")}`);
      },
    });
    const { document } = createTestDom();
    const el = reg.resolve("Tracked").create({ n: 1 }, { document });
    reg.resolve("Tracked").update(el, { n: 2 }, { document });
    reg.resolve("Tracked").destroy(el, { document });
    assert.deepEqual(log, ["create:1", "update:2", "destroy:2"]);
  });

  it("accepts initial map of lifecycles and renderFns", () => {
    const { document } = createTestDom();
    const reg = createComponentRegistry({
      Text: (props, ctx) => {
        const el = ctx.document.createElement("span");
        el.textContent = String(props?.t ?? "");
        return el;
      },
      Card: {
        create(_p, ctx) {
          return ctx.document.createElement("section");
        },
      },
    });
    assert.equal(reg.has("Text"), true);
    assert.equal(reg.has("Card"), true);
    const el = reg.render("Text", { t: "hi" }, { document });
    assert.equal(el.textContent, "hi");
  });

  it("unknown types render data-openui-unknown fallback (fail closed)", () => {
    const { document } = createTestDom();
    const reg = createComponentRegistry();
    assert.equal(reg.has("EvilWidget"), false);
    const el = reg.render("EvilWidget", {}, { document });
    assert.equal(el.nodeType, 1);
    assert.equal(el.getAttribute("data-openui-unknown"), "EvilWidget");
    assert.equal(el.getAttribute("onclick"), null);
    // update/destroy on unknown are no-ops
    reg.resolve("EvilWidget").update(el, {}, { document });
    reg.resolve("EvilWidget").destroy(el, { document });
  });

  it("register rejects bad args", () => {
    const reg = createComponentRegistry();
    assert.throws(() => reg.register("", () => {}), /non-empty/);
    assert.throws(() => reg.register("X", null), /create/);
    assert.throws(() => reg.register("Y", {}), /create/);
  });
});

describe("createRenderContext", () => {
  it("exposes renderChildren, state, actions, query, stream, urlPolicy, focus, reportError", () => {
    const { document, root } = createTestDom();
    const errors = [];
    const store = { get: () => 1 };
    const actions = { run: () => "ok" };
    const query = { status: () => "idle" };
    const registry = createComponentRegistry({
      Box: (_p, ctx) => ctx.document.createElement("div"),
    });
    const ctx = createRenderContext({
      document,
      registry,
      state: store,
      actions,
      query,
      stream: { isStreaming: true },
      reportError: (e) => errors.push(e),
    });

    assert.equal(ctx.state, store);
    assert.equal(ctx.actions, actions);
    assert.equal(ctx.query, query);
    assert.equal(ctx.stream.isStreaming, true);
    assert.equal(ctx.urlPolicy, urlPolicy);
    assert.equal(typeof ctx.urlPolicy.safeUrl, "function");
    assert.equal(typeof ctx.focus.remember, "function");
    assert.equal(typeof ctx.focus.restore, "function");
    assert.equal(typeof ctx.renderChildren, "function");
    assert.equal(typeof ctx.reportError, "function");

    ctx.renderChildren(root, [{ type: "Box", props: { "data-x": "1" } }]);
    assert.equal(root.childNodes.length, 1);
    assert.equal(root.childNodes[0].getAttribute("data-x"), "1");

    ctx.reportError(new Error("probe"));
    assert.equal(errors.length, 1);
  });
});

describe("nested mount → update → destroy lifecycle accounting", () => {
  it("logs create/update/destroy for parent and child", () => {
    const log = [];
    const { document, root } = createTestDom();
    const registry = createComponentRegistry({
      Panel: {
        create(props, ctx) {
          log.push(`Panel.create:${props?.id}`);
          const el = ctx.document.createElement("div");
          el.setAttribute("data-panel", String(props?.id ?? ""));
          return el;
        },
        update(el, props) {
          log.push(`Panel.update:${props?.id}`);
          el.setAttribute("data-panel", String(props?.id ?? ""));
        },
        destroy(el) {
          log.push(`Panel.destroy:${el.getAttribute("data-panel")}`);
        },
      },
      Item: {
        create(props, ctx) {
          log.push(`Item.create:${props?.id}`);
          const el = ctx.document.createElement("span");
          el.setAttribute("data-item", String(props?.id ?? ""));
          return el;
        },
        update(el, props) {
          log.push(`Item.update:${props?.id}`);
          el.setAttribute("data-item", String(props?.id ?? ""));
        },
        destroy(el) {
          log.push(`Item.destroy:${el.getAttribute("data-item")}`);
        },
      },
    });

    const ctx = createRenderContext({ document, registry });

    // mount
    render(
      root,
      {
        type: "Panel",
        key: "p",
        props: { id: "p1" },
        children: [{ type: "Item", key: "i", props: { id: "i1" } }],
      },
      ctx,
    );
    assert.ok(log.includes("Panel.create:p1"));
    assert.ok(log.includes("Item.create:i1"));

    // update (same keys)
    log.length = 0;
    render(
      root,
      {
        type: "Panel",
        key: "p",
        props: { id: "p1" },
        children: [{ type: "Item", key: "i", props: { id: "i2" } }],
      },
      ctx,
    );
    assert.ok(log.includes("Panel.update:p1"));
    assert.ok(log.includes("Item.update:i2"));
    assert.equal(log.some((x) => x.startsWith("Panel.destroy")), false);
    assert.equal(log.some((x) => x.startsWith("Item.destroy")), false);

    // destroy via unmount
    log.length = 0;
    unmount(root, ctx);
    // children destroyed before parent
    const itemDestroy = log.indexOf("Item.destroy:i2");
    const panelDestroy = log.indexOf("Panel.destroy:p1");
    assert.ok(itemDestroy >= 0);
    assert.ok(panelDestroy >= 0);
    assert.ok(itemDestroy < panelDestroy);
    assert.equal(root.childNodes.length, 0);
  });
});

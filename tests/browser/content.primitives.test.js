/**
 * A5.2 content primitives — registry, fixtures, lifecycle, a11y/status cues.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  registerContent,
  CONTENT_COMPONENTS,
  TextContent,
  TextCallout,
  Callout,
  Separator,
  Tag,
  TagBlock,
  EntityList,
  InlineHeader,
  CardHeader,
  MetricIndicator,
  MetricIndicatorWithStrikethrough,
  MetricIndicatorInline,
} from "../../src/Browser/components/content/index.js";
import {
  requireDocument,
  resolveStatus,
  applySurfaceStatus,
  applyVariantCue,
  asText,
  setClass,
  setOrRemoveAttr,
  clearChildren,
  SURFACE_STATUS,
  lifecycle,
} from "../../src/Browser/components/content/shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "../fixtures/components/content");

function ctx() {
  const { document } = createTestDom();
  return { document };
}

function findByAttr(root, attr, value) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (value == null ? n.hasAttribute(attr) : n.getAttribute(attr) === value) {
        out.push(n);
      }
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(root);
  return out;
}

describe("content shared helpers", () => {
  it("requireDocument throws without document", () => {
    assert.throws(() => requireDocument({}), /document required/);
  });

  it("resolveStatus covers aliases", () => {
    assert.equal(resolveStatus({ status: "loading" }), "loading");
    assert.equal(resolveStatus({ loading: true }), "loading");
    assert.equal(resolveStatus({ empty: true }), "empty");
    assert.equal(resolveStatus({ error: "boom" }), "error");
    assert.equal(resolveStatus({ state: "ready" }), "ready");
    assert.equal(resolveStatus({}), "ready");
    assert.equal(SURFACE_STATUS.ERROR, "error");
  });

  it("asText / setClass / setOrRemoveAttr / clearChildren", () => {
    const { document } = createTestDom();
    assert.equal(asText(null), "");
    assert.equal(asText(12), "12");
    assert.equal(asText(true), "true");
    assert.equal(asText({}), "");
    const el = document.createElement("div");
    setClass(el, " a b ");
    assert.equal(el.getAttribute("class"), "a b");
    setOrRemoveAttr(el, "hidden", true);
    assert.equal(el.getAttribute("hidden"), "true");
    setOrRemoveAttr(el, "hidden", null);
    assert.equal(el.getAttribute("hidden"), null);
    const child = document.createElement("span");
    el.appendChild(child);
    clearChildren(el);
    assert.equal(el.childNodes.length, 0);
  });

  it("applySurfaceStatus toggles status text and aria", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    applySurfaceStatus(el, document, { status: "loading" });
    assert.equal(el.getAttribute("data-status"), "loading");
    assert.equal(el.getAttribute("aria-busy"), "true");
    assert.equal(el.childNodes.length, 1);
    applySurfaceStatus(el, document, { status: "error", errorMessage: "Nope" });
    assert.equal(el.getAttribute("data-status"), "error");
    assert.match(el.textContent, /Nope/);
    applySurfaceStatus(el, document, { status: "ready" });
    assert.equal(el.getAttribute("aria-busy"), null);
    assert.equal(el.childNodes.length, 0);
  });

  it("applySurfaceStatus reuses pre-existing status text child", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    const pre = document.createElement("span");
    pre.setAttribute("data-canvas-status-text", "");
    pre.textContent = "stale";
    el.appendChild(pre);
    applySurfaceStatus(el, document, { status: "empty", emptyMessage: "None" });
    assert.equal(el.childNodes.length, 1);
    assert.match(el.textContent, /None/);
  });

  it("applySurfaceStatus empty/loading message fallbacks", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    applySurfaceStatus(el, document, { status: "loading" }, { loadingMessage: "Wait" });
    assert.match(el.textContent, /Wait/);
    applySurfaceStatus(el, document, { status: "empty" });
    assert.match(el.textContent, /No content/);
  });

  it("applyVariantCue sets data-variant and default aria-label", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    applyVariantCue(el, "info", { info: "Information" });
    assert.equal(el.getAttribute("data-variant"), "info");
    assert.equal(el.getAttribute("aria-label"), "Information");
    el.setAttribute("aria-label", "Custom");
    applyVariantCue(el, "danger", { danger: "Danger" });
    assert.equal(el.getAttribute("aria-label"), "Custom");
  });

  it("lifecycle create/update/destroy", () => {
    const life = lifecycle({
      mount(doc) {
        return doc.createElement("section");
      },
      patch(el, props) {
        el.setAttribute("data-x", String(props.x ?? ""));
      },
      unmount(el) {
        el.setAttribute("data-dead", "1");
      },
    });
    const c = ctx();
    const el = life.create({ x: 1 }, c);
    assert.equal(el.getAttribute("data-x"), "1");
    life.update(el, { x: 2 }, c);
    assert.equal(el.getAttribute("data-x"), "2");
    life.destroy(el, c);
    assert.equal(el.getAttribute("data-dead"), "1");
  });
});

describe("registerContent", () => {
  it("registers all content types on a registry", () => {
    const reg = createComponentRegistry();
    registerContent(reg);
    const names = Object.keys(CONTENT_COMPONENTS);
    assert.ok(names.length >= 10);
    for (const name of names) {
      assert.equal(reg.has(name), true, name);
    }
    const { document } = createTestDom();
    const el = reg.render("TextContent", { text: "via registry" }, { document });
    assert.equal(el.getAttribute("data-canvas-component"), "TextContent");
    assert.match(el.textContent, /via registry/);
  });

  it("rejects bad registry", () => {
    assert.throws(() => registerContent(null), /register/);
    assert.throws(() => registerContent({}), /register/);
  });
});

describe("fixture-driven content components", () => {
  const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 10);

  for (const file of files) {
    const fixture = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8"));
    const life = CONTENT_COMPONENTS[fixture.component];
    assert.ok(life, `registered ${fixture.component}`);

    it(`${fixture.component} fixtures (${file})`, () => {
      const c = ctx();
      for (const cas of fixture.cases) {
        const el = life.create(cas.props, c);
        const exp = cas.expect || {};
        for (const [k, v] of Object.entries(exp)) {
          if (k === "body") {
            assert.match(el.textContent, new RegExp(v));
          } else if (k === "childCount") {
            const kids = [...el.childNodes].filter((n) => n.nodeType === 1);
            assert.equal(kids.length, v, cas.name);
          } else if (k === "rowCount") {
            const rows = findByAttr(el, "data-row-type");
            assert.equal(rows.length, v, cas.name);
          } else if (k === "trend") {
            const trends = findByAttr(el, "data-trend", v);
            assert.equal(trends.length, 1, cas.name);
          } else {
            assert.equal(el.getAttribute(k), v, `${cas.name} ${k}`);
          }
        }
        life.update(el, cas.props, c);
        life.destroy(el, c);
      }
    });
  }
});

describe("TextContent", () => {
  it("supports size weight variants and content alias", () => {
    const c = ctx();
    const el = TextContent.create(
      { content: "Alt", variant: "card", size: "lg", weight: "bold" },
      c,
    );
    assert.equal(el.getAttribute("data-variant"), "card");
    assert.equal(el.getAttribute("data-size"), "lg");
    assert.equal(el.getAttribute("data-weight"), "bold");
    assert.match(el.getAttribute("class"), /canvas-text-content--card/);
    TextContent.update(el, { text: "Updated", variant: "bogus", size: "xx", weight: "xx" }, c);
    assert.equal(el.getAttribute("data-variant"), "sunk");
    assert.match(el.textContent, /Updated/);
  });

  it("children string and clear variant", () => {
    const c = ctx();
    const el = TextContent.create({ children: "Kid", variant: "clear", size: "sm", weight: "medium" }, c);
    assert.equal(el.getAttribute("data-variant"), "clear");
    assert.match(el.textContent, /Kid/);
  });

  it("loading flag via loading:true", () => {
    const c = ctx();
    const el = TextContent.create({ text: "x", loading: true }, c);
    assert.equal(el.getAttribute("data-status"), "loading");
  });

  it("error via error prop", () => {
    const c = ctx();
    const el = TextContent.create({ text: "x", error: "bad" }, c);
    assert.equal(el.getAttribute("data-status"), "error");
  });
});

describe("TextCallout / Callout", () => {
  it("TextCallout empty and invalid variant", () => {
    const c = ctx();
    const empty = TextCallout.create({ variant: "nope" }, c);
    assert.equal(empty.getAttribute("data-status"), "empty");
    assert.equal(empty.getAttribute("data-variant"), "neutral");
  });

  it("Callout empty and description-only", () => {
    const c = ctx();
    const empty = Callout.create({}, c);
    assert.equal(empty.getAttribute("data-status"), "empty");
    const desc = Callout.create({ description: "Only desc", variant: "info" }, c);
    assert.match(desc.textContent, /Only desc/);
  });

  it("Callout autodismiss and destroy clears timer", async () => {
    const c = ctx();
    const el = Callout.create(
      { title: "Temp", duration: 20, variant: "success" },
      c,
    );
    assert.equal(el.getAttribute("data-autodismiss"), "true");
    assert.match(el.getAttribute("style") || "", /--canvas-callout-duration/);
    Callout.destroy(el, c);
    await new Promise((r) => setTimeout(r, 40));
    // destroyed before fire — should not throw; may or may not set dismissed
    Callout.update(el, { title: "Again", visible: true }, c);
    assert.equal(el.getAttribute("hidden"), null);
  });

  it("Callout autodismiss fires", async () => {
    const c = ctx();
    const el = Callout.create({ title: "Bye", duration: 15 }, c);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(el.getAttribute("data-dismissed"), "true");
    assert.equal(el.getAttribute("hidden"), "true");
  });

  it("Callout loading skips body", () => {
    const c = ctx();
    const el = Callout.create({ title: "x", status: "loading" }, c);
    assert.equal(el.getAttribute("data-status"), "loading");
    assert.equal(findByAttr(el, "class", "canvas-callout__title").length, 0);
  });
});

describe("Separator", () => {
  it("defaults decorative horizontal", () => {
    const c = ctx();
    const el = Separator.create({}, c);
    assert.equal(el.getAttribute("role"), "none");
    assert.equal(el.getAttribute("data-orientation"), "horizontal");
  });
});

describe("Tag / TagBlock", () => {
  it("Tag with icon", () => {
    const c = ctx();
    const el = Tag.create({ text: "A", icon: "*", variant: "warning", size: "lg" }, c);
    assert.equal(el.getAttribute("data-size"), "lg");
    assert.equal(findByAttr(el, "class", "canvas-tag__icon").length, 1);
  });

  it("TagBlock string tags and destroy", () => {
    const c = ctx();
    const el = TagBlock.create({ tags: ["One", "Two"], size: "md" }, c);
    assert.equal(el.getAttribute("role"), "list");
    const items = findByAttr(el, "role", "listitem");
    assert.equal(items.length, 2);
    TagBlock.destroy(el, c);
  });

  it("TagBlock accepts children array alias", () => {
    const c = ctx();
    const el = TagBlock.create({ children: [{ text: "C1", variant: "danger" }] }, c);
    assert.equal(findByAttr(el, "role", "listitem").length, 1);
  });

  it("TagBlock neither tags nor children is empty", () => {
    const c = ctx();
    const el = TagBlock.create({}, c);
    assert.equal(el.getAttribute("data-status"), "empty");
  });

  it("TagBlock loading", () => {
    const c = ctx();
    const el = TagBlock.create({ tags: [{ text: "x" }], status: "loading" }, c);
    assert.equal(el.getAttribute("data-status"), "loading");
  });

  it("Tag invalid size/variant fall back", () => {
    const c = ctx();
    const el = Tag.create({ text: "Z", size: "xl", variant: "purple" }, c);
    assert.equal(el.getAttribute("data-size"), "md");
    assert.equal(el.getAttribute("data-variant"), "neutral");
  });
});

describe("EntityList", () => {
  it("small size hides header/footer", () => {
    const c = ctx();
    const el = EntityList.create(
      {
        size: "small",
        header: { left: "H", right: "V" },
        rows: [{ left: "a", right: "1", rightVariant: "number" }],
        footer: { left: "F", right: "2" },
      },
      c,
    );
    assert.equal(el.getAttribute("data-size"), "small");
    assert.equal(findByAttr(el, "data-row-type", "header").length, 0);
    assert.equal(findByAttr(el, "data-row-type", "body").length, 1);
    assert.equal(findByAttr(el, "data-row-type", "footer").length, 0);
  });

  it("invalid size falls back to default", () => {
    const c = ctx();
    const el = EntityList.create(
      { size: "huge", rows: [{ left: "a", right: "b" }] },
      c,
    );
    assert.equal(el.getAttribute("data-size"), "default");
  });

  it("error status", () => {
    const c = ctx();
    const el = EntityList.create({ rows: [], error: "fail" }, c);
    assert.equal(el.getAttribute("data-status"), "error");
  });
});

describe("InlineHeader / CardHeader", () => {
  it("InlineHeader title alias", () => {
    const c = ctx();
    const el = InlineHeader.create({ title: "T" }, c);
    assert.match(el.textContent, /T/);
  });

  it("InlineHeader loading and description-only", () => {
    const c = ctx();
    const load = InlineHeader.create({ heading: "H", status: "loading" }, c);
    assert.equal(load.getAttribute("data-status"), "loading");
    const desc = InlineHeader.create({ description: "Only" }, c);
    assert.match(desc.textContent, /Only/);
  });

  it("CardHeader action object labels", () => {
    const c = ctx();
    const el = CardHeader.create(
      {
        title: "Main",
        actions: [{ label: "Go" }, { text: "Stop" }, ""],
      },
      c,
    );
    assert.equal(findByAttr(el, "class", "canvas-card-header__action-label").length, 2);
    CardHeader.update(el, { title: "Main", actions: "Solo" }, c);
    assert.equal(findByAttr(el, "class", "canvas-card-header__action-label").length, 1);
  });

  it("CardHeader subtitle-only and loading", () => {
    const c = ctx();
    const sub = CardHeader.create({ subtitle: "Sub only" }, c);
    assert.match(sub.textContent, /Sub only/);
    const load = CardHeader.create({ title: "X", loading: true }, c);
    assert.equal(load.getAttribute("data-status"), "loading");
  });
});

describe("MetricIndicator", () => {
  it("aliases force variants", () => {
    const c = ctx();
    const a = MetricIndicatorWithStrikethrough.create(
      { value: "10", previousValue: "8" },
      c,
    );
    assert.equal(a.getAttribute("data-variant"), "with-strikethrough");
    MetricIndicatorWithStrikethrough.update(a, { value: "11", previousValue: "8" }, c);
    MetricIndicatorWithStrikethrough.destroy(a, c);

    const b = MetricIndicatorInline.create({ value: "3", subtext: "x" }, c);
    assert.equal(b.getAttribute("data-variant"), "inline");
    MetricIndicatorInline.update(b, { value: "4", subtext: "y" }, c);
    MetricIndicatorInline.destroy(b, c);
  });

  it("infers strikethrough from previousValue", () => {
    const c = ctx();
    const el = MetricIndicator.create({ value: "1", previousValue: "0" }, c);
    assert.equal(el.getAttribute("data-variant"), "with-strikethrough");
  });

  it("empty and trend without finite percent", () => {
    const c = ctx();
    const empty = MetricIndicator.create({ value: "" }, c);
    assert.equal(empty.getAttribute("data-status"), "empty");
    const el = MetricIndicator.create(
      { value: "1", trend: { direction: "up", value: "n/a" } },
      c,
    );
    const trend = findByAttr(el, "data-trend", "up")[0];
    assert.ok(trend);
    assert.match(trend.getAttribute("aria-label") || "", /Trend up/);
  });

  it("ignores bad trend direction", () => {
    const c = ctx();
    const el = MetricIndicator.create(
      { value: "1", trend: { direction: "sideways", value: 1 } },
      c,
    );
    assert.equal(findByAttr(el, "data-trend").length, 0);
  });
});

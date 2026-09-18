/**
 * A5.4 — Tabs + Accordion (keyboard, a11y, stream state preservation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import { render } from "../../src/Browser/renderer/reconciler.js";
import {
  registerContainers,
  CONTAINER_COMPONENTS,
  Tabs,
  TabItem,
  Accordion,
  AccordionItem,
  normalizeItem,
  normalizeItems,
  itemKey,
  contentSize,
  asText,
  lifecycle,
  __tabsTestUtils,
  __accordionTestUtils,
} from "../../src/Browser/components/containers/index.js";
import {
  requireDocument,
  setClass,
  setOrRemoveAttr,
  findDescendantsByAttr,
  findDirectByAttr,
} from "../../src/Browser/components/containers/shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const FIXTURE_DIR = join(__dirname, "../fixtures/components");

function ctx() {
  const { document } = createTestDom();
  return { document };
}

function renderCtx(extra = {}) {
  const { document, root } = createTestDom();
  const registry = createComponentRegistry();
  registerContainers(registry);
  registry.register("Text", {
    create(props = {}, c = {}) {
      const el = (c.document ?? document).createElement("span");
      el.setAttribute("data-canvas-component", "Text");
      el.textContent = String(props.text ?? props.content ?? "");
      return el;
    },
    update(el, props = {}) {
      el.textContent = String(props.text ?? props.content ?? "");
    },
    destroy() {},
  });
  const c = createRenderContext({ document, registry, ...extra });
  return { document, root, registry, ctx: c };
}

function loadFixture(name) {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

function fireKey(el, key) {
  el.dispatchEvent({ type: "keydown", key, bubbles: true });
}

function fireClick(el) {
  el.dispatchEvent({ type: "click", target: el, bubbles: true });
}

describe("A5.4 container shared helpers", () => {
  it("requireDocument / asText / setClass / attrs", () => {
    assert.throws(() => requireDocument({}), /document required/);
    assert.equal(asText(null), "");
    assert.equal(asText(3), "3");
    assert.equal(asText({}), "");
    const { document } = createTestDom();
    const el = document.createElement("div");
    setClass(el, " a ");
    assert.equal(el.getAttribute("class"), "a");
    setOrRemoveAttr(el, "x", true);
    assert.equal(el.getAttribute("x"), "true");
    setOrRemoveAttr(el, "x", null);
    assert.equal(el.getAttribute("x"), null);
  });

  it("normalizeItem / normalizeItems / itemKey / contentSize", () => {
    assert.equal(normalizeItem(null), null);
    assert.equal(normalizeItem({}), null);
    const a = normalizeItem({
      type: "TabItem",
      id: "s1",
      props: { value: "v", trigger: "T", content: ["c"] },
    });
    assert.equal(a.value, "v");
    assert.equal(a.trigger, "T");
    assert.equal(a.id, "s1");
    assert.equal(itemKey(a, 0), "s1");
    assert.ok(contentSize(["x"]) > 0);
    const items = normalizeItems({
      items: [
        { value: "a", trigger: "A", content: [] },
        { type: "Other", props: { value: "skip" } },
        { type: "TabItem", props: { value: "b", trigger: "B", content: "solo" } },
      ],
    }, "TabItem");
    assert.equal(items.length, 2);
    assert.equal(items[1].content[0], "solo");
    const fromKids = normalizeItems({
      children: [{ value: "c", trigger: "C", content: [] }],
    });
    assert.equal(fromKids.length, 1);
  });

  it("lifecycle helper", () => {
    const life = lifecycle({
      mount(doc) {
        return doc.createElement("div");
      },
      patch(el, props) {
        el.setAttribute("data-n", String(props.n ?? ""));
      },
      unmount(el) {
        el.setAttribute("data-gone", "1");
      },
    });
    const c = ctx();
    const el = life.create({ n: 1 }, c);
    life.update(el, { n: 2 }, c);
    assert.equal(el.getAttribute("data-n"), "2");
    life.destroy(el, c);
    assert.equal(el.getAttribute("data-gone"), "1");
  });

  it("findDirectByAttr / findDescendantsByAttr", () => {
    const { document } = createTestDom();
    const root = document.createElement("div");
    const a = document.createElement("span");
    a.setAttribute("data-x", "1");
    const b = document.createElement("span");
    b.setAttribute("data-x", "2");
    root.appendChild(a);
    a.appendChild(b);
    assert.equal(findDirectByAttr(root, "data-x").length, 1);
    assert.equal(findDescendantsByAttr(root, "data-x").length, 2);
    assert.equal(findDescendantsByAttr(root, "data-x", "2").length, 1);
  });
});

describe("A5.4 registerContainers", () => {
  it("registers Tabs TabItem Accordion AccordionItem", () => {
    const reg = createComponentRegistry();
    registerContainers(reg);
    for (const name of Object.keys(CONTAINER_COMPONENTS)) {
      assert.equal(reg.has(name), true, name);
    }
    assert.throws(() => registerContainers(null), /register/);
    assert.throws(() => registerContainers({}), /register/);
  });
});

describe("A5.4 Tabs", () => {
  it("fixture basic selection + aria wiring", () => {
    const fixture = loadFixture("tabs.family.json");
    const cas = fixture.cases.find((c) => c.id === "tabs-basic");
    const c = ctx();
    const el = Tabs.create(cas.props, c);
    for (const [k, v] of Object.entries(cas.expect)) {
      assert.equal(el.getAttribute(k), v, k);
    }
    const utils = __tabsTestUtils();
    const triggers = utils.getTriggers(el);
    assert.equal(triggers.length, 2);
    assert.equal(triggers[0].getAttribute("aria-selected"), "true");
    assert.equal(triggers[0].getAttribute("tabindex"), "0");
    assert.equal(triggers[1].getAttribute("tabindex"), "-1");
    const controls = triggers[0].getAttribute("aria-controls");
    assert.ok(controls);
    const panels = utils.getPanels(el);
    assert.equal(panels[0].getAttribute("id"), controls);
    assert.equal(panels[0].getAttribute("hidden"), null);
    assert.equal(panels[1].getAttribute("hidden"), "true");
    Tabs.destroy(el, c);
  });

  it("Arrow / Home / End roving focus + selection", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
          { value: "c", trigger: "C", content: ["3"] },
        ],
      },
      c,
    );
    const utils = __tabsTestUtils();
    const triggers = utils.getTriggers(el);
    triggers[0].focus();
    fireKey(el, "ArrowRight");
    assert.equal(el.getAttribute("data-selected"), "b");
    assert.equal(c.document.activeElement, triggers[1]);
    fireKey(el, "ArrowRight");
    assert.equal(el.getAttribute("data-selected"), "c");
    fireKey(el, "Home");
    assert.equal(el.getAttribute("data-selected"), "a");
    fireKey(el, "End");
    assert.equal(el.getAttribute("data-selected"), "c");
    fireKey(el, "ArrowLeft");
    assert.equal(el.getAttribute("data-selected"), "b");
  });

  it("click selects and stops stream auto-follow", () => {
    const fixture = loadFixture("tabs.family.json");
    const cas = fixture.cases.find((c) => c.id === "tabs-stream-grow");
    const c = ctx();
    const el = Tabs.create(cas.chunks[0].props, c);
    assert.equal(el.getAttribute("data-selected"), "line");
    const utils = __tabsTestUtils();
    fireClick(utils.getTriggers(el)[0]);
    Tabs.update(el, cas.chunks[1].props, c);
    // User interacted on line — growing bar content must not steal selection
    assert.equal(el.getAttribute("data-selected"), "line");
  });

  it("stream content growth auto-follows without user interaction", () => {
    const fixture = loadFixture("tabs.family.json");
    const cas = fixture.cases.find((c) => c.id === "tabs-stream-grow");
    const c = ctx();
    const el = Tabs.create(cas.chunks[0].props, c);
    Tabs.update(el, cas.chunks[1].props, c);
    assert.equal(el.getAttribute("data-selected"), "bar");
  });

  it("persistent panels survive update; same trigger identity via value key", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["x"] },
          { value: "b", trigger: "B", content: ["y"] },
        ],
      },
      c,
    );
    const utils = __tabsTestUtils();
    const t0 = utils.getTriggers(el)[0];
    const p0 = utils.getPanels(el)[0];
    fireClick(utils.getTriggers(el)[1]);
    Tabs.update(
      el,
      {
        items: [
          { value: "a", trigger: "Alpha", content: ["x2"] },
          { value: "b", trigger: "Beta", content: ["y2"] },
        ],
      },
      c,
    );
    assert.equal(utils.getTriggers(el)[0], t0);
    assert.equal(utils.getPanels(el)[0], p0);
    assert.equal(el.getAttribute("data-selected"), "b");
    assert.match(t0.textContent, /Alpha/);
  });

  it("reconciler keyed stream keeps Tabs element + selection", () => {
    const { root, ctx: c } = renderCtx();
    const vnode1 = {
      type: "Tabs",
      id: "tabs-root",
      props: {
        items: [
          { id: "ti-a", value: "a", trigger: "A", content: ["A1"] },
          { id: "ti-b", value: "b", trigger: "B", content: ["B1"] },
        ],
      },
    };
    render(root, vnode1, c);
    const tabsEl = root.childNodes[0];
    const utils = __tabsTestUtils();
    fireClick(utils.getTriggers(tabsEl)[1]);
    assert.equal(tabsEl.getAttribute("data-selected"), "b");

    const vnode2 = {
      type: "Tabs",
      id: "tabs-root",
      props: {
        items: [
          { id: "ti-a", value: "a", trigger: "A", content: ["A1", "more"] },
          { id: "ti-b", value: "b", trigger: "B", content: ["B1", "also"] },
          { id: "ti-c", value: "c", trigger: "C", content: ["C1"] },
        ],
      },
    };
    render(root, vnode2, c);
    assert.equal(root.childNodes[0], tabsEl);
    assert.equal(tabsEl.getAttribute("data-selected"), "b");
    assert.equal(tabsEl.getAttribute("data-item-count"), "3");
  });

  it("partial disables interaction", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        partial: true,
        items: [{ value: "a", trigger: "A", content: ["x"] }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-openui-partial"), "1");
    const utils = __tabsTestUtils();
    fireClick(utils.getTriggers(el)[0]);
    // still selected as default; click ignored for user flag — selection stays a
    assert.equal(el.getAttribute("data-selected"), "a");
  });

  it("controlled value prop", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        value: "b",
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    assert.equal(el.getAttribute("data-selected"), "b");
  });

  it("empty items and TabItem marker", () => {
    const c = ctx();
    const empty = Tabs.create({ items: [] }, c);
    assert.equal(empty.getAttribute("data-item-count"), "0");
    const marker = TabItem.create({ value: "x", trigger: "X" }, c);
    assert.equal(marker.getAttribute("data-canvas-component"), "TabItem");
    assert.equal(marker.getAttribute("data-value"), "x");
    TabItem.destroy(marker, c);
  });

  it("ArrowDown/Up aliases", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    fireKey(el, "ArrowDown");
    assert.equal(el.getAttribute("data-selected"), "b");
    fireKey(el, "ArrowUp");
    assert.equal(el.getAttribute("data-selected"), "a");
  });

  it("falls back when selected tab is removed", () => {
    const c = ctx();
    const el = Tabs.create(
      {
        value: "b",
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    assert.equal(el.getAttribute("data-selected"), "b");
    Tabs.update(
      el,
      {
        items: [{ value: "a", trigger: "A", content: ["1"] }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-selected"), "a");
  });

  it("normalizeItem uses children/key aliases and renderItemContent stubs", () => {
    const item = normalizeItem({
      key: "k1",
      children: ["via-children"],
      value: "v",
      trigger: "T",
    });
    assert.equal(item.key, "k1");
    assert.equal(item.content[0], "via-children");
    assert.equal(itemKey({ value: "only" }, 3), "only");

    const { document } = createTestDom();
    const host = document.createElement("div");
    const leaf = document.createElement("em");
    leaf.textContent = "leaf";
    // Import renderItemContent path via Tabs update with stub vnode content
    const el = Tabs.create(
      {
        items: [
          {
            value: "x",
            trigger: "X",
            content: [
              "str",
              12,
              leaf,
              { type: "Text", props: { text: "stubbed" } },
              null,
            ],
          },
        ],
      },
      { document },
    );
    assert.match(el.textContent, /str/);
    assert.match(el.textContent, /stubbed/);
  });
});

describe("A5.4 Accordion", () => {
  it("fixture basic disclosure attrs", () => {
    const fixture = loadFixture("accordion.family.json");
    const cas = fixture.cases.find((c) => c.id === "accordion-basic");
    const c = ctx();
    const el = Accordion.create(cas.props, c);
    for (const [k, v] of Object.entries(cas.expect)) {
      assert.equal(el.getAttribute(k), v, k);
    }
    const utils = __accordionTestUtils();
    const items = utils.getItems(el);
    assert.equal(items.length, 2);
    const openItem = items.find((i) => i.getAttribute("data-value") === "faq-2");
    const trigger = findDirectByAttr(findDirectByAttr(openItem, "data-canvas-part", "header")[0], "data-canvas-part", "trigger")[0]
      || findDescendantsByAttr(openItem, "data-canvas-part", "trigger")[0];
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.ok(trigger.getAttribute("aria-controls"));
    Accordion.destroy(el, c);
  });

  it("click toggles collapsible single-open", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [
          { value: "one", trigger: "One", content: ["1"] },
          { value: "two", trigger: "Two", content: ["2"] },
        ],
      },
      c,
    );
    const utils = __accordionTestUtils();
    // First mount opens newest (two). Click two → close. Click one → open one.
    assert.equal(el.getAttribute("data-open"), "two");
    const triggers = findDescendantsByAttr(el, "data-canvas-part", "trigger");
    fireClick(triggers[1]);
    assert.equal(el.getAttribute("data-open"), null);
    fireClick(triggers[0]);
    assert.equal(el.getAttribute("data-open"), "one");
    fireClick(triggers[0]);
    assert.equal(el.getAttribute("data-open"), null);
  });

  it("Enter / Space on trigger toggles", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [{ value: "only", trigger: "Solo", content: ["body"] }],
      },
      c,
    );
    const trigger = findDescendantsByAttr(el, "data-canvas-part", "trigger")[0];
    // initially open
    assert.equal(el.getAttribute("data-open"), "only");
    trigger.dispatchEvent({ type: "keydown", key: "Enter", target: trigger, bubbles: true });
    assert.equal(el.getAttribute("data-open"), null);
    trigger.dispatchEvent({ type: "keydown", key: " ", target: trigger, bubbles: true });
    assert.equal(el.getAttribute("data-open"), "only");
  });

  it("stream append opens newest until user intervenes", () => {
    const fixture = loadFixture("accordion.family.json");
    const cas = fixture.cases.find((c) => c.id === "accordion-stream-append");
    const c = ctx();
    const el = Accordion.create(cas.chunks[0].props, c);
    assert.equal(el.getAttribute("data-open"), "one");
    Accordion.update(el, cas.chunks[1].props, c);
    assert.equal(el.getAttribute("data-open"), "two");

    const el2 = Accordion.create(cas.chunks[0].props, c);
    const t = findDescendantsByAttr(el2, "data-canvas-part", "trigger")[0];
    fireClick(t); // user closes
    Accordion.update(el2, cas.chunks[1].props, c);
    // user interacted — do not auto-jump to two
    assert.notEqual(el2.getAttribute("data-open"), "two");
  });

  it("reconciler preserves open state across keyed update", () => {
    const { root, ctx: c } = renderCtx();
    render(
      root,
      {
        type: "Accordion",
        id: "acc-root",
        props: {
          items: [
            { id: "ai-1", value: "one", trigger: "One", content: ["1"] },
            { id: "ai-2", value: "two", trigger: "Two", content: ["2"] },
          ],
        },
      },
      c,
    );
    const acc = root.childNodes[0];
    const triggers = findDescendantsByAttr(acc, "data-canvas-part", "trigger");
    // open newest (two); user opens one
    fireClick(triggers[0]);
    assert.equal(acc.getAttribute("data-open"), "one");

    render(
      root,
      {
        type: "Accordion",
        id: "acc-root",
        props: {
          items: [
            { id: "ai-1", value: "one", trigger: "One", content: ["1", "more"] },
            { id: "ai-2", value: "two", trigger: "Two", content: ["2"] },
          ],
        },
      },
      c,
    );
    assert.equal(root.childNodes[0], acc);
    assert.equal(acc.getAttribute("data-open"), "one");
  });

  it("variant card fixture + AccordionItem marker", () => {
    const fixture = loadFixture("accordion.family.json");
    const cas = fixture.cases.find((c) => c.id === "accordion-variant-card");
    const c = ctx();
    const el = Accordion.create(cas.props, c);
    assert.equal(el.getAttribute("data-variant"), "card");
    const marker = AccordionItem.create({ value: "z", trigger: "Z" }, c);
    assert.equal(marker.getAttribute("data-value"), "z");
  });

  it("item identity preserved on content update", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    const utils = __accordionTestUtils();
    const first = utils.getItems(el)[0];
    Accordion.update(
      el,
      {
        items: [
          { value: "a", trigger: "A+", content: ["1b"] },
          { value: "b", trigger: "B+", content: ["2b"] },
        ],
      },
      c,
    );
    assert.equal(utils.getItems(el)[0], first);
  });

  it("user open survives removal of other items; empty value closes", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    const triggers = findDescendantsByAttr(el, "data-canvas-part", "trigger");
    fireClick(triggers[0]); // open a (user)
    assert.equal(el.getAttribute("data-open"), "a");
    Accordion.update(
      el,
      {
        items: [{ value: "a", trigger: "A", content: ["1"] }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-open"), "a");
    Accordion.update(el, { value: "", items: [{ value: "a", trigger: "A", content: ["1"] }] }, c);
    assert.equal(el.getAttribute("data-open"), null);
  });

  it("open value removed after user interact falls back", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [
          { value: "a", trigger: "A", content: ["1"] },
          { value: "b", trigger: "B", content: ["2"] },
        ],
      },
      c,
    );
    const triggers = findDescendantsByAttr(el, "data-canvas-part", "trigger");
    fireClick(triggers[1]); // ensure open b then close then open a
    fireClick(triggers[0]);
    assert.equal(el.getAttribute("data-open"), "a");
    Accordion.update(
      el,
      {
        items: [{ value: "b", trigger: "B", content: ["2"] }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-open"), "b");
  });

  it("partial accordion ignores activation", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        partial: true,
        items: [{ value: "a", trigger: "A", content: ["1"] }],
      },
      c,
    );
    const trigger = findDescendantsByAttr(el, "data-canvas-part", "trigger")[0];
    fireClick(trigger);
    fireKey(el, "Enter");
    assert.equal(el.getAttribute("data-openui-partial"), "1");
  });

  it("label/title aliases on items", () => {
    const c = ctx();
    const el = Accordion.create(
      {
        items: [{ value: "x", label: "FromLabel", content: ["c"] }],
      },
      c,
    );
    assert.match(el.textContent, /FromLabel/);
  });
});

describe("A5.4 fixtures + CSS on disk", () => {
  it("family fixtures exist", () => {
    const tabs = loadFixture("tabs.family.json");
    const acc = loadFixture("accordion.family.json");
    assert.equal(tabs.family, "Tabs");
    assert.equal(acc.family, "Accordion");
    assert.ok(tabs.cases.length >= 2);
    assert.ok(acc.cases.length >= 2);
  });

  it("tabs.css and accordion.css use --canvas- tokens", () => {
    const tabsCss = readFileSync(join(ROOT, "public/assets/css/components/tabs.css"), "utf8");
    const accCss = readFileSync(join(ROOT, "public/assets/css/components/accordion.css"), "utf8");
    assert.match(tabsCss, /--canvas-/);
    assert.match(accCss, /--canvas-/);
    assert.equal(existsSync(join(ROOT, "src/Browser/components/containers/Tabs.js")), true);
    assert.equal(existsSync(join(ROOT, "src/Browser/components/containers/Accordion.js")), true);
  });
});

/**
 * A5.6 Carousel + A5.7 Modal — structure, a11y, keyboard, stream safety.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom, FakeDocument } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import { render } from "../../src/Browser/renderer/reconciler.js";
import {
  registerCarouselModal,
  CAROUSEL_MODAL_COMPONENTS,
  Carousel,
  Modal,
} from "../../src/Browser/components/containers/registerCarouselModal.js";
import {
  enforceSlideStructure,
  normalizeSlides,
  slideStructureSignature,
  prefersReducedMotion,
  getCarouselState,
} from "../../src/Browser/components/containers/Carousel.js";
import {
  resolveOpen,
  writeOpen,
  focusableElements,
  getModalState,
} from "../../src/Browser/components/containers/Modal.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = join(rootDir, "tests/fixtures/components");

function textComponent() {
  return {
    create(_props, ctx) {
      const el = ctx.document.createElement("span");
      el.setAttribute("data-canvas-component", "Text");
      return el;
    },
    update() {},
    destroy() {},
  };
}

function registryWithText() {
  const registry = createComponentRegistry();
  registerCarouselModal(registry);
  registry.register("Text", textComponent());
  return registry;
}

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
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

describe("registerCarouselModal", () => {
  it("registers Carousel and Modal", () => {
    const registry = createComponentRegistry();
    registerCarouselModal(registry);
    assert.equal(registry.has("Carousel"), true);
    assert.equal(registry.has("Modal"), true);
    assert.equal(CAROUSEL_MODAL_COMPONENTS.Carousel, Carousel);
    assert.equal(CAROUSEL_MODAL_COMPONENTS.Modal, Modal);
  });

  it("throws without register()", () => {
    assert.throws(() => registerCarouselModal(null), /register/);
    assert.throws(() => registerCarouselModal({}), /register/);
  });
});

describe("A5.6 slide structure helpers", () => {
  it("slideStructureSignature is order-sensitive", () => {
    assert.equal(
      slideStructureSignature([{ type: "Text" }, { type: "Tag" }]),
      "Text|Tag",
    );
    assert.notEqual(
      slideStructureSignature([{ type: "Tag" }, { type: "Text" }]),
      slideStructureSignature([{ type: "Text" }, { type: "Tag" }]),
    );
  });

  it("enforceSlideStructure drops mismatched slides", () => {
    const slides = [
      [{ type: "Text" }, { type: "Text" }],
      [{ type: "Text" }, { type: "Text" }],
      [{ type: "Text" }],
    ];
    const r = enforceSlideStructure(slides);
    assert.equal(r.ok, false);
    assert.equal(r.dropped, 1);
    assert.equal(r.slides.length, 2);
    assert.equal(r.signature, "Text|Text");
  });

  it("normalizeSlides accepts array-of-arrays and flat list", () => {
    assert.equal(normalizeSlides({ children: [[{ type: "A" }]] }).length, 1);
    assert.equal(normalizeSlides({ children: [{ type: "A" }, { type: "B" }] }).length, 2);
    assert.deepEqual(normalizeSlides({}), []);
  });

  it("prefersReducedMotion reads matchMedia", () => {
    const { document } = createTestDom();
    FakeDocument._reducedMotion = false;
    assert.equal(prefersReducedMotion(document), false);
    FakeDocument._reducedMotion = true;
    assert.equal(prefersReducedMotion(document), true);
    FakeDocument._reducedMotion = false;
  });
});

describe("A5.6 Carousel", () => {
  beforeEach(() => {
    FakeDocument._reducedMotion = false;
  });

  it("mounts with track, labelled prev/next, and status", () => {
    const { document } = createTestDom();
    const ctx = createRenderContext({
      document,
      registry: registryWithText(),
      renderChildren(parent, kids) {
        for (const k of kids) {
          if (typeof k === "string") parent.appendChild(document.createTextNode(k));
          else if (k?.type === "Text") {
            const s = document.createElement("span");
            s.textContent = (k.children ?? []).join("");
            parent.appendChild(s);
          }
        }
      },
    });
    const el = Carousel.create(
      {
        variant: "card",
        children: [
          [{ type: "Text", children: ["A"] }],
          [{ type: "Text", children: ["B"] }],
          [{ type: "Text", children: ["C"] }],
        ],
      },
      ctx,
    );
    assert.equal(el.getAttribute("data-canvas-component"), "Carousel");
    assert.equal(el.getAttribute("role"), "region");
    assert.equal(el.getAttribute("aria-roledescription"), "carousel");
    const prev = findByAttr(el, "aria-label", "Previous slide")[0];
    const next = findByAttr(el, "aria-label", "Next slide")[0];
    assert.ok(prev);
    assert.ok(next);
    const status = findByAttr(el, "role", "status")[0];
    assert.match(status.textContent, /Slide 1 of 3/);
    assert.equal(findByAttr(el, "data-canvas-carousel-slide", null).length, 3);
    assert.match(el.getAttribute("class") ?? "", /canvas-carousel--card/);
  });

  it("keyboard ArrowRight/Left move slide index", () => {
    const { document } = createTestDom();
    const ctx = { document, renderChildren() {} };
    const el = Carousel.create(
      {
        children: [
          [{ type: "Text", children: ["1"] }],
          [{ type: "Text", children: ["2"] }],
          [{ type: "Text", children: ["3"] }],
        ],
      },
      ctx,
    );
    const state = getCarouselState(el);
    assert.equal(state.index, 0);
    state.track.dispatchEvent({ type: "keydown", key: "ArrowRight" });
    assert.equal(state.index, 1);
    assert.match(state.status.textContent, /Slide 2 of 3/);
    state.track.dispatchEvent({ type: "keydown", key: "ArrowLeft" });
    assert.equal(state.index, 0);
    state.track.dispatchEvent({ type: "keydown", key: "End" });
    assert.equal(state.index, 2);
    state.track.dispatchEvent({ type: "keydown", key: "Home" });
    assert.equal(state.index, 0);
  });

  it("prev/next buttons navigate and disable at ends", () => {
    const { document } = createTestDom();
    const el = Carousel.create(
      {
        children: [
          [{ type: "Text", children: ["1"] }],
          [{ type: "Text", children: ["2"] }],
        ],
      },
      { document, renderChildren() {} },
    );
    const state = getCarouselState(el);
    assert.equal(state.prevBtn.hasAttribute("disabled"), true);
    state.nextBtn.dispatchEvent({ type: "click" });
    assert.equal(state.index, 1);
    assert.equal(state.nextBtn.hasAttribute("disabled"), true);
    state.prevBtn.dispatchEvent({ type: "click" });
    assert.equal(state.index, 0);
  });

  it("enforces structure and marks data-structure-error", () => {
    const { document } = createTestDom();
    const el = Carousel.create(
      {
        children: [
          [{ type: "Text" }, { type: "Text" }],
          [{ type: "Text" }, { type: "Text" }],
          [{ type: "Text" }],
        ],
      },
      { document, renderChildren() {} },
    );
    assert.equal(el.getAttribute("data-structure-error"), "true");
    assert.equal(el.getAttribute("data-structure-dropped"), "1");
    assert.equal(findByAttr(el, "data-canvas-carousel-slide", null).length, 2);
  });

  it("preserves index across keyed update that appends a slide", () => {
    const { document } = createTestDom();
    const ctx = { document, renderChildren() {} };
    const el = Carousel.create(
      {
        children: [
          [{ type: "Text", id: "a", children: ["A"] }],
          [{ type: "Text", id: "b", children: ["B"] }],
        ],
      },
      ctx,
    );
    const state = getCarouselState(el);
    state.track.dispatchEvent({ type: "keydown", key: "ArrowRight" });
    assert.equal(state.index, 1);
    Carousel.update(
      el,
      {
        children: [
          [{ type: "Text", id: "a", children: ["A"] }],
          [{ type: "Text", id: "b", children: ["B"] }],
          [{ type: "Text", id: "c", children: ["C"] }],
        ],
      },
      ctx,
    );
    assert.equal(getCarouselState(el).index, 1);
    assert.match(getCarouselState(el).status.textContent, /Slide 2 of 3/);
  });

  it("respects prefers-reduced-motion data attr", () => {
    const { document } = createTestDom();
    FakeDocument._reducedMotion = true;
    const el = Carousel.create(
      { children: [[{ type: "Text", children: ["x"] }]] },
      { document, renderChildren() {} },
    );
    assert.equal(el.getAttribute("data-reduced-motion"), "true");
    assert.match(el.getAttribute("class") ?? "", /reduced-motion/);
    FakeDocument._reducedMotion = false;
  });

  it("destroy removes listeners", () => {
    const { document } = createTestDom();
    const el = Carousel.create(
      { children: [[{ type: "Text", children: ["x"] }]] },
      { document, renderChildren() {} },
    );
    Carousel.destroy(el, { document });
    assert.equal(getCarouselState(el), null);
  });

  it("sunk variant class", () => {
    const { document } = createTestDom();
    const el = Carousel.create(
      { variant: "sunk", children: [[{ type: "Text", children: ["x"] }]] },
      { document, renderChildren() {} },
    );
    assert.equal(el.getAttribute("data-variant"), "sunk");
  });

  it("create throws without document", () => {
    assert.throws(() => Carousel.create({}, {}), /document required/);
  });
});

describe("A5.7 Modal helpers", () => {
  it("resolveOpen handles boolean and binding", () => {
    assert.equal(resolveOpen({ open: true }), true);
    assert.equal(resolveOpen({ open: false }), false);
    assert.equal(resolveOpen({}), false);
    assert.equal(resolveOpen({ open: { get: () => true } }), true);
    assert.equal(resolveOpen({ open: { value: true } }), true);
  });

  it("writeOpen updates binding and onOpenChange", () => {
    let v = true;
    let seen = null;
    writeOpen(
      {
        open: { get: () => v, set: (x) => { v = x; } },
        onOpenChange: (x) => { seen = x; },
      },
      false,
    );
    assert.equal(v, false);
    assert.equal(seen, false);
  });

  it("focusableElements finds buttons and tabindex", () => {
    const { document } = createTestDom();
    const root = document.createElement("div");
    const btn = document.createElement("button");
    const span = document.createElement("span");
    span.setAttribute("tabindex", "0");
    const hidden = document.createElement("button");
    hidden.setAttribute("hidden", "");
    root.appendChild(btn);
    root.appendChild(span);
    root.appendChild(hidden);
    const list = focusableElements(root);
    assert.equal(list.includes(btn), true);
    assert.equal(list.includes(span), true);
    assert.equal(list.includes(hidden), false);
  });
});

describe("A5.7 Modal", () => {
  it("mounts as dialog with accessible title, closed by default", () => {
    const { document } = createTestDom();
    const el = Modal.create(
      { title: "Hello", open: false, children: ["body"] },
      { document },
    );
    assert.equal(el.tagName, "DIALOG");
    assert.equal(el.getAttribute("role"), "dialog");
    assert.equal(el.getAttribute("aria-modal"), "true");
    assert.equal(el.getAttribute("data-open"), "false");
    assert.equal(el.open, false);
    const title = findByAttr(el, "class", "canvas-modal__title")[0];
    assert.equal(title.textContent, "Hello");
    assert.ok(el.getAttribute("aria-labelledby"));
  });

  it("opens with showModal, scroll lock, and initial focus", async () => {
    const { document } = createTestDom();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const el = Modal.create(
      { title: "Open me", open: true, size: "lg", children: ["hi"] },
      { document },
    );
    document.body.appendChild(el);
    assert.equal(el.open, true);
    assert.equal(el.getAttribute("data-open"), "true");
    assert.equal(el.getAttribute("data-size"), "lg");
    assert.equal(document.body.getAttribute("data-canvas-scroll-lock"), "1");
    await new Promise((r) => queueMicrotask(r));
    const state = getModalState(el);
    assert.ok(document.activeElement === state.closeBtn || document.activeElement === el);
  });

  it("Escape closes and restores focus to trigger", async () => {
    const { document } = createTestDom();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    let open = true;
    const binding = {
      get: () => open,
      set: (v) => { open = v; },
    };
    const el = Modal.create(
      { title: "Esc", open: binding, children: ["x"] },
      { document },
    );
    document.body.appendChild(el);
    assert.equal(el.open, true);
    el.dispatchEvent({ type: "keydown", key: "Escape" });
    assert.equal(open, false);
    assert.equal(el.open, false);
    await new Promise((r) => queueMicrotask(r));
    assert.equal(document.activeElement, trigger);
    assert.equal(document.body.getAttribute("data-canvas-scroll-lock"), null);
  });

  it("backdrop click closes", () => {
    const { document } = createTestDom();
    let open = true;
    const el = Modal.create(
      {
        title: "Backdrop",
        open: { get: () => open, set: (v) => { open = v; } },
        children: ["x"],
      },
      { document },
    );
    document.body.appendChild(el);
    el.dispatchEvent({ type: "click", target: el });
    assert.equal(open, false);
    assert.equal(el.open, false);
  });

  it("close button closes", () => {
    const { document } = createTestDom();
    let open = true;
    const el = Modal.create(
      {
        title: "X",
        open: { get: () => open, set: (v) => { open = v; } },
        children: ["x"],
      },
      { document },
    );
    const state = getModalState(el);
    state.closeBtn.dispatchEvent({ type: "click" });
    assert.equal(open, false);
  });

  it("Tab trap cycles focus", () => {
    const { document } = createTestDom();
    const el = Modal.create(
      { title: "Trap", open: true, children: ["x"] },
      { document },
    );
    document.body.appendChild(el);
    // Add a second focusable in body
    const extra = document.createElement("button");
    extra.textContent = "Action";
    getModalState(el).bodyEl.appendChild(extra);
    const focusables = focusableElements(el);
    assert.ok(focusables.length >= 2);
    const last = focusables[focusables.length - 1];
    last.focus();
    el.dispatchEvent({ type: "keydown", key: "Tab", shiftKey: false });
    assert.equal(document.activeElement, focusables[0]);
    focusables[0].focus();
    el.dispatchEvent({ type: "keydown", key: "Tab", shiftKey: true });
    assert.equal(document.activeElement, focusables[focusables.length - 1]);
  });

  it("stream update while open does not reset focus or close", async () => {
    const { document } = createTestDom();
    const ctx = {
      document,
      renderChildren(parent, kids) {
        // wipe+fill body content for this test path
        while (parent.firstChild) parent.removeChild(parent.firstChild);
        for (const k of kids) {
          const s = document.createElement("span");
          s.textContent = (k.children ?? []).join?.("") ?? String(k);
          parent.appendChild(s);
        }
      },
    };
    const el = Modal.create(
      {
        title: "Stream",
        open: true,
        children: [{ type: "Text", children: ["First"] }],
      },
      ctx,
    );
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));
    const focused = document.activeElement;
    const wasOpen = el.open;
    Modal.update(
      el,
      {
        title: "Stream",
        open: true,
        children: [
          { type: "Text", children: ["First"] },
          { type: "Text", children: ["Second"] },
        ],
      },
      ctx,
    );
    assert.equal(el.open, wasOpen);
    assert.equal(el.open, true);
    assert.equal(document.activeElement, focused);
    assert.equal(getModalState(el).bodyEl.childNodes.length, 2);
  });

  it("destroy while open unlocks scroll", () => {
    const { document } = createTestDom();
    const el = Modal.create(
      { title: "D", open: true, children: ["x"] },
      { document },
    );
    document.body.appendChild(el);
    assert.equal(document.body.getAttribute("data-canvas-scroll-lock"), "1");
    Modal.destroy(el, { document });
    assert.equal(getModalState(el), null);
    assert.equal(document.body.getAttribute("data-canvas-scroll-lock"), null);
  });

  it("invalid size falls back to md", () => {
    const { document } = createTestDom();
    const el = Modal.create(
      { title: "S", open: false, size: "huge", children: [] },
      { document },
    );
    assert.equal(el.getAttribute("data-size"), "md");
  });
});

describe("A5.6/A5.7 fixtures + CSS on disk", () => {
  it("fixture files exist", () => {
    assert.equal(existsSync(join(fixturesDir, "carousel.family.json")), true);
    assert.equal(existsSync(join(fixturesDir, "modal.family.json")), true);
    const c = loadFixture("carousel.family.json");
    assert.equal(c.root, "Carousel");
    const m = loadFixture("modal.family.json");
    assert.equal(m.root, "Modal");
  });

  it("CSS files use --canvas- tokens and scroll-snap / dialog", () => {
    const carousel = readFileSync(
      join(rootDir, "public/assets/css/components/carousel.css"),
      "utf8",
    );
    const modal = readFileSync(
      join(rootDir, "public/assets/css/components/modal.css"),
      "utf8",
    );
    assert.match(carousel, /scroll-snap-type/);
    assert.match(carousel, /--canvas-/);
    assert.match(carousel, /prefers-reduced-motion/);
    assert.match(modal, /\.canvas-modal/);
    assert.match(modal, /::backdrop/);
    assert.match(modal, /--canvas-surface-overlay/);
  });

  it("reconciler can mount Carousel by type", () => {
    const { document, root } = createTestDom();
    const registry = registryWithText();
    const ctx = createRenderContext({ document, registry });
    render(
      root,
      {
        type: "Carousel",
        id: "rc",
        props: {
          children: [
            [{ type: "Text", id: "a", children: ["A"] }],
            [{ type: "Text", id: "b", children: ["B"] }],
          ],
        },
      },
      ctx,
    );
    const el = root.childNodes[0];
    assert.equal(el.getAttribute("data-canvas-component"), "Carousel");
  });

  afterEach(() => {
    FakeDocument._reducedMotion = false;
  });
});

/**
 * A6.10 — Card blocks, composites, ImageGallery (miniDom).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import * as urlPolicy from "../../src/Browser/security/urlPolicy.js";

import {
  registerCards,
  CARD_COMPONENTS,
  SnippetCardBlock,
  OverviewCardBlock,
  ContextCardBlock,
  CompositeCardBlock,
  VisualCardBlock,
  ImageGallery,
  IconText,
  ImageText,
  Text,
  BoldText,
} from "../../src/Browser/components/cards/index.js";
import {
  enforceHomogeneousItems,
  getRowConfiguration,
  applyClickableCard,
  resolveBackgroundCssUrl,
  resolveSafeUrl,
  itemStructureSignature,
  unwrapItem,
  asText,
} from "../../src/Browser/components/cards/shared.js";
import {
  getRowConfiguration as layoutRows,
  normalizeLayoutProps,
  createCardBlock,
} from "../../src/Browser/components/cards/CardBlockLayout.js";
import { galleryLayoutClass, normalizeGalleryImages } from "../../src/Browser/components/cards/ImageGallery.js";
import { registerContent } from "../../src/Browser/components/content/registerContent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/components/card-blocks.family.json"), "utf8"),
);

function ctx(extra = {}) {
  const { document } = createTestDom();
  return { document, urlPolicy, ...extra };
}

function find(root, attr, value) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (value == null ? n.hasAttribute(attr) : n.getAttribute(attr) === value) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(root);
  return out;
}

describe("A6.10 shared helpers", () => {
  it("getRowConfiguration matches upstream small-card utils", () => {
    assert.deepEqual(getRowConfiguration(0, 3), []);
    assert.deepEqual(getRowConfiguration(1, 3), [1]);
    assert.deepEqual(getRowConfiguration(2, 2), [2]);
    assert.deepEqual(getRowConfiguration(3, 2), [2, 1]);
    assert.deepEqual(getRowConfiguration(3, 3), [3]);
    assert.deepEqual(getRowConfiguration(5, 3), [3, 2]);
    assert.deepEqual(getRowConfiguration(4, 3), [2, 2]);
    assert.deepEqual(layoutRows(7, 3), [3, 2, 2]);
  });

  it("enforceHomogeneousItems drops mixed signatures and fails below min", () => {
    const ok = enforceHomogeneousItems(
      [
        { lhs: { type: "IconText" }, rhs: { type: "Text" } },
        { lhs: { type: "IconText" }, rhs: { type: "Text" } },
      ],
      { slotKeys: ["lhs", "rhs"] },
    );
    assert.equal(ok.items.length, 2);
    assert.equal(ok.ok, true);

    const mixed = enforceHomogeneousItems(
      [
        { lhs: { type: "IconText" }, rhs: { type: "Text" } },
        { lhs: { type: "IconText" }, rhs: { type: "Text" } },
        { lhs: { type: "ImageText" } },
      ],
      { slotKeys: ["lhs", "rhs"] },
    );
    assert.equal(mixed.items.length, 2);
    assert.equal(mixed.dropped, 1);
    assert.equal(mixed.reason, "heterogeneous");

    const few = enforceHomogeneousItems([{ lhs: { type: "IconText" } }], {
      slotKeys: ["lhs", "rhs"],
      minItems: 2,
    });
    assert.equal(few.items.length, 0);
    assert.equal(few.reason, "below-min");
  });

  it("urlPolicy gates backgrounds and links", () => {
    const c = ctx();
    assert.match(resolveBackgroundCssUrl("https://cdn.example.com/a.jpg", c) ?? "", /url\(/);
    assert.equal(resolveBackgroundCssUrl("javascript:alert(1)", c), undefined);
    assert.equal(resolveSafeUrl("https://cdn.example.com/a.jpg", c), "https://cdn.example.com/a.jpg");
    assert.equal(resolveSafeUrl("javascript:alert(1)", c), undefined);
  });

  it("applyClickableCard sets role/button + keyboard", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    let hits = 0;
    const dispose = applyClickableCard(el, {
      clickable: true,
      onActivate: () => {
        hits += 1;
      },
    });
    assert.equal(el.getAttribute("role"), "button");
    assert.equal(el.getAttribute("tabindex"), "0");
    assert.equal(typeof /** @type {any} */ (el).__canvasCardClick, "function");
    el.dispatchEvent({ type: "click" });
    assert.equal(hits, 1);
    /** @type {any} */ (el).__canvasCardKey({ key: "Enter", preventDefault() {} });
    assert.equal(hits, 2);
    dispose();
    applyClickableCard(el, { clickable: false });
    assert.equal(el.getAttribute("role"), null);
  });

  it("unwrapItem / signatures / normalizeLayoutProps / asText", () => {
    assert.deepEqual(unwrapItem({ props: { a: 1 } }), { a: 1 });
    assert.equal(asText(3), "3");
    const sig = itemStructureSignature(
      { lhs: { type: "IconText" }, rhs: null },
      ["lhs", "rhs"],
    );
    assert.match(sig, /lhs:IconText/);
    assert.match(sig, /rhs:∅/);
    assert.equal(normalizeLayoutProps({ layout: "carousel", gap: 8 }).gap, "8px");
    assert.equal(normalizeLayoutProps({ layout: "grid" }).layout, "grid");
  });
});

describe("A6.10 registerCards", () => {
  it("registers all card + composite types", () => {
    const registry = createComponentRegistry();
    registerCards(registry);
    for (const name of Object.keys(CARD_COMPONENTS)) {
      assert.equal(registry.has(name), true, name);
    }
  });
});

describe("A6.10 composites", () => {
  it("IconText / ImageText / Text / BoldText mount", () => {
    const c = ctx();
    const icon = IconText.create({ icon: "star", title: "Star", subtitle: "fav" }, c);
    assert.equal(icon.getAttribute("data-canvas-component"), "IconText");
    assert.match(icon.getAttribute("class") ?? "", /canvas-icon-text/);

    const img = ImageText.create(
      { src: "https://cdn.example.com/a.png", title: "Pic", alt: "A" },
      c,
    );
    assert.equal(find(img, "src", "https://cdn.example.com/a.png").length, 1);

    const blocked = ImageText.create({ src: "javascript:x", title: "Bad" }, c);
    assert.equal(blocked.getAttribute("data-status"), "error");

    const t = Text.create({ text: "Hello" }, c);
    const b = BoldText.create({ text: "Bold" }, c);
    assert.equal(t.getAttribute("data-weight"), "normal");
    assert.equal(b.getAttribute("data-weight"), "bold");
  });
});

describe("A6.10 card block fixtures", () => {
  it("snippet-grid-homogeneous", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "snippet-grid-homogeneous");
    const el = SnippetCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-count"), "2");
    assert.equal(el.getAttribute("data-layout"), "grid");
    assert.equal(el.getAttribute("data-homogeneous"), "ok");
    assert.equal(find(el, "class", null).filter((n) => (n.getAttribute("class") || "").includes("canvas-value-card")).length >= 2, true);
  });

  it("snippet-heterogeneous-drop", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "snippet-heterogeneous-drop");
    const el = SnippetCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-dropped-items"), "1");
    assert.equal(Number(el.getAttribute("data-count")) >= 2, true);
  });

  it("overview-with-metric carousel + MetricIndicator", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "overview-with-metric");
    const el = OverviewCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-layout"), "carousel");
    assert.equal(el.getAttribute("data-count"), "2");
    // Bottom slot is the catalog's MetricIndicatorInline, stamped by name.
    assert.equal(find(el, "data-canvas-component", "MetricIndicatorInline").length, 2);
  });

  it("context-bg-url-policy uses safe backgrounds + markdown body", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "context-bg-url-policy");
    const el = ContextCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-count"), "2");
    const cards = find(el, "class", null).filter((n) =>
      (n.getAttribute("class") || "").includes("canvas-context-card"),
    );
    assert.equal(cards.length >= 2, true);
    const styles = cards.map((n) => n.getAttribute("style") || "");
    assert.equal(styles.some((s) => s.includes("background-image")), true);
    assert.equal(styles.every((s) => !/javascript:/i.test(s)), true);
  });

  it("visual-clickable keyboard operable", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "visual-clickable");
    let clicked = -1;
    const el = VisualCardBlock.create(
      {
        ...case_.props,
        onItemClick: (_item, index) => {
          clicked = index;
        },
      },
      c,
    );
    const cards = find(el, "role", "button");
    assert.equal(cards.length, 2);
    /** @type {any} */ (cards[1]).__canvasCardClick?.();
    assert.equal(clicked, 1);
  });

  it("composite-header-body-footer", () => {
    const c = ctx();
    registerContent(createComponentRegistry()); // ensure TagBlock available if renderChildren used
    const case_ = fixture.cases.find((x) => x.id === "composite-header-body-footer");
    const el = CompositeCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-count"), "2");
    assert.equal(find(el, "class", null).some((n) => (n.getAttribute("class") || "").includes("canvas-composite-card__footer")), true);
  });

  it("below-min-invalid", () => {
    const c = ctx();
    const case_ = fixture.cases.find((x) => x.id === "below-min-invalid");
    const el = SnippetCardBlock.create(case_.props, c);
    assert.equal(el.getAttribute("data-status"), "invalid");
    assert.equal(el.getAttribute("data-invalid-reason"), "below-min");
  });

  it("createCardBlock custom config works", () => {
    const Block = createCardBlock({
      componentName: "TestBlock",
      size: "small",
      cardType: "test",
      maxPerRow: 2,
      slotKeys: ["a"],
      normalizeItems: (p) => p.items || [],
      renderItem(cell, item) {
        cell.textContent = asText(item.a);
      },
    });
    const c = ctx();
    const el = Block.create({ items: [{ a: "1" }, { a: "2" }] }, c);
    assert.equal(el.getAttribute("data-canvas-component"), "TestBlock");
    assert.equal(el.getAttribute("data-count"), "2");
  });
});

describe("A6.10 ImageGallery", () => {
  it("layout class + show-all + blocks unsafe src", () => {
    assert.equal(galleryLayoutClass(1), "canvas-gallery--single");
    assert.equal(galleryLayoutClass(5), "canvas-gallery--default");
    const case_ = fixture.cases.find((x) => x.id === "gallery-five-plus");
    const images = normalizeGalleryImages(case_.props);
    assert.equal(images.length, 7);
    const c = ctx();
    const el = ImageGallery.create(case_.props, c);
    assert.equal(el.getAttribute("data-count"), "7");
    assert.equal(find(el, "class", null).some((n) => (n.getAttribute("class") || "").includes("canvas-gallery__show-all")), true);
    assert.equal(find(el, "data-blocked", "true").length >= 1, true);
  });
});

/**
 * A8 — Icon component + allowlist (≥90% line coverage on Icon.js / iconAllowlist.js).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  registerContent,
  CONTENT_COMPONENTS,
  Icon,
  resolveIconSize,
  resolveIconDecorative,
  humanizeIconName,
  resolveIconGlyph,
  isAllowlistedIcon,
  getFallbackIconName,
  toKebabIconCandidates,
  DEFAULT_FALLBACK_ICON,
  CATEGORY_FALLBACKS,
  ICON_GLYPHS,
} from "../../src/Browser/components/content/index.js";

function ctx() {
  const { document } = createTestDom();
  return { document };
}

function findSvg(el) {
  return (el.childNodes || []).find(
    (n) => n.nodeType === 1 && String(n.tagName).toLowerCase() === "svg",
  );
}

describe("Icon helpers", () => {
  it("resolveIconSize covers named, numeric, and default", () => {
    assert.equal(resolveIconSize(undefined), 14);
    assert.equal(resolveIconSize("md"), 14);
    assert.equal(resolveIconSize("sm"), 12);
    assert.equal(resolveIconSize("large"), 20);
    assert.equal(resolveIconSize("extra-small"), 12);
    assert.equal(resolveIconSize(24), 24);
    assert.equal(resolveIconSize("16"), 16);
    assert.equal(resolveIconSize(0), 14);
    assert.equal(resolveIconSize(-3), 14);
    assert.equal(resolveIconSize("nope"), 14);
  });

  it("resolveIconDecorative defaults true unless labelled", () => {
    assert.equal(resolveIconDecorative({}), true);
    assert.equal(resolveIconDecorative({ decorative: true }), true);
    assert.equal(resolveIconDecorative({ decorative: "true" }), true);
    assert.equal(resolveIconDecorative({ decorative: false }), false);
    assert.equal(resolveIconDecorative({ decorative: "false" }), false);
    assert.equal(resolveIconDecorative({ ariaLabel: "Save" }), false);
    assert.equal(resolveIconDecorative({ label: "Star" }), false);
    assert.equal(resolveIconDecorative({ title: "Rocket" }), false);
  });

  it("humanizeIconName", () => {
    assert.equal(humanizeIconName("circle-check"), "circle check");
    assert.equal(humanizeIconName("  user_minus "), "user minus");
    assert.equal(humanizeIconName(""), "");
  });
});

describe("iconAllowlist", () => {
  it("toKebabIconCandidates normalizes PascalCase", () => {
    assert.deepEqual(toKebabIconCandidates(""), []);
    assert.ok(toKebabIconCandidates("CircleCheck").includes("circle-check"));
    assert.ok(toKebabIconCandidates("UserMinus").includes("user-minus"));
  });

  it("getFallbackIconName uses category then default", () => {
    assert.equal(getFallbackIconName("finance"), "dollar-sign");
    assert.equal(getFallbackIconName("FINANCE"), "dollar-sign");
    assert.equal(getFallbackIconName("unknown"), DEFAULT_FALLBACK_ICON);
    assert.equal(getFallbackIconName(), DEFAULT_FALLBACK_ICON);
  });

  it("resolveIconGlyph exact, kebab, and category fallback", () => {
    const exact = resolveIconGlyph("star");
    assert.equal(exact.exact, true);
    assert.equal(exact.resolved, "star");
    assert.ok(exact.glyphs.length > 0);

    const kebab = resolveIconGlyph("CircleCheck");
    assert.equal(kebab.exact, true);
    assert.equal(kebab.resolved, "circle-check");

    const miss = resolveIconGlyph("not-a-real-icon", "finance");
    assert.equal(miss.exact, false);
    assert.equal(miss.resolved, "dollar-sign");

    const bare = resolveIconGlyph("not-a-real-icon");
    assert.equal(bare.resolved, DEFAULT_FALLBACK_ICON);
  });

  it("isAllowlistedIcon", () => {
    assert.equal(isAllowlistedIcon(""), false);
    assert.equal(isAllowlistedIcon("star"), true);
    assert.equal(isAllowlistedIcon("CircleCheck"), true);
    assert.equal(isAllowlistedIcon("zzzz"), false);
  });

  it("CATEGORY_FALLBACKS keys resolve to glyphs", () => {
    for (const [cat, name] of Object.entries(CATEGORY_FALLBACKS)) {
      assert.ok(ICON_GLYPHS[name], `${cat} → ${name}`);
    }
    assert.ok(ICON_GLYPHS[DEFAULT_FALLBACK_ICON]);
  });
});

describe("Icon component", () => {
  it("registers via registerContent", () => {
    const reg = createComponentRegistry();
    registerContent(reg);
    assert.ok(CONTENT_COMPONENTS.Icon);
    assert.equal(reg.has("Icon"), true);
    const { document } = createTestDom();
    const el = reg.render("Icon", { name: "star" }, { document });
    assert.equal(el.getAttribute("data-canvas-component"), "Icon");
    assert.equal(el.getAttribute("data-status"), "ready");
  });

  it("empty without name", () => {
    const c = ctx();
    const el = Icon.create({}, c);
    assert.equal(el.getAttribute("data-status"), "empty");
    assert.equal(el.getAttribute("aria-hidden"), "true");
    assert.equal(findSvg(el), undefined);
  });

  it("decorative default hides from a11y tree", () => {
    const c = ctx();
    const el = Icon.create({ name: "star", size: "sm" }, c);
    assert.equal(el.getAttribute("role"), "presentation");
    assert.equal(el.getAttribute("aria-hidden"), "true");
    assert.equal(el.getAttribute("data-size"), "12");
    assert.equal(el.getAttribute("data-exact"), "true");
    const svg = findSvg(el);
    assert.ok(svg);
    assert.equal(svg.getAttribute("width"), "12");
    assert.ok(svg.childNodes.length > 0);
  });

  it("labelled when decorative false", () => {
    const c = ctx();
    const el = Icon.create(
      { name: "circle-check", decorative: false, size: 18 },
      c,
    );
    assert.equal(el.getAttribute("role"), "img");
    assert.equal(el.getAttribute("aria-hidden"), null);
    assert.equal(el.getAttribute("aria-label"), "circle check");
    assert.equal(el.getAttribute("data-size"), "18");
  });

  it("prefers ariaLabel / label / title for labelled icons", () => {
    const c = ctx();
    const a = Icon.create(
      { name: "star", decorative: false, ariaLabel: "Favorite" },
      c,
    );
    assert.equal(a.getAttribute("aria-label"), "Favorite");
    Icon.update(a, { name: "star", decorative: false, label: "Star label" }, c);
    assert.equal(a.getAttribute("aria-label"), "Star label");
    Icon.update(a, { name: "star", decorative: false, title: "Star title" }, c);
    assert.equal(a.getAttribute("aria-label"), "Star title");
  });

  it("category fallback when name missing from allowlist", () => {
    const c = ctx();
    const el = Icon.create(
      { name: "totally-missing", category: "charts", size: "lg" },
      c,
    );
    assert.equal(el.getAttribute("data-exact"), "false");
    assert.equal(el.getAttribute("data-resolved"), "chart-line");
    assert.equal(el.getAttribute("data-category"), "charts");
    assert.equal(el.getAttribute("data-size"), "18");
  });

  it("update clears category attr when removed", () => {
    const c = ctx();
    const el = Icon.create({ name: "users", category: "people" }, c);
    assert.equal(el.getAttribute("data-category"), "people");
    Icon.update(el, { name: "users" }, c);
    assert.equal(el.getAttribute("data-category"), null);
    assert.equal(el.getAttribute("data-status"), "ready");
  });

  it("destroy is safe", () => {
    const c = ctx();
    const el = Icon.create({ name: "rocket" }, c);
    Icon.destroy(el, c);
  });
});

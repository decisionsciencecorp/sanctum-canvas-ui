/**
 * A5.1 — Stack + Card foundation layout components (miniDom).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import { render } from "../../src/Browser/renderer/reconciler.js";
import {
  isPartial,
  assertInteractive,
  PARTIAL_ATTR,
} from "../../src/Browser/renderer/partialGate.js";
import { registerFoundation } from "../../src/Browser/components/registerFoundation.js";
import { partitionCardChildren } from "../../src/Browser/components/layout/Card.js";
import { normalizeFlexProps } from "../../src/Browser/components/layout/flexProps.js";
import * as urlPolicy from "../../src/Browser/security/urlPolicy.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = join(rootDir, "tests/fixtures/components");

/** Text shell — string bodies ride vnode.children (reconciler owns text nodes). */
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

function foundationRegistry() {
  const registry = createComponentRegistry();
  registerFoundation(registry);
  registry.register("Text", textComponent());
  return registry;
}

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

describe("A5.1 flex prop normalization", () => {
  it("maps md gap alias and wrap+between → start", () => {
    assert.equal(normalizeFlexProps({ gap: "md" }).gap, "m");
    assert.equal(
      normalizeFlexProps({ wrap: true, justify: "between" }).justify,
      "start",
    );
    assert.equal(normalizeFlexProps({}).direction, "column");
  });
});

describe("A5.1 registerFoundation", () => {
  it("registers Stack, Card, CardContent, CardSources", () => {
    const registry = foundationRegistry();
    for (const t of ["Stack", "Card", "CardContent", "CardSources", "Sources"]) {
      assert.equal(registry.has(t), true, t);
    }
  });
});

describe("A5.1 Stack", () => {
  it("mounts with direction/gap/align/justify/wrap classes", () => {
    const { document, root } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Stack",
        key: "s",
        props: {
          direction: "row",
          gap: "l",
          align: "center",
          justify: "end",
          wrap: true,
        },
        children: [{ type: "Text", key: "t", children: ["hi"] }],
      },
      ctx,
    );

    const el = root.childNodes[0];
    assert.equal(el.getAttribute("data-canvas-component"), "Stack");
    assert.equal(el.getAttribute("data-direction"), "row");
    assert.equal(el.getAttribute("data-gap"), "l");
    assert.equal(el.getAttribute("data-align"), "center");
    assert.equal(el.getAttribute("data-justify"), "end");
    assert.equal(el.getAttribute("data-wrap"), "1");
    assert.match(el.getAttribute("class") ?? "", /canvas-stack--dir-row/);
    assert.match(el.getAttribute("class") ?? "", /canvas-stack--wrap/);
    assert.equal(el.childNodes.length, 1);
    assert.equal(el.childNodes[0].textContent, "hi");
  });

  it("updates props in place without remounting children", () => {
    const { document, root } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Stack",
        id: "s",
        props: { direction: "column", gap: "m" },
        children: [{ type: "Text", id: "t", children: ["a"] }],
      },
      ctx,
    );
    const stack = root.childNodes[0];
    const child = stack.childNodes[0];

    render(
      root,
      {
        type: "Stack",
        id: "s",
        props: { direction: "row", gap: "xl", align: "end" },
        children: [{ type: "Text", id: "t", children: ["a"] }],
      },
      ctx,
    );

    assert.equal(root.childNodes[0], stack);
    assert.equal(stack.childNodes[0], child);
    assert.equal(stack.getAttribute("data-direction"), "row");
    assert.equal(stack.getAttribute("data-gap"), "xl");
    assert.equal(stack.getAttribute("data-align"), "end");
  });

  it("stream-appends children by statement id", () => {
    const { document, root } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });
    const fixture = loadFixture("stack.family.json");
    const [chunk0, chunk1] = fixture.cases.find((c) => c.id === "stack-stream-append").chunks;

    render(root, chunk0, ctx);
    const stack = root.childNodes[0];
    assert.equal(stack.childNodes.length, 1);

    render(root, chunk1, ctx);
    assert.equal(root.childNodes[0], stack);
    assert.equal(stack.childNodes.length, 2);
    assert.equal(stack.childNodes[0].textContent, "First");
    assert.equal(stack.childNodes[1].textContent, "Second");
  });

  it("renderChildren via props.children on direct create", () => {
    const { document } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });
    const el = registry.resolve("Stack").create(
      {
        direction: "column",
        gap: "s",
        children: [{ type: "Text", key: "x", children: ["via-props"] }],
      },
      ctx,
    );
    assert.equal(el.childNodes.length, 1);
    assert.equal(el.childNodes[0].textContent, "via-props");
  });

  it("partial gate marks stack non-interactive + placeholder", () => {
    const { document } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });
    const el = registry.resolve("Stack").create({ partial: true }, ctx);
    assert.equal(isPartial(el), true);
    assert.equal(el.getAttribute(PARTIAL_ATTR), "1");
    assert.equal(assertInteractive(el), false);
    assert.ok(
      [...el.childNodes].some(
        (n) => n.nodeType === 1 && n.getAttribute("data-openui-partial-of") === "Stack",
      ),
    );
  });
});

describe("A5.1 Card", () => {
  it("mounts variant shell with content region", () => {
    const { document, root } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });

    render(
      root,
      {
        type: "Card",
        id: "c",
        props: { variant: "sunk" },
        children: [
          {
            type: "CardContent",
            id: "body",
            children: [{ type: "Text", id: "t", children: ["Body"] }],
          },
        ],
      },
      ctx,
    );

    const card = root.childNodes[0];
    assert.equal(card.getAttribute("data-canvas-component"), "Card");
    assert.equal(card.getAttribute("data-variant"), "sunk");
    assert.match(card.getAttribute("class") ?? "", /canvas-card--sunk/);
    const content = card.childNodes[0];
    assert.equal(content.getAttribute("data-canvas-region"), "content");
    assert.equal(content.childNodes[0].textContent, "Body");
  });

  it("partitionCardChildren wraps body and attaches sources", () => {
    const partitioned = partitionCardChildren(
      [{ type: "Text", key: "t", children: ["x"] }],
      {
        sources: [{ title: "A", url: "https://example.com/a" }],
      },
    );
    assert.equal(partitioned[0].type, "CardContent");
    assert.equal(partitioned[1].type, "CardSources");
    assert.equal(partitioned[1].props.sources.length, 1);
  });

  it("props.children path partitions into content + sources", () => {
    const { document } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry, urlPolicy });
    const el = registry.resolve("Card").create(
      {
        variant: "card",
        sources: [
          { title: "Docs", sourceName: "Docs", url: "https://example.com/docs" },
        ],
        children: [{ type: "Text", key: "t", children: ["Cited"] }],
      },
      ctx,
    );
    assert.equal(el.getAttribute("data-variant"), "card");
    const regions = [...el.childNodes].filter((n) => n.nodeType === 1);
    assert.ok(regions.some((n) => n.getAttribute("data-canvas-region") === "content"));
    const sources = regions.find((n) => n.getAttribute("data-canvas-region") === "source");
    assert.ok(sources);
    assert.equal(sources.getAttribute("data-source-count"), "1");
    assert.match(sources.textContent, /Docs/);
  });

  it("reconciler keeps the sources strip for Card(children, sources) in both vnode shapes", () => {
    // Chat-catalog shape: sources ride on the Card. The reconciler owns
    // vnode.children, so Card.partitionChildren must add the strip there too.
    const sources = [{ title: "Docs", sourceName: "Docs", url: "https://example.com/docs" }];
    const header = { type: "Text", id: "t", children: ["Cited"] };
    const shapes = {
      hostPath: {
        type: "Card",
        id: "c",
        props: { variant: "card", sources, children: [header] },
        children: [header],
      },
      vnodeOnly: {
        type: "Card",
        id: "c",
        props: { variant: "card", sources },
        children: [header],
      },
    };
    for (const [name, vnode] of Object.entries(shapes)) {
      const { document, root } = createTestDom();
      const registry = foundationRegistry();
      const ctx = createRenderContext({ document, registry, urlPolicy });
      render(root, vnode, ctx);
      const card = root.firstChild;
      const regions = [...card.childNodes].filter((n) => n.nodeType === 1);
      const strip = regions.find((n) => n.getAttribute("data-canvas-region") === "source");
      assert.ok(strip, `${name}: sources strip rendered`);
      assert.equal(strip.getAttribute("data-source-count"), "1", name);
      assert.match(strip.textContent, /Docs/, name);
      assert.ok(regions.some((n) => n.getAttribute("data-canvas-region") === "content"), name);
      // Re-render with the same vnode: strip must survive the update path too.
      render(root, vnode, ctx);
      const again = [...root.firstChild.childNodes].filter(
        (n) => n.nodeType === 1 && n.getAttribute("data-canvas-region") === "source",
      );
      assert.equal(again.length, 1, `${name}: exactly one strip after update`);
    }
  });

  it("stream append preserves card shell and content region identity", () => {
    const { document, root } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry, urlPolicy });
    const fixture = loadFixture("card.family.json");
    const [c0, c1] = fixture.cases.find((c) => c.id === "card-stream-regions").chunks;

    render(root, c0, ctx);
    const card = root.childNodes[0];
    const content = card.childNodes[0];
    assert.equal(content.childNodes.length, 1);

    render(root, c1, ctx);
    assert.equal(root.childNodes[0], card);
    assert.equal(card.childNodes[0], content);
    assert.equal(content.childNodes.length, 2);
    assert.equal(card.childNodes.length, 2);
    assert.equal(card.childNodes[1].getAttribute("data-canvas-region"), "source");
  });

  it("partial card blocks interaction", () => {
    const { document } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry });
    const el = registry.resolve("Card").create({ partial: true, variant: "clear" }, ctx);
    assert.equal(isPartial(el), true);
    assert.equal(assertInteractive(el), false);
    assert.equal(el.getAttribute("data-variant"), "clear");
  });

  it("CardSources rejects javascript: urls", () => {
    const { document } = createTestDom();
    const registry = foundationRegistry();
    const ctx = createRenderContext({ document, registry, urlPolicy });
    const el = registry.resolve("CardSources").create(
      {
        sources: [
          { title: "Bad", url: "javascript:alert(1)" },
          { title: "Good", url: "https://example.com/ok" },
        ],
      },
      ctx,
    );
    assert.equal(el.getAttribute("data-source-count"), "2");
    const items = [...el.childNodes].filter(
      (n) => n.nodeType === 1 && n.getAttribute("data-source-index") != null,
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].getAttribute("data-source-url"), null);
    assert.equal(items[1].getAttribute("data-source-url"), "https://example.com/ok");
    assert.match(el.textContent, /Good/);
    assert.equal(el.textContent.includes("javascript:"), false);
  });
});

describe("A5.1 fixtures on disk", () => {
  it("stack + card family fixtures exist", () => {
    const stack = loadFixture("stack.family.json");
    const card = loadFixture("card.family.json");
    assert.equal(stack.family, "Stack");
    assert.equal(card.family, "Card");
    assert.ok(stack.cases.length >= 3);
    assert.ok(card.cases.length >= 3);
  });
});

/**
 * The catalog the model is allowed to paint with is the OpenUI library,
 * not the six-name bootstrap. H21 is not a standing deferral.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLibrary } from "../../src/Browser/lang/contractLoader.js";
import { createParser } from "../../src/Browser/lang/parser.js";
import { libraryToJsonSchema } from "../../src/Browser/lang/librarySchema.js";
import { createTestDom } from "./helpers/miniDom.js";
import { MarkDownRenderer } from "../../src/Browser/components/content/MarkDownRenderer.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const components = join(root, "src/Browser/components");

function load(rel) {
  return validateLibrary(JSON.parse(readFileSync(join(root, rel), "utf8")));
}

describe("library manifests match the OpenUI paint vocabulary", () => {
  const dashboard = load("resources/libraries/dashboard/library.v1.json");
  const chat = load("resources/libraries/chat/library.v1.json");

  it("dashboard is the Stack library, chat is the Card library", () => {
    assert.equal(dashboard.root, "Stack");
    assert.equal(chat.root, "Card");
    assert.ok(dashboard.components.Stack);
    assert.ok(dashboard.components.Modal);
    assert.equal(chat.components.Stack, undefined);
    assert.equal(chat.components.Modal, undefined);
    assert.ok(chat.components.FollowUpBlock);
    assert.ok(chat.components.SectionBlock);
    assert.equal(dashboard.components.FollowUpBlock, undefined);
  });

  it("includes every visual family OpenUI taught the model, including markdown and chart data", () => {
    for (const name of [
      "Tabs",
      "Accordion",
      "Steps",
      "Carousel",
      "Table",
      "EditableTable",
      "PieChart",
      "Form",
      "Chips",
      "OptionCards",
      "SnippetCardBlock",
      "MarkDownRenderer",
      "Series",
      "Slice",
      "ScatterSeries",
      "Point",
      "Icon",
    ]) {
      assert.ok(dashboard.components[name] || chat.components[name], name);
    }
    assert.equal(Object.keys(dashboard.components).length, 82);
    assert.equal(Object.keys(chat.components).length, 84);
  });

  it("every contract names a renderer file that exists", () => {
    for (const lib of [dashboard, chat]) {
      for (const comp of Object.values(lib.components)) {
        assert.ok(comp.propertyOrder.length > 0, comp.name);
        assert.equal(comp.propertyOrder.length, Object.keys(comp.properties).length, comp.name);
        const path = join(components, comp.renderer);
        assert.equal(existsSync(path), true, `${comp.name} -> ${comp.renderer}`);
      }
    }
  });

  it("MarkDownRenderer paints allowlisted markdown, not raw HTML", () => {
    const { document } = createTestDom();
    const el = MarkDownRenderer.create(
      { textMarkdown: "Hello **there**" },
      { document },
    );
    function tags(node, acc = []) {
      if (node.tagName) acc.push(String(node.tagName).toLowerCase());
      for (const child of node.childNodes || []) tags(child, acc);
      return acc;
    }
    const found = tags(el);
    assert.ok(found.includes("strong"));
    assert.equal(found.includes("script"), false);
    assert.match(el.textContent || "", /there/);
  });

  it("the parser accepts a program that uses the catalog, not only the old six names", () => {
    const parser = createParser(libraryToJsonSchema(dashboard), "Stack");
    const result = parser.parse(
      's = Series("Revenue", [1, 2])\nchart = BarChart(["Mon", "Tue"], [s])\nmd = MarkDownRenderer("**hi**")\nroot = Stack([chart, md])\n',
    );
    const errs = result.meta?.errors || [];
    assert.equal(errs.length, 0);
    assert.equal(result.root.typeName, "Stack");
  });

  it("the public copies match the resources catalogs", () => {
    const pubDash = readFileSync(join(root, "public/assets/libraries/dashboard/library.v1.json"), "utf8");
    const pubChat = readFileSync(join(root, "public/assets/libraries/chat/library.v1.json"), "utf8");
    assert.equal(pubDash, readFileSync(join(root, "resources/libraries/dashboard/library.v1.json"), "utf8"));
    assert.equal(pubChat, readFileSync(join(root, "resources/libraries/chat/library.v1.json"), "utf8"));
  });
});

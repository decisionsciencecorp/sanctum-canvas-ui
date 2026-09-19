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

  it("component-typed props are $ref / anyOf, not opaque objects (Zod unions resolved)", () => {
    // z.union([Input.ref, TextArea.ref, …])
    const input = dashboard.components.FormControl.properties.input;
    assert.ok(Array.isArray(input.anyOf), "FormControl.input is a union");
    assert.deepEqual(
      input.anyOf.map((o) => o.$ref),
      ["Input", "TextArea", "Select", "DatePicker", "Slider", "CheckBoxGroup", "RadioGroup", "Chips", "OptionCards"],
    );
    // z.optional(Icon.ref) — wrapper form, must not be required
    assert.deepEqual(dashboard.components.Tag.properties.icon, { $ref: "Icon" });
    assert.equal(dashboard.components.Tag.required.includes("icon"), false);
    // z.union([IconText.ref, ImageText.ref, Text.ref])
    assert.deepEqual(
      dashboard.components.OverviewCardItem.properties.top.anyOf.map((o) => o.$ref),
      ["IconText", "ImageText", "Text"],
    );
    // z.union([z.string(), Tag.ref])
    assert.deepEqual(dashboard.components.ContextCardItem.properties.title.anyOf, [
      { type: "string" },
      { $ref: "Tag" },
    ]);
    // z.array(SeriesSchema) where Series is a library component: object or Series(...)
    assert.deepEqual(dashboard.components.BarChart.properties.series.items, {
      anyOf: [{ type: "object" }, { $ref: "Series" }],
    });
  });

  it("container child lists follow the upstream unions, not a wildcard", () => {
    const chatCard = chat.components.Card.allowedChildren;
    for (const n of ["FollowUpBlock", "SectionBlock", "ListBlock", "Tabs", "Carousel", "EditableTable"]) {
      assert.ok(chatCard.includes(n), `chat Card allows ${n}`);
    }
    assert.equal(chatCard.includes("Stack"), false, "chat Card has no Stack");
    assert.ok(dashboard.components.Card.allowedChildren.includes("Stack"));
    assert.equal(dashboard.components.Card.allowedChildren.includes("FollowUpBlock"), false);
    // Nested chat containers cannot hold SectionBlock (ChatNestedContentUnion filter)
    assert.equal(chat.components.TabItem.allowedChildren.includes("SectionBlock"), false);
    assert.ok(chat.components.TabItem.allowedChildren.includes("Accordion"));
    // Stack.children is z.array(z.any()) → any registered component
    assert.deepEqual(dashboard.components.Stack.allowedChildren, ["*"]);
  });

  it("the parser accepts component values in union slots (form fields, KPI tops, chart series)", () => {
    const parser = createParser(libraryToJsonSchema(dashboard), "Stack");
    const result = parser.parse(
      [
        'trays = FormControl("Trays", Input("trays", "30", "number"))',
        'reorder = Form("reorder", Buttons([Button("Go", Action([@Run("reorder_supplies")]))]), [trays])',
        'kpi = OverviewCardBlock([OverviewCardItem("sales", Text("text", "Sales"), MetricIndicatorInline("$18,420", "vs last week", { direction: "up", value: 12 }))])',
        'chart = LineChart(["Mon", "Tue"], [Series("This week", [1, 2]), Series("Last week", [2, 1])])',
        'tag = TagBlock(["Inventory", "Act today"])',
        "root = Stack([reorder, kpi, chart, tag])",
        "",
      ].join("\n"),
    );
    assert.deepEqual(result.meta?.errors || [], []);
    assert.equal(result.root.typeName, "Stack");
  });

  it("the public copies match the resources catalogs", () => {
    const pubDash = readFileSync(join(root, "public/assets/libraries/dashboard/library.v1.json"), "utf8");
    const pubChat = readFileSync(join(root, "public/assets/libraries/chat/library.v1.json"), "utf8");
    assert.equal(pubDash, readFileSync(join(root, "resources/libraries/dashboard/library.v1.json"), "utf8"));
    assert.equal(pubChat, readFileSync(join(root, "resources/libraries/chat/library.v1.json"), "utf8"));
  });
});

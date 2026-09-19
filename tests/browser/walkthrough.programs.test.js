/**
 * The walkthrough's "what the model writes" panel shows real programs.
 * Every snippet must parse cleanly against the catalog the model is given —
 * dashboard by default, chat for the two chat-only shapes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLibrary } from "../../src/Browser/lang/contractLoader.js";
import { createParser } from "../../src/Browser/lang/parser.js";
import { libraryToJsonSchema } from "../../src/Browser/lang/librarySchema.js";
import { PROGRAM, CHAT_ONLY_PROGRAMS, DASHBOARD_PROGRAM, STEPS } from "../../public/lab/walkthrough-script.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function load(rel) {
  return validateLibrary(JSON.parse(readFileSync(join(root, rel), "utf8")));
}

const dashboard = load("resources/libraries/dashboard/library.v1.json");
const chat = load("resources/libraries/chat/library.v1.json");
const parseDash = createParser(libraryToJsonSchema(dashboard), "Stack");
const parseChat = createParser(libraryToJsonSchema(chat), "Card");

function errorsOf(result) {
  return (result.meta?.errors || []).map((e) => `${e.code}: ${e.message}`);
}

describe("walkthrough programs are real catalog programs", () => {
  for (const [key, source] of Object.entries(PROGRAM)) {
    if (key === "tool") continue; // host-event commentary, not a program
    it(`PROGRAM.${key} parses against the ${CHAT_ONLY_PROGRAMS.has(key) ? "chat" : "dashboard"} catalog`, () => {
      const parser = CHAT_ONLY_PROGRAMS.has(key) ? parseChat : parseDash;
      const result = parser.parse(source + "\n");
      assert.deepEqual(errorsOf(result), [], key);
    });
  }

  it("the whole dashboard reply parses as one Stack with every block", () => {
    const result = parseDash.parse(DASHBOARD_PROGRAM + "\n");
    assert.deepEqual(errorsOf(result), []);
    assert.equal(result.root?.typeName, "Stack");
    assert.equal(result.meta?.unresolved?.length ?? 0, 0, "no dangling identifiers");
    const kids = result.root.props.children;
    assert.equal(kids.length, 12);
    assert.deepEqual(
      kids.map((k) => k.typeName),
      ["InlineHeader", "TextContent", "OverviewCardBlock", "Tabs", "Table", "Callout", "TagBlock", "Form", "Steps", "Accordion", "Carousel", "Modal"],
    );
  });

  it("chat-only snippets are the ones the dashboard catalog really lacks", () => {
    for (const key of CHAT_ONLY_PROGRAMS) {
      assert.ok(PROGRAM[key], key);
    }
    assert.equal(dashboard.components.FollowUpBlock, undefined);
    assert.ok(chat.components.FollowUpBlock);
    assert.equal(dashboard.components.Card.propertyOrder.includes("sources"), false);
    assert.ok(chat.components.Card.propertyOrder.includes("sources"));
  });

  it("every component name the narration chips claim is a catalog name or a host event view", () => {
    const hostViews = new Set(["ToolActivity", "RunStatus", "Submit"]);
    for (const step of STEPS) {
      for (const name of step.components || []) {
        assert.ok(
          dashboard.components[name] || chat.components[name] || hostViews.has(name),
          `${step.id}: ${name}`,
        );
      }
    }
  });

  it("steps that point elsewhere link to pages that exist", () => {
    const known = new Set([
      "/lab/catalog.html",
      "/lab/a5-foundation.html",
      "/lab/a6-library.html",
      "/lab/a5-stack-card.html",
      "/lab/a5-carousel-modal.html",
      "/stream.php",
      "/index.php",
    ]);
    for (const step of STEPS) {
      for (const link of step.links || []) {
        assert.ok(known.has(link.href), `${step.id}: ${link.href}`);
        assert.ok(link.label);
      }
    }
    assert.ok(STEPS.some((s) => (s.links || []).some((l) => l.href === "/lab/catalog.html")));
  });
});

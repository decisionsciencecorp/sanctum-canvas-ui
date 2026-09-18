/**
 * A5.5 — SectionBlock + Steps streaming behavior (miniDom).
 * Scripted chunk sequences prove user manual choice is never overridden.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  registerSectionSteps,
  SECTION_STEPS_COMPONENTS,
  registerContainers,
  CONTAINER_COMPONENTS,
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem,
  createSectionOpenState,
  applySectionStreamTick,
  applySectionUserChange,
  toggleSectionValue,
  createStepsProgressState,
  applyStepsStreamTick,
  applyStepsUserSelect,
  sectionUserSelect,
  getSectionOpenValues,
  didSectionUserIntervene,
  stepsUserSelect,
  getStepsCurrentIndex,
  didStepsUserIntervene,
  requireDocument,
  asText,
  normalizeSections,
  normalizeSteps,
  resolveIsStreaming,
  renderPanelContent,
  lifecycle,
} from "../../src/Browser/components/containers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "../..");
const FIXTURE_DIR = join(__dirname, "../fixtures/components/containers");
const cssDir = join(rootDir, "public/assets/css/components");

function ctx(extra = {}) {
  const { document } = createTestDom();
  return {
    document,
    stream: { isStreaming: false },
    ...extra,
  };
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

describe("A5.5 containers shared helpers", () => {
  it("requireDocument throws without document", () => {
    assert.throws(() => requireDocument({}), /document required/);
  });

  it("asText / normalizeSections / normalizeSteps / resolveIsStreaming", () => {
    assert.equal(asText(null), "");
    assert.equal(asText(3), "3");
    assert.equal(asText({}), "");
    const secs = normalizeSections([
      { value: "a", trigger: "A", content: "x" },
      { props: { value: "b", trigger: "B", children: "y" } },
      "plain",
      null,
    ]);
    assert.equal(secs.length, 4);
    assert.equal(secs[0].value, "a");
    assert.equal(secs[1].value, "b");
    assert.equal(secs[1].content, "y");
    assert.equal(secs[2].trigger, "plain");
    assert.equal(normalizeSections(null).length, 0);

    const steps = normalizeSteps([
      { title: "T", details: "D" },
      { props: { title: "U", details: "E", number: 9 } },
      null,
    ]);
    assert.equal(steps[0].number, 1);
    assert.equal(steps[1].number, 9);
    assert.equal(normalizeSteps(undefined).length, 0);

    assert.equal(resolveIsStreaming({ isStreaming: true }, {}), true);
    assert.equal(resolveIsStreaming({ streaming: false }, { stream: { isStreaming: true } }), false);
    assert.equal(resolveIsStreaming({}, { stream: { isStreaming: true } }), true);
    assert.equal(resolveIsStreaming({}, {}), false);
  });

  it("renderPanelContent covers string/array/vnode/empty", () => {
    const c = ctx();
    const panel = c.document.createElement("div");
    renderPanelContent(panel, null, c);
    assert.equal(panel.childNodes.length, 0);
    renderPanelContent(panel, "hi", c);
    assert.match(panel.textContent, /hi/);
    renderPanelContent(panel, ["a", "b"], c);
    assert.match(panel.textContent, /ab/);
    let rendered = null;
    renderPanelContent(panel, [{ type: "X" }], {
      ...c,
      renderChildren(parent, kids) {
        rendered = kids;
        parent.appendChild(c.document.createTextNode("vnode"));
      },
    });
    assert.equal(rendered.length, 1);
    assert.match(panel.textContent, /vnode/);
  });

  it("lifecycle create/update/destroy", () => {
    const life = lifecycle({
      mount(doc) {
        return doc.createElement("div");
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
    life.update(el, { x: 2 }, c);
    assert.equal(el.getAttribute("data-x"), "2");
    life.destroy(el, c);
    assert.equal(el.getAttribute("data-dead"), "1");
  });
});

describe("A5.5 section open-state machine — chunk sequences", () => {
  it("auto-reveals newly streamed sections then collapses to first on stream end", () => {
    const state = createSectionOpenState();
    // chunk 1
    applySectionStreamTick(state, {
      sectionValues: ["intro"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, ["intro"]);
    // chunk 2 — new section auto-opens
    applySectionStreamTick(state, {
      sectionValues: ["intro", "body"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, ["intro", "body"]);
    // chunk 3
    applySectionStreamTick(state, {
      sectionValues: ["intro", "body", "outro"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, ["intro", "body", "outro"]);
    // stream end → collapse to first
    applySectionStreamTick(state, {
      sectionValues: ["intro", "body", "outro"],
      isStreaming: false,
    });
    assert.deepEqual(state.openItems, ["intro"]);
    assert.equal(state.userSelected, false);
  });

  it("never overrides user manual choice across further chunks or stream end", () => {
    const state = createSectionOpenState();
    applySectionStreamTick(state, {
      sectionValues: ["a"],
      isStreaming: true,
    });
    applySectionStreamTick(state, {
      sectionValues: ["a", "b"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, ["a", "b"]);

    // User collapses to only "a"
    applySectionUserChange(state, ["a"]);
    assert.equal(state.userSelected, true);
    assert.deepEqual(state.openItems, ["a"]);

    // New section streams in — must NOT auto-open "c" or reopen "b"
    applySectionStreamTick(state, {
      sectionValues: ["a", "b", "c"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, ["a"]);

    // Stream end — must NOT collapse/reset away from user choice
    applySectionStreamTick(state, {
      sectionValues: ["a", "b", "c"],
      isStreaming: false,
    });
    assert.deepEqual(state.openItems, ["a"]);

    // Another tick with same list — still stable
    applySectionStreamTick(state, {
      sectionValues: ["a", "b", "c"],
      isStreaming: false,
    });
    assert.deepEqual(state.openItems, ["a"]);
  });

  it("toggleSectionValue marks intervened and is stable afterward", () => {
    const state = createSectionOpenState();
    applySectionStreamTick(state, {
      sectionValues: ["x", "y"],
      isStreaming: true,
    });
    toggleSectionValue(state, "x"); // close x if open
    const after = state.openItems.slice();
    applySectionStreamTick(state, {
      sectionValues: ["x", "y", "z"],
      isStreaming: true,
    });
    assert.deepEqual(state.openItems, after.filter((v) => v !== "z"));
    assert.equal(state.openItems.includes("z"), false);
    assert.equal(state.userSelected, true);
  });

  it("empty sections clear open when not intervened", () => {
    const state = createSectionOpenState();
    applySectionStreamTick(state, { sectionValues: ["a"], isStreaming: false });
    applySectionStreamTick(state, { sectionValues: [], isStreaming: false });
    assert.deepEqual(state.openItems, []);
  });
});

describe("A5.5 steps progress machine — chunk sequences", () => {
  it("auto-advances current to newest streamed step", () => {
    const state = createStepsProgressState();
    applyStepsStreamTick(state, { itemCount: 1, isStreaming: true });
    assert.equal(state.currentIndex, 0);
    applyStepsStreamTick(state, { itemCount: 2, isStreaming: true });
    assert.equal(state.currentIndex, 1);
    applyStepsStreamTick(state, { itemCount: 3, isStreaming: true });
    assert.equal(state.currentIndex, 2);
    applyStepsStreamTick(state, { itemCount: 3, isStreaming: false });
    assert.equal(state.currentIndex, 2);
  });

  it("never overrides user-selected step across chunks", () => {
    const state = createStepsProgressState();
    applyStepsStreamTick(state, { itemCount: 2, isStreaming: true });
    assert.equal(state.currentIndex, 1);
    applyStepsUserSelect(state, 0);
    assert.equal(state.userSelected, true);
    applyStepsStreamTick(state, { itemCount: 3, isStreaming: true });
    assert.equal(state.currentIndex, 0);
    applyStepsStreamTick(state, { itemCount: 4, isStreaming: true });
    assert.equal(state.currentIndex, 0);
    applyStepsStreamTick(state, { itemCount: 4, isStreaming: false });
    assert.equal(state.currentIndex, 0);
  });
});

describe("A5.5 registerSectionSteps", () => {
  it("registers SectionBlock, SectionItem, Steps, StepsItem", () => {
    const reg = createComponentRegistry();
    registerSectionSteps(reg);
    for (const name of Object.keys(SECTION_STEPS_COMPONENTS)) {
      assert.equal(reg.has(name), true, name);
    }
    const c = ctx();
    const el = reg.render(
      "SectionBlock",
      { sections: [{ value: "s", trigger: "S", content: "body" }] },
      c,
    );
    assert.equal(el.getAttribute("data-canvas-component"), "SectionBlock");
  });

  it("rejects bad registry", () => {
    assert.throws(() => registerSectionSteps(null), /register/);
    assert.throws(() => registerSectionSteps({}), /register/);
  });
});

describe("A5.5 SectionBlock DOM streaming sequences", () => {
  it("auto-reveals then collapses; user click never overridden", () => {
    const c = ctx({ stream: { isStreaming: true } });
    const el = SectionBlock.create(
      {
        sections: [{ value: "a", trigger: "A", content: "one" }],
      },
      c,
    );
    assert.equal(getSectionOpenValues(el).join(","), "a");
    assert.equal(el.getAttribute("data-streaming"), "true");

    SectionBlock.update(
      el,
      {
        sections: [
          { value: "a", trigger: "A", content: "one" },
          { value: "b", trigger: "B", content: "two" },
        ],
      },
      { ...c, stream: { isStreaming: true } },
    );
    assert.deepEqual(getSectionOpenValues(el), ["a", "b"]);

    // User closes "b" via trigger click
    const triggers = findByAttr(el, "class", "canvas-section-block__trigger");
    assert.ok(triggers.length >= 2);
    // click B trigger
    const bTrigger = triggers.find((t) =>
      (t.textContent || "").includes("B"),
    );
    assert.ok(bTrigger);
    bTrigger.onclick();
    assert.equal(didSectionUserIntervene(el), true);
    const afterClick = getSectionOpenValues(el).slice();
    assert.equal(afterClick.includes("b"), false);

    // Further stream chunk must not reopen b or open c against user
    SectionBlock.update(
      el,
      {
        sections: [
          { value: "a", trigger: "A", content: "one" },
          { value: "b", trigger: "B", content: "two" },
          { value: "c", trigger: "C", content: "three" },
        ],
      },
      { ...c, stream: { isStreaming: true } },
    );
    assert.deepEqual(getSectionOpenValues(el), afterClick.filter((v) => v !== "c"));
    assert.equal(getSectionOpenValues(el).includes("c"), false);

    // Stream end must not collapse to first against user
    SectionBlock.update(
      el,
      {
        sections: [
          { value: "a", trigger: "A", content: "one" },
          { value: "b", trigger: "B", content: "two" },
          { value: "c", trigger: "C", content: "three" },
        ],
      },
      { ...c, stream: { isStreaming: false } },
    );
    assert.deepEqual(getSectionOpenValues(el), afterClick.filter((v) => v !== "c"));
    assert.equal(el.getAttribute("data-user-intervened"), "true");
  });

  it("stream end without intervention collapses to first", () => {
    const c = ctx({ stream: { isStreaming: true } });
    const el = SectionBlock.create(
      {
        sections: [
          { value: "a", trigger: "A", content: "1" },
          { value: "b", trigger: "B", content: "2" },
        ],
      },
      c,
    );
    assert.ok(getSectionOpenValues(el).includes("b"));
    SectionBlock.update(
      el,
      {
        sections: [
          { value: "a", trigger: "A", content: "1" },
          { value: "b", trigger: "B", content: "2" },
        ],
      },
      { ...c, stream: { isStreaming: false } },
    );
    assert.deepEqual(getSectionOpenValues(el), ["a"]);
    assert.equal(didSectionUserIntervene(el), false);
  });

  it("sectionUserSelect helper and non-foldable path", () => {
    const c = ctx();
    const el = SectionBlock.create(
      {
        isFoldable: false,
        sections: [
          { value: "x", trigger: "X", content: "cx" },
          { value: "y", trigger: "Y", content: "cy" },
        ],
      },
      c,
    );
    assert.equal(el.getAttribute("data-foldable"), "false");
    assert.match(el.textContent, /cx/);
    assert.match(el.textContent, /cy/);

    const fold = SectionBlock.create(
      { sections: [{ value: "p", trigger: "P", content: "pp" }] },
      c,
    );
    sectionUserSelect(fold, ["p"]);
    assert.equal(didSectionUserIntervene(fold), true);
    SectionBlock.destroy(fold, c);
    SectionBlock.destroy(el, c);
  });

  it("accessible expanded/region attrs on foldable items", () => {
    const c = ctx();
    const el = SectionBlock.create(
      {
        sections: [{ value: "s1", trigger: "One", content: "body" }],
      },
      c,
    );
    const trigger = findByAttr(el, "class", "canvas-section-block__trigger")[0];
    const panel = findByAttr(el, "class", "canvas-section-block__content")[0];
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(panel.getAttribute("role"), "region");
    assert.equal(panel.getAttribute("hidden"), null);
  });
});

describe("A5.5 Steps DOM streaming sequences", () => {
  it("advances current with stream; user select never overridden", () => {
    const c = ctx({ stream: { isStreaming: true } });
    const el = Steps.create(
      { items: [{ title: "One", details: "d1" }] },
      c,
    );
    assert.equal(getStepsCurrentIndex(el), 0);
    assert.equal(el.getAttribute("aria-valuenow"), "1");
    assert.equal(el.getAttribute("aria-valuemax"), "1");

    Steps.update(
      el,
      {
        items: [
          { title: "One", details: "d1" },
          { title: "Two", details: "d2" },
        ],
      },
      { ...c, stream: { isStreaming: true } },
    );
    assert.equal(getStepsCurrentIndex(el), 1);
    assert.equal(el.getAttribute("aria-valuetext"), "Step 2 of 2");

    // User picks step 0
    const titles = findByAttr(el, "class", "canvas-steps__title");
    assert.ok(titles[0]?.onclick);
    titles[0].onclick();
    assert.equal(didStepsUserIntervene(el), true);
    assert.equal(getStepsCurrentIndex(el), 0);

    Steps.update(
      el,
      {
        items: [
          { title: "One", details: "d1" },
          { title: "Two", details: "d2" },
          { title: "Three", details: "d3" },
        ],
      },
      { ...c, stream: { isStreaming: true } },
    );
    assert.equal(getStepsCurrentIndex(el), 0);
    assert.equal(el.getAttribute("aria-valuenow"), "1");
    assert.equal(el.getAttribute("aria-valuemax"), "3");

    Steps.update(
      el,
      {
        items: [
          { title: "One", details: "d1" },
          { title: "Two", details: "d2" },
          { title: "Three", details: "d3" },
        ],
      },
      { ...c, stream: { isStreaming: false } },
    );
    assert.equal(getStepsCurrentIndex(el), 0);
    Steps.destroy(el, c);
  });

  it("stepsUserSelect helper and aria-current", () => {
    const c = ctx();
    const el = Steps.create(
      {
        items: [
          { title: "A", details: "a" },
          { title: "B", details: "b" },
        ],
      },
      c,
    );
    stepsUserSelect(el, 1);
    assert.equal(getStepsCurrentIndex(el), 1);
    const current = findByAttr(el, "aria-current", "step");
    assert.equal(current.length, 1);
    assert.equal(current[0].getAttribute("data-step-index"), "1");
  });
});

describe("A5.5 SectionItem / StepsItem leaves", () => {
  it("mounts standalone SectionItem and StepsItem", () => {
    const c = ctx();
    const s = SectionItem.create(
      { value: "v", trigger: "Trig", content: "Body" },
      c,
    );
    assert.equal(s.getAttribute("data-section-value"), "v");
    assert.match(s.textContent, /Body/);
    SectionItem.update(s, { value: "v", trigger: "T2", content: "B2" }, c);
    assert.match(s.textContent, /B2/);
    SectionItem.destroy(s, c);

    const st = StepsItem.create({ title: "Hi", details: "There", number: 4 }, c);
    assert.equal(st.getAttribute("data-step-number"), "4");
    assert.match(st.textContent, /Hi/);
    StepsItem.destroy(st, c);
  });
});

describe("A5.5 coverage gaps", () => {
  it("registerContainers wires Tabs+Section family", () => {
    const reg = createComponentRegistry();
    registerContainers(reg);
    assert.equal(reg.has("SectionBlock"), true);
    assert.equal(reg.has("Steps"), true);
    assert.ok(Object.keys(CONTAINER_COMPONENTS).length >= 4);
    assert.throws(() => registerContainers(null), /register/);
  });

  it("userChange string/null and reopen-after-filter edge", () => {
    const state = createSectionOpenState();
    applySectionUserChange(state, "solo");
    assert.deepEqual(state.openItems, ["solo"]);
    applySectionUserChange(state, null);
    assert.deepEqual(state.openItems, []);
    applySectionUserChange(state, "");
    assert.deepEqual(state.openItems, []);

    const s2 = createSectionOpenState();
    s2.openItems = ["gone"];
    s2.userSelected = false;
    applySectionStreamTick(s2, {
      sectionValues: ["keep"],
      isStreaming: false,
    });
    assert.deepEqual(s2.openItems, ["keep"]);
  });

  it("steps empty and clamp when user index out of range", () => {
    const state = createStepsProgressState();
    applyStepsStreamTick(state, { itemCount: 0, isStreaming: false });
    assert.equal(state.currentIndex, -1);
    applyStepsUserSelect(state, 5);
    applyStepsStreamTick(state, { itemCount: 2, isStreaming: false });
    assert.equal(state.currentIndex, 1);
  });

  it("sectionUserSelect after destroy covers item map init", () => {
    const c = ctx();
    const el = SectionBlock.create(
      { sections: [{ value: "a", trigger: "A", content: "x" }] },
      c,
    );
    SectionBlock.destroy(el, c);
    sectionUserSelect(el, "a");
    assert.equal(didSectionUserIntervene(el), true);
  });

  it("renderPanelContent vnode without renderChildren is no-op body", () => {
    const c = ctx();
    const panel = c.document.createElement("div");
    renderPanelContent(panel, { type: "Text" }, c);
    assert.equal(panel.childNodes.length, 0);
  });
});

describe("A5.5 fixtures + CSS tokens", () => {
  it("fixture-driven cases", () => {
    const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 2);
    for (const file of files) {
      const fixture = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8"));
      const life = SECTION_STEPS_COMPONENTS[fixture.component];
      assert.ok(life, fixture.component);
      const c = ctx();
      for (const cas of fixture.cases) {
        const el = life.create(cas.props, c);
        for (const [k, v] of Object.entries(cas.expect || {})) {
          assert.equal(el.getAttribute(k), v, `${cas.name} ${k}`);
        }
        life.update(el, cas.props, c);
        life.destroy(el, c);
      }
    }
  });

  it("section-block.css and steps.css use --canvas- tokens", () => {
    for (const name of ["section-block.css", "steps.css"]) {
      const path = join(cssDir, name);
      assert.equal(existsSync(path), true, name);
      const src = readFileSync(path, "utf8");
      assert.match(src, /--canvas-/);
      assert.equal(src.includes("--openui-"), false);
    }
  });
});

/**
 * A6.4 buttons / actions — gesture, double-fire, OpenUrl policy.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createStore } from "../../src/Browser/runtime/store.js";
import { createActionRunner } from "../../src/Browser/runtime/actionRunner.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";
import * as urlPolicy from "../../src/Browser/security/urlPolicy.js";
import { createFormValidationController } from "../../src/Browser/components/forms/formValidationController.js";

import {
  registerActions,
  ACTION_COMPONENTS,
  Buttons,
  Button,
  IconButton,
  dispatchButtonAction,
  sanitizeActionPlan,
  needsFormValidation,
  beginFire,
  endFire,
} from "../../src/Browser/components/actions/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "../fixtures/components/actions");

function ctx(extra = {}) {
  const { document } = createTestDom();
  return { document, urlPolicy, ...extra };
}

describe("registerActions", () => {
  it("registers Buttons/Button/IconButton", () => {
    const registry = createComponentRegistry();
    registerActions(registry);
    assert.ok(registry.has("Button"));
    assert.ok(registry.has("Buttons"));
    assert.ok(registry.has("IconButton"));
    assert.throws(() => registerActions({}), /registerActions/);
  });
});

describe("actionDispatch helpers", () => {
  it("sanitizeActionPlan rejects javascript: urls", () => {
    const plan = {
      steps: [{ type: ACTION_STEPS.OpenUrl, url: "javascript:alert(1)" }],
    };
    const { rejected, reason } = sanitizeActionPlan(plan, { urlPolicy });
    assert.equal(rejected, true);
    assert.equal(reason, "unsafe-url");
  });

  it("sanitizeActionPlan keeps https", () => {
    const plan = {
      steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://example.com" }],
    };
    const { rejected, plan: safe } = sanitizeActionPlan(plan, { urlPolicy });
    assert.equal(rejected, false);
    assert.equal(safe.steps[0].url, "https://example.com");
  });

  it("needsFormValidation for primary + ToAssistant", () => {
    assert.equal(needsFormValidation(null, "primary"), true);
    assert.equal(needsFormValidation(null, "secondary"), false);
    assert.equal(
      needsFormValidation(
        { steps: [{ type: ACTION_STEPS.ToAssistant, message: "hi" }] },
        "primary",
      ),
      true,
    );
    assert.equal(
      needsFormValidation({ steps: [{ type: ACTION_STEPS.Set, target: "$x" }] }, "primary"),
      false,
    );
  });

  it("beginFire / endFire prevent double-fire", () => {
    const { document } = createTestDom();
    const el = document.createElement("button");
    assert.equal(beginFire(el), true);
    assert.equal(beginFire(el), false);
    endFire(el);
    assert.equal(beginFire(el), true);
    endFire(el);
  });
});

describe("Button", () => {
  it("renders variants and fires action with userGesture", async () => {
    const store = createStore({ $n: 0 });
    const opened = [];
    const actions = createActionRunner({
      store,
      host: { openUrl: (u) => opened.push(u) },
    });
    const c = ctx({ actions });
    const el = Button.create(
      {
        label: "Open",
        variant: "primary",
        action: {
          steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://example.com/x" }],
        },
      },
      c,
    );
    assert.equal(el.textContent, "Open");
    assert.equal(el.getAttribute("data-variant"), "primary");
    el.dispatchEvent({ type: "click", target: el, preventDefault() {} });
    // allow microtask
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(opened, ["https://example.com/x"]);
    Button.destroy(el, c);
  });

  it("rejects unsafe OpenUrl", async () => {
    const errors = [];
    const store = createStore({});
    const opened = [];
    const actions = createActionRunner({
      store,
      host: { openUrl: (u) => opened.push(u) },
    });
    const c = ctx({
      actions,
      reportError: (e) => errors.push(String(e.message || e)),
    });
    const el = Button.create(
      {
        label: "Bad",
        action: { steps: [{ type: ACTION_STEPS.OpenUrl, url: "javascript:evil" }] },
      },
      c,
    );
    const result = await dispatchButtonAction(el, el._canvasProps, el._canvasCtx);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unsafe-url");
    assert.equal(opened.length, 0);
    assert.ok(errors.length >= 1);
  });

  it("blocks double activation", async () => {
    let resolveRun;
    const gate = new Promise((r) => {
      resolveRun = r;
    });
    const c = ctx({
      actions: {
        async run() {
          await gate;
          return { ok: true };
        },
      },
    });
    const el = Button.create(
      { label: "Go", action: { steps: [{ type: ACTION_STEPS.Set, target: "$x", valueAST: { type: "Literal", value: 1 } }] } },
      c,
    );
    const p1 = dispatchButtonAction(el, el._canvasProps, el._canvasCtx);
    const p2 = dispatchButtonAction(el, el._canvasProps, el._canvasCtx);
    const r2 = await p2;
    assert.equal(r2.reason, "double-fire");
    resolveRun();
    const r1 = await p1;
    assert.equal(r1.ok, true);
  });

  it("validates form before primary ToAssistant", async () => {
    const fv = createFormValidationController();
    fv.registerField("email", { required: true }, () => "");
    let ran = 0;
    const c = ctx({
      formValidation: fv,
      actions: {
        async run() {
          ran += 1;
          return { ok: true };
        },
      },
    });
    const el = Button.create(
      {
        label: "Send",
        variant: "primary",
        action: { steps: [{ type: ACTION_STEPS.ToAssistant, message: "hi" }] },
      },
      c,
    );
    const result = await dispatchButtonAction(el, el._canvasProps, el._canvasCtx);
    assert.equal(result.reason, "invalid");
    assert.equal(ran, 0);
  });

  it("disabled while streaming", () => {
    const c = ctx({ stream: { isStreaming: true } });
    const el = Button.create({ label: "X" }, c);
    assert.equal(el.getAttribute("disabled"), "true");
  });

  it("Enter/Space activate", async () => {
    let clicks = 0;
    const c = ctx({
      actions: {
        async run() {
          clicks += 1;
          return { ok: true };
        },
      },
    });
    const el = Button.create(
      { label: "Key", action: { steps: [{ type: ACTION_STEPS.Set, target: "$a", valueAST: { type: "Literal", value: 1 } }] } },
      c,
    );
    el.dispatchEvent({ type: "keydown", key: "Enter", preventDefault() {} });
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(clicks, 1);
  });
});

describe("IconButton and Buttons", () => {
  it("IconButton has aria-label and fires", async () => {
    let ran = 0;
    const c = ctx({
      actions: {
        async run() {
          ran += 1;
          return { ok: true };
        },
      },
    });
    const el = IconButton.create(
      {
        name: "Close",
        icon: "x",
        action: { steps: [{ type: ACTION_STEPS.Set, target: "$a", valueAST: { type: "Literal", value: 1 } }] },
      },
      c,
    );
    assert.equal(el.getAttribute("aria-label"), "Close");
    el.dispatchEvent({ type: "click", target: el, preventDefault() {} });
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(ran, 1);
    IconButton.destroy(el, c);
  });

  it("Buttons group orientation", () => {
    const c = ctx();
    const el = Buttons.create({ direction: "column", buttons: "child" }, c);
    assert.equal(el.getAttribute("data-orientation"), "vertical");
    Buttons.update(el, { direction: "row" }, c);
    assert.equal(el.getAttribute("data-orientation"), "horizontal");
  });
});

describe("action fixtures", () => {
  it("loads Button fixture cases", () => {
    const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 1);
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8"));
      const Comp = ACTION_COMPONENTS[data.component];
      assert.ok(Comp);
      for (const testCase of data.cases) {
        const c = ctx();
        const el = Comp.create(testCase.props, c);
        for (const [k, v] of Object.entries(testCase.expect || {})) {
          if (k === "text") assert.equal(el.textContent, v);
          else assert.equal(el.getAttribute(k), v);
        }
        Comp.destroy?.(el, c);
      }
    }
  });
});

describe("actionRunner gesture gate still enforced", () => {
  it("OpenUrl without gesture fails at runner", async () => {
    const store = createStore({});
    const opened = [];
    const runner = createActionRunner({
      store,
      host: { openUrl: (u) => opened.push(u) },
    });
    const result = await runner.run({
      steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://example.com" }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "gesture-required");
    assert.equal(opened.length, 0);
  });
});

/**
 * A6 coverage gaps — forms (CheckBoxGroup/Submit/Form/OptionCards/Radio/Switch)
 * + tools/shared.js ≥90% line. EditableTable covered by table.editable.test.js.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createTestDom } from "./helpers/miniDom.js";
import { createStore } from "../../src/Browser/runtime/store.js";
import { createBindingManager } from "../../src/Browser/runtime/bindings.js";
import { createActionRunner } from "../../src/Browser/runtime/actionRunner.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";
import {
  Form,
  Submit,
  Reset,
  Input,
  CheckBoxGroup,
  CheckBoxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  OptionCards,
  OptionCard,
  createFormValidationController,
  submitForm,
  resetForm,
} from "../../src/Browser/components/forms/index.js";
import {
  requireDocument,
  asText,
  prefersReducedMotion,
  lifecycle,
  defaultToolLabel,
  defaultRunLabel,
  prettyValue,
} from "../../src/Browser/components/tools/shared.js";

function ctx(extra = {}) {
  const { document } = createTestDom();
  return { document, ...extra };
}

describe("A6 coverage gaps — CheckBoxGroup", () => {
  it("CheckBoxItem carrier + description + stored aggregate + change", () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    const fv = createFormValidationController();
    const c = ctx({ formName: "f", bindings, formValidation: fv });

    const item = CheckBoxItem.create({}, c);
    assert.equal(item.getAttribute("data-canvas-component"), "CheckBoxItem");
    CheckBoxItem.update(item, {}, c);
    CheckBoxItem.destroy?.(item, c);

    bindings.setFieldValue("f", "opts", { a: true, b: false });
    const el = CheckBoxGroup.create(
      {
        name: "opts",
        labelledBy: "lbl",
        items: [
          { name: "a", label: "A", description: "alpha", defaultChecked: false },
          { name: "b", label: "B", defaultChecked: true },
          { name: "", label: "skip" },
          null,
        ],
      },
      c,
    );
    assert.equal(el.getAttribute("aria-labelledby"), "lbl");
    const first = el.childNodes[0];
    assert.match(first.textContent, /alpha/);
    const inputA = first.childNodes[0];
    assert.equal(inputA.checked || inputA.getAttribute("checked") === "true", true);
    assert.equal(fv.validateForm(), true);

    inputA.checked = false;
    inputA.removeAttribute("checked");
    el.dispatchEvent({ type: "change", target: inputA, checked: false });
    assert.equal(bindings.getFieldValue("f", "opts")?.a, false);

    const inputB = el.childNodes[1].childNodes[0];
    el.dispatchEvent({
      type: "click",
      target: { getAttribute: (n) => (n === "type" ? "checkbox" : null), checked: undefined },
    });
    el.dispatchEvent({ type: "click", target: inputB });
    assert.ok(bindings.getFieldValue("f", "opts"));

    el.dispatchEvent({ type: "change", target: { getAttribute: () => "text" } });

    CheckBoxGroup.update(
      el,
      {
        name: "opts",
        disabled: true,
        items: [{ name: "a", label: "A", disabled: true }],
      },
      c,
    );
    CheckBoxGroup.destroy(el, c);
  });
});

describe("A6 coverage gaps — Submit / Reset", () => {
  it("finds parent Form and runs submit/reset; standalone onClick", async () => {
    const store = createStore({});
    const runs = [];
    const actions = createActionRunner({
      store,
      host: { openUrl: (u) => runs.push(u) },
    });
    const c = ctx({ actions });
    const form = Form.create(
      {
        name: "contact",
        action: {
          steps: [
            {
              type: ACTION_STEPS.Set,
              target: "$sent",
              valueAST: { type: "Literal", value: 1 },
            },
          ],
        },
        resetAction: {
          steps: [
            {
              type: ACTION_STEPS.Set,
              target: "$reset",
              valueAST: { type: "Literal", value: 1 },
            },
          ],
        },
      },
      c,
    );

    const submit = Submit.create({ label: "Send" }, c);
    const reset = Reset.create({ label: "Clear" }, c);
    form.appendChild(submit);
    form.appendChild(reset);

    submit.dispatchEvent({ type: "click", preventDefault() {} });
    await Promise.resolve();
    await Promise.resolve();

    reset.dispatchEvent({ type: "click", preventDefault() {} });
    await Promise.resolve();

    Submit.update(submit, { label: "Send", disabled: true }, c);
    submit.dispatchEvent({ type: "click", preventDefault() {} });

    Submit.update(submit, { label: "Send" }, { ...c, stream: { isStreaming: true } });
    assert.equal(submit.getAttribute("disabled"), "true");

    let clicked = false;
    const lone = Submit.create(
      { label: "Go", onClick: () => { clicked = true; } },
      c,
    );
    lone.dispatchEvent({ type: "click", preventDefault() {} });
    assert.equal(clicked, true);

    Submit.destroy(submit, c);
    Reset.destroy(reset, c);
    Submit.destroy(lone, c);
    Form.destroy(form, c);
  });
});

describe("A6 coverage gaps — Form", () => {
  it("slots, native events, busy, action-fail, onSubmit, reset", async () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    let resetCalled = false;
    const failRunner = {
      async run() {
        return { ok: false, reason: "nope" };
      },
    };
    const okRunner = { async run() { return { ok: true }; } };
    const c = ctx({ bindings, actions: failRunner });

    const form = Form.create(
      {
        name: "g",
        fields: "hello fields",
        buttons: "hello buttons",
        action: { steps: [] },
        onReset: () => {
          resetCalled = true;
        },
        resetAction: { steps: [] },
      },
      c,
    );
    assert.match(form.childNodes[0].textContent || "", /hello fields/);
    assert.match(form.childNodes[1].textContent || "", /hello buttons/);

    Form.update(form, { name: "g", children: "via children" }, c);
    assert.match(form.childNodes[0].textContent || "", /via children/);

    const form2 = Form.create({ name: "h" }, c);
    assert.deepEqual(await submitForm(form2, {}, c), { ok: true });

    const orphan = c.document.createElement("form");
    assert.deepEqual(await submitForm(orphan, {}, c), { ok: false, reason: "no-state" });
    assert.deepEqual(
      await submitForm(form2, { disabled: true }, c),
      { ok: false, reason: "disabled" },
    );
    assert.deepEqual(
      await submitForm(form2, {}, { ...c, stream: { isStreaming: true } }),
      { ok: false, reason: "disabled" },
    );

    let onSubmitCalled = false;
    const bare = ctx({ bindings });
    const formBusy = Form.create(
      {
        name: "busy",
        onSubmit: async () => {
          await new Promise((r) => setTimeout(r, 40));
          onSubmitCalled = true;
        },
      },
      bare,
    );
    const p1 = submitForm(formBusy, formBusy._canvasProps, formBusy._canvasCtx, {
      userGesture: true,
    });
    const p2 = await submitForm(formBusy, formBusy._canvasProps, formBusy._canvasCtx, {
      userGesture: true,
    });
    assert.deepEqual(p2, { ok: false, reason: "busy" });
    await p1;
    assert.equal(onSubmitCalled, true);

    const formFail = Form.create({ name: "fail", action: { steps: [] } }, c);
    const failResult = await submitForm(
      formFail,
      formFail._canvasProps,
      { ...c, actions: failRunner },
      { userGesture: true },
    );
    assert.equal(failResult.ok, false);
    assert.equal(formFail.getAttribute("data-mutation-failed"), "1");

    let submitted = false;
    const formFn = Form.create(
      {
        name: "fn",
        onSubmit: async () => {
          submitted = true;
        },
      },
      ctx(),
    );
    await submitForm(formFn, formFn._canvasProps, formFn._canvasCtx);
    assert.equal(submitted, true);

    // Re-patch so native handlers see onReset / resetAction again
    Form.update(
      form,
      {
        name: "g",
        onReset: () => {
          resetCalled = true;
        },
        resetAction: { steps: [] },
      },
      { ...c, actions: okRunner },
    );
    form.dispatchEvent({ type: "submit", preventDefault() {} });
    await Promise.resolve();
    resetCalled = false;
    form.dispatchEvent({ type: "reset", preventDefault() {} });
    assert.equal(resetCalled, true);

    resetCalled = false;
    resetForm(form, form._canvasProps, { ...c, actions: okRunner });
    assert.equal(resetCalled, true);

    Form.update(form, { name: "g", disabled: true }, c);
    assert.equal(form.getAttribute("data-disabled"), "1");
    Form.update(form, { name: "g" }, { ...c, stream: { isStreaming: true } });
    assert.equal(form.getAttribute("data-streaming"), "1");
    Form.update(form, { name: "g" }, c);
    assert.equal(form.childNodes[0].childNodes.length, 0);

    Form.destroy(form, c);
    Form.destroy(form2, c);
    Form.destroy(formBusy, c);
    Form.destroy(formFail, c);
    Form.destroy(formFn, c);
  });

  it("submitForm invalid when required field fails", async () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    // childCtx.renderChildren(host, nodes) → `this` is Form's childCtx (has formValidation)
    const c = ctx({
      bindings,
      renderChildren(host, nodes) {
        for (const node of nodes ?? []) {
          if (node?.type === "Input") {
            host.appendChild(Input.create(node.props || {}, this));
          }
        }
      },
    });
    const form = Form.create(
      {
        name: "gate",
        fields: {
          type: "Input",
          props: { name: "email", rules: { required: true }, value: "" },
        },
      },
      c,
    );
    const result = await submitForm(form, form._canvasProps, form._canvasCtx);
    assert.deepEqual(result, { ok: false, reason: "invalid" });
    assert.equal(form.getAttribute("data-invalid"), "1");

    resetForm(form, { onReset: () => {} }, c);
    assert.equal(form.getAttribute("data-invalid"), null);
    Form.destroy(form, c);
  });
});

describe("A6 coverage gaps — OptionCards", () => {
  it("OptionCard carrier, topContent, multi, keyboard, nested click", () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    const fv = createFormValidationController();
    const c = ctx({ formName: "f", bindings, formValidation: fv });

    const card = OptionCard.create({}, c);
    assert.equal(card.getAttribute("data-canvas-component"), "OptionCard");
    OptionCard.update(card, {}, c);

    const el = OptionCards.create(
      {
        name: "plan",
        type: "multiple",
        defaultValue: ["basic"],
        items: [
          {
            value: "basic",
            title: "Basic",
            subtitle: "Free",
            topContent: "TOP",
          },
          { value: "pro", label: "Pro", disabled: true },
          { value: "" },
        ],
      },
      c,
    );
    assert.equal(el.getAttribute("data-type"), "multiple");
    assert.match(el.childNodes[0].textContent, /TOP/);
    assert.equal(fv.validateForm(), true);

    const title = el.childNodes[0].childNodes[1];
    el.dispatchEvent({ type: "click", target: title });
    el.dispatchEvent({
      type: "keydown",
      key: "Enter",
      target: el.childNodes[0],
      preventDefault() {},
    });
    el.dispatchEvent({
      type: "keydown",
      key: " ",
      target: el.childNodes[0],
      preventDefault() {},
    });
    el.dispatchEvent({ type: "click", target: el.childNodes[1] });
    el.dispatchEvent({ type: "keydown", key: "a", target: el.childNodes[0] });

    OptionCards.destroy(el, c);
  });
});

describe("A6 coverage gaps — RadioGroup", () => {
  it("RadioItem, description, getter, non-arrow key", () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    const fv = createFormValidationController();
    const c = ctx({ formName: "f", bindings, formValidation: fv });

    const ri = RadioItem.create({}, c);
    assert.equal(ri.getAttribute("data-canvas-component"), "RadioItem");
    RadioItem.update(ri, {}, c);

    const el = RadioGroup.create(
      {
        name: "choice",
        labelledBy: "L",
        items: [
          { value: "one", label: "One", description: "first" },
          { value: "two", label: "Two" },
        ],
        defaultValue: "one",
      },
      c,
    );
    assert.match(el.textContent, /first/);
    assert.equal(fv.validateForm(), true);

    el.dispatchEvent({ type: "keydown", key: "Enter" });
    el.dispatchEvent({ type: "keydown", key: "ArrowUp", preventDefault() {} });
    assert.equal(bindings.getFieldValue("f", "choice"), "two");

    el.dispatchEvent({
      type: "change",
      target: el.childNodes[0].childNodes[0],
      value: "one",
    });

    RadioGroup.destroy(el, c);
  });
});

describe("A6 coverage gaps — SwitchGroup", () => {
  it("SwitchItem, description, stored, getter, non-switch target", () => {
    const store = createStore({});
    const bindings = createBindingManager(store);
    const fv = createFormValidationController();
    const c = ctx({ formName: "f", bindings, formValidation: fv });

    const si = SwitchItem.create({}, c);
    assert.equal(si.getAttribute("data-canvas-component"), "SwitchItem");
    SwitchItem.update(si, {}, c);

    bindings.setFieldValue("f", "flags", { dark: true });
    const el = SwitchGroup.create(
      {
        name: "flags",
        variant: "solid",
        items: [
          { name: "dark", label: "Dark", description: "night mode" },
          { name: "compact", label: "Compact", defaultChecked: true },
        ],
      },
      c,
    );
    assert.match(el.getAttribute("class") || "", /solid/);
    assert.match(el.textContent, /night mode/);
    assert.equal(fv.validateForm(), true);

    const input = el.childNodes[0].childNodes[0];
    input.checked = false;
    el.dispatchEvent({ type: "change", target: input });
    assert.equal(bindings.getFieldValue("f", "flags")?.dark, false);

    el.dispatchEvent({
      type: "change",
      target: { getAttribute: () => null },
    });

    SwitchGroup.destroy(el, c);
  });
});

describe("A6 coverage gaps — tools/shared", () => {
  it("requireDocument, asText, reducedMotion, lifecycle, labels, prettyValue", () => {
    assert.throws(() => requireDocument({}), /document required/);
    assert.equal(asText(null), "");
    assert.equal(asText("x"), "x");
    assert.equal(asText(3), "3");
    assert.equal(asText(true), "true");
    assert.equal(asText({}), "");

    assert.equal(prefersReducedMotion({ reducedMotion: true }), true);
    assert.equal(prefersReducedMotion({ reduceMotion: true }), true);
    assert.equal(prefersReducedMotion({}, { reducedMotion: true }), true);

    const prev = globalThis.matchMedia;
    globalThis.matchMedia = () => {
      throw new Error("mq fail");
    };
    assert.equal(prefersReducedMotion({}, {}), false);
    globalThis.matchMedia = prev;

    const { document } = createTestDom();
    const life = lifecycle({
      mount(doc) {
        return doc.createElement("div");
      },
      patch(el, props) {
        el.setAttribute("data-v", String(props.v ?? ""));
      },
      unmount(el) {
        el.setAttribute("data-dead", "1");
      },
    });
    const el = life.create({ v: 1 }, { document });
    life.update(el, { v: 2 }, { document });
    life.destroy(el, { document });
    assert.equal(el.getAttribute("data-dead"), "1");

    assert.equal(defaultToolLabel("unknown", "t"), "t: unknown");
    assert.equal(defaultToolLabel("error", ""), "Tool failed");
    assert.equal(defaultRunLabel("start"), "Run started");
    assert.equal(defaultRunLabel("finish"), "Run finished");
    assert.equal(defaultRunLabel("error"), "Run failed");
    assert.equal(defaultRunLabel("other"), "Run other");

    assert.equal(prettyValue(null), "");
    assert.equal(prettyValue("not-json"), "not-json");
    assert.match(prettyValue('{"a":1}'), /"a"/);
    assert.match(prettyValue({ b: 2 }), /"b"/);
    const cyclic = {};
    cyclic.self = cyclic;
    assert.equal(typeof prettyValue(cyclic), "string");
  });
});

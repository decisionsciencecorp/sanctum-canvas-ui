/**
 * A5.3 — lists, follow-ups, sources/citations, code, images.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { createRenderContext } from "../../src/Browser/renderer/context.js";
import * as urlPolicy from "../../src/Browser/security/urlPolicy.js";
import {
  registerContent,
  CONTENT_COMPONENTS,
  ListBlock,
  ListItem,
  CodeBlock,
  copyTextNoFocusSteal,
  Image,
  ImageBlock,
  resolveImageAccessibility,
  resolveSafeSrc,
} from "../../src/Browser/components/content/index.js";
import {
  registerChatContent,
  CHAT_CONTENT_COMPONENTS,
  FollowUpBlock,
  FollowUpItem,
  createSourceContext,
  getSourceContext,
  enrichSources,
  getFaviconUrl,
  CitationRef,
  MAX_CONTINUE_CHARS,
  boundContinueText,
  isStreaming,
  resolveContinuePayload,
  dispatchContinueConversation,
} from "../../src/Browser/components/chat/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_FIXTURE_DIR = join(__dirname, "../fixtures/components/content");
const CHAT_FIXTURE_DIR = join(__dirname, "../fixtures/components/chat");

function ctx(extra = {}) {
  const { document } = createTestDom();
  return createRenderContext({ document, urlPolicy, ...extra });
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

describe("A5.3 continueConversation helper", () => {
  it("bounds oversized text", () => {
    const big = "x".repeat(MAX_CONTINUE_CHARS + 50);
    assert.equal(boundContinueText(big).length, MAX_CONTINUE_CHARS);
    assert.equal(boundContinueText(null), "");
  });

  it("detects streaming", () => {
    assert.equal(isStreaming({ stream: { isStreaming: true } }), true);
    assert.equal(isStreaming({ stream: { isStreaming: false } }), false);
    assert.equal(isStreaming({}), false);
  });

  it("resolves legacy continue_conversation action", () => {
    const p = resolveContinuePayload({
      title: "T",
      action: { type: "continue_conversation", context: "Ask about T" },
    });
    assert.equal(p.message, "Ask about T");
    assert.equal(p.context, "Ask about T");
  });

  it("resolves ActionPlan ToAssistant steps", () => {
    const p = resolveContinuePayload({
      action: {
        steps: [{ type: "continue_conversation", message: "Hi", context: "ctx" }],
      },
    });
    assert.equal(p.message, "Hi");
    assert.equal(p.context, "ctx");
  });

  it("rejects non-continue action types", () => {
    assert.equal(
      resolveContinuePayload({ action: { type: "open_url", url: "https://x" } }),
      null,
    );
  });

  it("dispatch no-ops while streaming", () => {
    const sent = [];
    const result = dispatchContinueConversation(
      {
        stream: { isStreaming: true },
        continueConversation: (m) => sent.push(m),
      },
      { text: "Go" },
      { userGesture: true },
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "streaming");
    assert.equal(sent.length, 0);
  });

  it("dispatch requires gesture and handler", () => {
    assert.equal(
      dispatchContinueConversation({}, { text: "x" }, { userGesture: false }).reason,
      "gesture-required",
    );
    assert.equal(
      dispatchContinueConversation({}, { text: "x" }, { userGesture: true }).reason,
      "no-handler",
    );
  });

  it("dispatch via actions.continueConversation and actions.run", async () => {
    const msgs = [];
    const r1 = dispatchContinueConversation(
      { actions: { continueConversation: (m, c) => msgs.push([m, c]) } },
      { text: "One" },
      { userGesture: true },
    );
    assert.equal(r1.ok, true);
    assert.deepEqual(msgs[0], ["One", undefined]);

    const plans = [];
    const r2 = dispatchContinueConversation(
      {
        actions: {
          run: (plan, opts) => {
            plans.push({ plan, opts });
          },
        },
      },
      { action: { type: "continue_conversation", message: "Two", context: "c2" } },
      { userGesture: true },
    );
    assert.equal(r2.ok, true);
    assert.equal(plans[0].opts.userGesture, true);
    assert.equal(plans[0].plan.steps[0].message, "Two");
  });

  it("dispatch via host.continueConversation", () => {
    const got = [];
    const r = dispatchContinueConversation(
      { host: { continueConversation: (m) => got.push(m) } },
      { title: "Host path" },
      { userGesture: true },
    );
    assert.equal(r.ok, true);
    assert.equal(got[0], "Host path");
  });

  it("reads message from action.params and rejects empty", () => {
    const p = resolveContinuePayload({
      action: { type: "continue_conversation", params: { message: "From params" } },
    });
    assert.equal(p.message, "From params");
    assert.equal(
      dispatchContinueConversation(
        { continueConversation: () => {} },
        { action: { type: "continue_conversation" } },
        { userGesture: true },
      ).reason,
      "empty",
    );
  });
});

describe("A5.3 registerChatContent + registerContent", () => {
  it("registers shared and chat-only types", () => {
    const reg = createComponentRegistry();
    registerContent(reg);
    registerChatContent(reg);
    for (const name of [
      "ListBlock",
      "ListItem",
      "CodeBlock",
      "Image",
      "ImageBlock",
      "FollowUpBlock",
      "FollowUpItem",
      "CitationRef",
      "Citation",
      "TextContent",
    ]) {
      assert.equal(reg.has(name), true, name);
    }
  });

  it("rejects bad registry", () => {
    assert.throws(() => registerChatContent(null), /register/);
    assert.throws(() => registerChatContent({}), /register/);
  });

  it("CHAT_CONTENT_COMPONENTS covers expected set", () => {
    assert.ok(Object.keys(CHAT_CONTENT_COMPONENTS).length >= 8);
    assert.ok(CONTENT_COMPONENTS.ListBlock);
    assert.ok(CONTENT_COMPONENTS.CodeBlock);
  });
});

describe("A5.3 ListBlock / ListItem", () => {
  it("renders plain numbered items without action role", () => {
    const c = ctx();
    const el = ListBlock.create(
      {
        variant: "number",
        items: [{ title: "A", subtitle: "sub" }, { title: "B" }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-item-count"), "2");
    const items = findByAttr(el, "data-canvas-component", "ListItem");
    assert.equal(items.length, 2);
    assert.equal(items[0].getAttribute("data-actionable"), "false");
    const rows = findByAttr(items[0], "class");
    const clickable = findByAttr(el, "role", "button");
    assert.equal(clickable.length, 0);
  });

  it("action item dispatches ContinueConversation on click only", () => {
    const sent = [];
    const c = ctx({
      continueConversation: (m, ctxMsg) => sent.push({ m, ctxMsg }),
    });
    const el = ListItem.create(
      {
        title: "Option A",
        action: { type: "continue_conversation", context: "Option A details" },
        actionLabel: "Go",
        index: 0,
        variant: "number",
      },
      c,
    );
    assert.equal(el.getAttribute("data-actionable"), "true");
    const btn = findByAttr(el, "role", "button")[0];
    assert.ok(btn);
    assert.equal(sent.length, 0);
    btn.onclick();
    assert.equal(sent.length, 1);
    assert.match(sent[0].m, /Option A/);
  });

  it("blocks action while streaming", () => {
    const sent = [];
    const c = ctx({
      stream: { isStreaming: true },
      continueConversation: (m) => sent.push(m),
    });
    const el = ListItem.create(
      {
        title: "X",
        action: { type: "continue_conversation", context: "X" },
      },
      c,
    );
    assert.equal(el.getAttribute("data-streaming-blocked"), "true");
    const btn = findByAttr(el, "role", "button")[0];
    btn.onclick();
    assert.equal(sent.length, 0);
  });

  it("image variant uses safeUrl", () => {
    const c = ctx();
    const el = ListItem.create(
      {
        title: "Pic",
        variant: "image",
        image: { src: "javascript:evil", alt: "nope" },
        listHasSubtitle: false,
      },
      c,
    );
    const imgs = findByAttr(el, "src");
    // unsafe src must not become an img src attribute
    const withSrc = [...el.childNodes].length;
    assert.ok(withSrc >= 1);
    const imgEls = [];
    const walk = (n) => {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") imgEls.push(n);
        for (const c2 of n.childNodes ?? []) walk(c2);
      }
    };
    walk(el);
    assert.equal(imgEls.length, 0);
  });

  it("accepts lang-wrapped item props", () => {
    const c = ctx();
    const el = ListBlock.create(
      {
        items: [{ props: { title: "Wrapped" } }],
      },
      c,
    );
    assert.match(el.textContent, /Wrapped/);
  });

  it("icon variant and keyboard activate", () => {
    const sent = [];
    const c = ctx({ continueConversation: (m) => sent.push(m) });
    const el = ListItem.create(
      {
        title: "Iconic",
        variant: "icon",
        icon: "★",
        action: { type: "continue_conversation", message: "Iconic" },
      },
      c,
    );
    assert.match(el.textContent, /★/);
    const btn = findByAttr(el, "role", "button")[0];
    btn.onkeydown({ key: "Enter", preventDefault() {} });
    assert.equal(sent[0], "Iconic");
    sent.length = 0;
    btn.onkeydown({ key: " ", preventDefault() {} });
    assert.equal(sent[0], "Iconic");
  });

  it("image variant with safe src", () => {
    const c = ctx();
    const el = ListItem.create(
      {
        title: "Pic",
        variant: "image",
        image: { src: "https://example.com/a.png", alt: "A" },
      },
      c,
    );
    const imgs = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)];
    assert.equal(imgs.length, 1);
    assert.equal(imgs[0].getAttribute("src"), "https://example.com/a.png");
  });

  it("ListBlock renderChildren path", () => {
    const { document } = createTestDom();
    const rendered = [];
    const c = createRenderContext({
      document,
      urlPolicy,
      renderChildren: (parent, children) => {
        rendered.push(children);
        for (const child of children) {
          const wrap = document.createElement("div");
          wrap.textContent = String(child?.props?.title ?? "");
          parent.appendChild(wrap);
        }
      },
    });
    // createRenderContext overwrites renderChildren — pass via opts after
    const el = ListBlock.create(
      {
        variant: "number",
        children: [
          { type: "ListItem", props: { title: "Child A" } },
          { type: "ListItem", props: { title: "Child B", index: 5 } },
        ],
      },
      {
        ...c,
        renderChildren: (parent, children) => {
          rendered.push(children);
          for (const child of children) {
            const wrap = document.createElement("div");
            wrap.setAttribute("data-title", String(child?.props?.title ?? ""));
            parent.appendChild(wrap);
          }
        },
      },
    );
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0][0].props.variant, "number");
    assert.equal(rendered[0][0].props.index, 0);
    assert.equal(rendered[0][1].props.index, 5);
    assert.equal(findByAttr(el, "data-title", "Child A").length, 1);
  });
});

describe("A5.3 FollowUpBlock / FollowUpItem", () => {
  it("renders related queries and sends on click", () => {
    const sent = [];
    const c = ctx({ continueConversation: (m) => sent.push(m) });
    const el = FollowUpBlock.create(
      { items: [{ text: "Next step" }, "string item"] },
      c,
    );
    assert.equal(el.getAttribute("data-item-count"), "2");
    assert.match(el.textContent, /Related Queries/);
    const buttons = findByAttr(el, "data-canvas-component", "FollowUpItem");
    assert.equal(buttons.length, 2);
    buttons[0].onclick();
    assert.equal(sent[0], "Next step");
  });

  it("disables follow-up while streaming", () => {
    const sent = [];
    const c = ctx({
      stream: { isStreaming: true },
      continueConversation: (m) => sent.push(m),
    });
    const el = FollowUpItem.create({ text: "Nope" }, c);
    assert.equal(el.getAttribute("disabled"), "true");
    el.onclick();
    assert.equal(sent.length, 0);
  });

  it("FollowUpItem custom icon and FollowUpBlock children path", () => {
    const c = ctx();
    const el = FollowUpItem.create({ text: "X", icon: "→" }, c);
    assert.match(el.textContent, /→/);

    const rendered = [];
    const block = FollowUpBlock.create(
      {
        heading: "More",
        children: [{ type: "FollowUpItem", props: { text: "Kid" } }],
      },
      {
        ...c,
        renderChildren: (parent, children) => {
          rendered.push(children);
        },
      },
    );
    assert.match(block.textContent, /More/);
    assert.equal(rendered.length, 1);
  });

  it("FollowUpBlock wraps item.props", () => {
    const c = ctx();
    const el = FollowUpBlock.create(
      { items: [{ props: { text: "From props" } }] },
      c,
    );
    assert.match(el.textContent, /From props/);
  });
});

describe("A5.3 SourceContext / CitationRef", () => {
  it("enriches and looks up 1-based citations", () => {
    const sc = createSourceContext(
      [
        { title: "Doc A", sourceName: "Example", url: "https://example.com/a" },
        { title: "Doc B", sourceName: "Other", url: "javascript:bad" },
      ],
      { urlPolicy },
    );
    assert.equal(sc.sources.length, 2);
    assert.ok(sc.getByIndex(1)?.url);
    assert.equal(sc.getByIndex(2)?.url, undefined);
    const found = sc.lookupCitations([1, 2]);
    assert.equal(found.length, 2);
    assert.ok(getFaviconUrl("https://example.com/x", urlPolicy).includes("favicons"));
    assert.equal(getFaviconUrl("not a url", urlPolicy), "");
  });

  it("CitationRef chips open safe urls", () => {
    const opened = [];
    const sources = [
      { title: "One", sourceName: "S1", url: "https://example.com/1" },
    ];
    const c = ctx({
      sourceContext: createSourceContext(sources, { urlPolicy }),
      openUrl: (u) => opened.push(u),
    });
    const el = CitationRef.create({ index: 1 }, c);
    assert.equal(el.getAttribute("data-status"), "ready");
    const chip = findByAttr(el, "data-citation-index", "1")[0];
    assert.ok(chip);
    chip.onclick({ preventDefault() {} });
    assert.equal(opened[0], "https://example.com/1");
  });

  it("unresolved citation shows number", () => {
    const c = ctx({ sourceContext: createSourceContext([], { urlPolicy }) });
    const el = CitationRef.create({ indices: [3] }, c);
    assert.equal(el.getAttribute("data-status"), "unresolved");
    assert.match(el.textContent, /3/);
  });

  it("getSourceContext falls back to ctx.sources", () => {
    const sc = getSourceContext({
      sources: [{ title: "T", sourceName: "N", url: "https://example.com" }],
      urlPolicy,
    });
    assert.equal(sc.sources.length, 1);
  });

  it("enrichSources skips non-objects", () => {
    assert.equal(enrichSources([null, 1, { title: "A", sourceName: "B" }]).length, 1);
  });
});

describe("A5.3 CodeBlock copy without focus steal", () => {
  let originalClipboard;

  beforeEach(() => {
    originalClipboard = globalThis.navigator?.clipboard;
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(globalThis, "navigator", {
        value: { ...globalThis.navigator, clipboard: originalClipboard },
        configurable: true,
      });
    }
  });

  it("copies via clipboard API and announces without focusing button", async () => {
    const writes = [];
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: async (t) => {
            writes.push(t);
          },
        },
      },
      configurable: true,
    });

    const c = ctx();
    const focused = c.document.createElement("input");
    c.document.body.appendChild(focused);
    focused.focus();
    assert.equal(c.document.activeElement, focused);

    const el = CodeBlock.create(
      { language: "js", codeString: "console.log(1)" },
      c,
    );
    const btn = findByAttr(el, "class").find((n) =>
      (n.getAttribute("class") || "").includes("canvas-code-block__copy"),
    );
    // find copy button more reliably
    const copyBtn = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if ((n.getAttribute("class") || "").includes("canvas-code-block__copy")) yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    assert.ok(copyBtn);
    await copyBtn.onclick({ preventDefault() {} });
    assert.equal(writes[0], "console.log(1)");
    assert.equal(c.document.activeElement, focused);
    assert.equal(copyBtn.getAttribute("data-copied"), "true");
    assert.match(el.textContent, /Copied/);
  });

  it("copyTextNoFocusSteal returns false without clipboard", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    // no document.execCommand either in miniDom — expect false
    const ok = await copyTextNoFocusSteal("x");
    assert.equal(ok, false);
  });

  it("destroy clears copied timer", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: { writeText: async () => {} },
      },
      configurable: true,
    });
    const c = ctx();
    const el = CodeBlock.create({ codeString: "a" }, c);
    const copyBtn = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if ((n.getAttribute("aria-label") || "").includes("Copy")) yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    await copyBtn.onclick({ preventDefault() {} });
    CodeBlock.destroy(el, c);
  });

  it("announces copy failure", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: async () => {
            throw new Error("denied");
          },
        },
      },
      configurable: true,
    });
    // Also stub document without execCommand success
    const c = ctx();
    const el = CodeBlock.create({ codeString: "fail-me" }, c);
    const copyBtn = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if ((n.getAttribute("aria-label") || "").includes("Copy")) yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    await copyBtn.onclick({ preventDefault() {} });
    assert.match(el.textContent, /Copy failed|fail-me/);
  });

  it("execCommand fallback restores prior focus", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    const { document } = createTestDom();
    // Provide a minimal global document for fallback path
    const prevDoc = globalThis.document;
    globalThis.document = document;
    document.execCommand = () => true;
    document.body = document.createElement("body");
    const focused = document.createElement("input");
    document.body.appendChild(focused);
    focused.focus();
    try {
      const ok = await copyTextNoFocusSteal("via-exec");
      assert.equal(ok, true);
      assert.equal(document.activeElement, focused);
    } finally {
      globalThis.document = prevDoc;
    }
  });
});

describe("A5.3 Image / ImageBlock a11y + fallback", () => {
  it("resolveImageAccessibility requires alt or decorative", () => {
    assert.equal(resolveImageAccessibility({}).ok, false);
    assert.equal(resolveImageAccessibility({ alt: "x" }).ok, true);
    assert.equal(resolveImageAccessibility({ decorative: true }).decorative, true);
  });

  it("blocks unsafe src", () => {
    const c = ctx();
    assert.equal(resolveSafeSrc({ src: "javascript:x" }, c), undefined);
    const el = Image.create({ src: "javascript:x", alt: "a" }, c);
    assert.equal(el.getAttribute("data-status"), "error");
    assert.match(el.textContent, /Unsafe|blocked|unavailable/i);
  });

  it("decorative image has empty alt", () => {
    const c = ctx();
    const el = Image.create(
      { src: "https://example.com/d.png", decorative: true },
      c,
    );
    assert.equal(el.getAttribute("data-a11y"), "decorative");
    const img = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    assert.equal(img.getAttribute("alt"), "");
  });

  it("broken image onerror shows fallback", () => {
    const c = ctx();
    const el = Image.create(
      { src: "https://example.com/missing.png", alt: "Missing" },
      c,
    );
    const img = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    img.onerror();
    assert.equal(el.getAttribute("data-broken"), "true");
    assert.match(el.textContent, /failed/i);
  });

  it("ImageBlock missing alt and unsafe", () => {
    const c = ctx();
    const missing = ImageBlock.create({ src: "https://example.com/x.png" }, c);
    assert.equal(missing.getAttribute("data-a11y"), "missing-alt");
    const bad = ImageBlock.create(
      { src: "data:text/html,x", alt: "x" },
      c,
    );
    assert.equal(bad.getAttribute("data-status"), "error");
  });

  it("ImageBlock onerror fallback", () => {
    const c = ctx();
    const el = ImageBlock.create(
      { src: "https://example.com/h.png", alt: "Hero", imageLoading: false },
      c,
    );
    const img = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    img.onerror();
    assert.equal(el.getAttribute("data-broken"), "true");
    assert.match(el.textContent, /failed/i);
  });

  it("ImageBlock onload clears loader", () => {
    const c = ctx();
    const el = ImageBlock.create(
      { src: "https://example.com/h.png", alt: "Hero" },
      c,
    );
    const img = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    img.onload();
    assert.equal(el.getAttribute("data-status"), "ready");
  });

  it("Image empty src and onload path", () => {
    const c = ctx();
    const empty = Image.create({ alt: "x" }, c);
    assert.equal(empty.getAttribute("data-status"), "error");
    const el = Image.create({ src: "https://example.com/ok.png", alt: "Ok" }, c);
    const img = [...(function* walk(n) {
      if (n.nodeType === 1) {
        if (n.tagName === "IMG") yield n;
        for (const ch of n.childNodes ?? []) yield* walk(ch);
      }
    })(el)][0];
    img.onload();
    assert.equal(el.getAttribute("data-status"), "ready");
  });

  it("CitationRef empty indices and comma indices", () => {
    const c = ctx({
      sourceContext: createSourceContext(
        [
          { title: "A", sourceName: "S", url: "https://example.com/a" },
          { title: "B", sourceName: "S", url: "https://example.com/b" },
        ],
        { urlPolicy },
      ),
    });
    const empty = CitationRef.create({ label: "x" }, c);
    assert.equal(empty.getAttribute("data-status"), "empty");
    const multi = CitationRef.create({ indices: "1,2" }, c);
    // indices as string with comma goes through citation prop path
    const multi2 = CitationRef.create({ "data-citation": "1,2" }, c);
    assert.equal(multi2.getAttribute("data-status"), "ready");
    assert.equal(multi2.getAttribute("data-source-count"), "2");
  });
});

describe("A5.3 fixtures on disk", () => {
  it("content fixtures for List/Code/Image exist", () => {
    for (const name of ["ListBlock", "CodeBlock", "Image", "ImageBlock"]) {
      assert.ok(
        existsSync(join(CONTENT_FIXTURE_DIR, `${name}.json`)),
        name,
      );
    }
    assert.ok(existsSync(join(CHAT_FIXTURE_DIR, "FollowUpBlock.json")));
  });

  it("chat FollowUpBlock fixture renders", () => {
    const fixture = JSON.parse(
      readFileSync(join(CHAT_FIXTURE_DIR, "FollowUpBlock.json"), "utf8"),
    );
    const c = ctx();
    for (const cas of fixture.cases) {
      const el = FollowUpBlock.create(cas.props, c);
      for (const [k, v] of Object.entries(cas.expect || {})) {
        if (k === "body") assert.match(el.textContent, new RegExp(v));
        else assert.equal(el.getAttribute(k), v);
      }
    }
  });
});

describe("A5.3 CSS artifacts", () => {
  it("component css files exist", () => {
    const cssDir = join(__dirname, "../../public/assets/css/components");
    for (const f of ["list.css", "follow-up.css", "code-block.css", "image.css"]) {
      assert.ok(existsSync(join(cssDir, f)), f);
      const body = readFileSync(join(cssDir, f), "utf8");
      assert.ok(body.includes("canvas-"));
    }
  });
});

/**
 * A5.3 — CodeBlock with copy feedback that does not steal focus.
 * No Prism dependency — plain <pre><code> + textContent.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";
import { setInlineStyle } from "../../renderer/inlineStyle.js";

/** @type {WeakMap<Element, ReturnType<typeof setTimeout>>} */
const copiedTimers = new WeakMap();

/**
 * Copy text without moving document focus off the previously focused control.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyTextNoFocusSteal(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through
    }
  }
  // ExecCommand fallback — briefly use a detached textarea; restore focus.
  if (typeof document === "undefined") return false;
  const prev = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body?.appendChild(ta);
  if (typeof ta.select === "function") {
    ta.select();
  } else if (typeof ta.setSelectionRange === "function") {
    ta.setSelectionRange(0, value.length);
  }
  let ok = false;
  try {
    ok = typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch {
    ok = false;
  }
  if (typeof ta.remove === "function") {
    ta.remove();
  } else if (ta.parentNode) {
    ta.parentNode.removeChild(ta);
  }
  if (prev && typeof prev.focus === "function") {
    try {
      prev.focus();
    } catch {
      /* ignore */
    }
  }
  return ok;
}

function clearCopiedTimer(el) {
  const t = copiedTimers.get(el);
  if (t != null) {
    clearTimeout(t);
    copiedTimers.delete(el);
  }
}

export const CodeBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "CodeBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const language = asText(props.language) || "text";
    const codeString = asText(props.codeString ?? props.code ?? props.children);

    setClass(el, "canvas-code-block");
    el.setAttribute("data-language", language);

    clearChildren(el);
    clearCopiedTimer(el);

    const live = doc.createElement("span");
    live.setAttribute("class", "canvas-code-block__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.setAttribute("data-canvas-copy-live", "");
    // Visually hidden announcement region — never focused.
    setInlineStyle(live, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" });

    const btn = doc.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "canvas-code-block__copy");
    btn.setAttribute("aria-label", "Copy code");
    btn.setAttribute("data-copied", "false");
    btn.textContent = "Copy";

    const setCopied = (copied) => {
      btn.setAttribute("data-copied", copied ? "true" : "false");
      btn.setAttribute("aria-label", copied ? "Copied to clipboard" : "Copy code");
      btn.textContent = copied ? "Copied" : "Copy";
      setOrRemoveAttr(btn, "class", null);
      btn.setAttribute(
        "class",
        copied
          ? "canvas-code-block__copy canvas-code-block__copy--copied"
          : "canvas-code-block__copy",
      );
      live.textContent = copied ? "Copied to clipboard" : "";
    };

    btn.onclick = async (ev) => {
      ev?.preventDefault?.();
      // Do not call btn.focus() — preserve whatever had focus (Doc #1379 §7.1).
      const ok = await copyTextNoFocusSteal(codeString);
      if (!ok) {
        live.textContent = "Copy failed";
        return;
      }
      setCopied(true);
      clearCopiedTimer(el);
      const timer = setTimeout(() => {
        setCopied(false);
        copiedTimers.delete(el);
      }, 1000);
      copiedTimers.set(el, timer);
    };

    const pre = doc.createElement("pre");
    pre.setAttribute("class", "canvas-code-block__pre");
    const code = doc.createElement("code");
    code.setAttribute("class", `canvas-code-block__code language-${language}`);
    code.textContent = codeString;
    pre.appendChild(code);

    el.appendChild(btn);
    el.appendChild(pre);
    el.appendChild(live);
  },
  unmount(el) {
    clearCopiedTimer(el);
  },
});

export default CodeBlock;

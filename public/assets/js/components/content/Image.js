/**
 * A5.3 — Image: requires alt text or explicit decorative flag; broken-image fallback.
 * All src through urlPolicy.safeUrl.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";
import { safeUrl as defaultSafeUrl } from "../../security/urlPolicy.js";
import { setInlineStyle } from "../../renderer/inlineStyle.js";

const ASPECT = new Set(["1:1", "3:2", "3:4", "4:3", "16:9"]);
const SCALE = new Set(["fit", "fill"]);

const ASPECT_RATIO = {
  "1:1": "1 / 1",
  "3:2": "3 / 2",
  "3:4": "3 / 4",
  "4:3": "4 / 3",
  "16:9": "16 / 9",
};

/**
 * @param {Record<string, unknown>} props
 * @returns {{ ok: true, alt: string, decorative: boolean } | { ok: false, reason: string }}
 */
export function resolveImageAccessibility(props = {}) {
  const decorative =
    props.decorative === true ||
    props.decorative === "true" ||
    props.role === "presentation" ||
    props.role === "none";
  const alt = asText(props.alt);
  if (decorative) {
    return { ok: true, alt: "", decorative: true };
  }
  if (alt) {
    return { ok: true, alt, decorative: false };
  }
  return { ok: false, reason: "alt-or-decorative-required" };
}

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {string | undefined}
 */
export function resolveSafeSrc(props, ctx) {
  const raw = asText(props.src);
  if (!raw) return undefined;
  const policy =
    ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function"
      ? ctx.urlPolicy.safeUrl
      : defaultSafeUrl;
  return policy(raw);
}

function showFallback(el, doc, message) {
  el.setAttribute("data-status", "error");
  el.setAttribute("data-broken", "true");
  const fb = doc.createElement("div");
  fb.setAttribute("class", "canvas-image__fallback");
  fb.setAttribute("role", "img");
  fb.setAttribute("aria-label", message);
  fb.textContent = message;
  el.appendChild(fb);
}

export const Image = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Image");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const aspect = ASPECT.has(asText(props.aspectRatio))
      ? asText(props.aspectRatio)
      : "3:2";
    const scale = SCALE.has(asText(props.scale)) ? asText(props.scale) : "fill";

    setClass(el, `canvas-image canvas-image--scale-${scale}`);
    el.setAttribute("data-aspect", aspect);
    setInlineStyle(el, { "aspect-ratio": ASPECT_RATIO[aspect] });

    clearChildren(el);

    const a11y = resolveImageAccessibility(props);
    if (!a11y.ok) {
      showFallback(el, doc, "Image missing alt text");
      el.setAttribute("data-a11y", "missing-alt");
      return;
    }

    const safe = resolveSafeSrc(props, ctx);
    if (!safe) {
      // Unsafe or missing src — never render an active image URL.
      showFallback(el, doc, props.src ? "Unsafe image URL blocked" : "Image unavailable");
      el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
      return;
    }

    el.setAttribute("data-status", "ready");
    el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
    el.removeAttribute("data-broken");

    const img = doc.createElement("img");
    img.setAttribute("class", `canvas-image__img canvas-image__img--${scale}`);
    img.setAttribute("src", safe);
    if (a11y.decorative) {
      img.setAttribute("alt", "");
      img.setAttribute("role", "presentation");
    } else {
      img.setAttribute("alt", a11y.alt);
    }

    img.onload = () => {
      el.setAttribute("data-status", "ready");
      el.removeAttribute("data-broken");
      setOrRemoveAttr(img, "data-broken", null);
    };
    img.onerror = () => {
      el.setAttribute("data-broken", "true");
      el.setAttribute("data-status", "error");
      img.setAttribute("data-broken", "true");
      // Replace with fallback (keep structure stable for reconciler).
      clearChildren(el);
      showFallback(el, doc, "Image failed to load");
    };

    el.appendChild(img);
  },
});

export default Image;

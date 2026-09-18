/**
 * A5.3 — ImageBlock (hero-style image with soft background blur).
 * Requires alt or decorative; broken-image fallback; safeUrl for src + CSS bg.
 */

import {
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";
import { resolveImageAccessibility, resolveSafeSrc } from "./Image.js";
import { toCssUrl as defaultToCssUrl } from "../../security/urlPolicy.js";
import { setInlineStyle } from "../../renderer/inlineStyle.js";

export const ImageBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ImageBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    setClass(el, "canvas-image-block");
    clearChildren(el);

    const a11y = resolveImageAccessibility(props);
    if (!a11y.ok) {
      el.setAttribute("data-status", "error");
      el.setAttribute("data-a11y", "missing-alt");
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute("aria-label", "Image missing alt text");
      fb.textContent = "Image missing alt text";
      el.appendChild(fb);
      return;
    }

    const safe = resolveSafeSrc(props, ctx);
    if (!safe) {
      el.setAttribute("data-status", "error");
      el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute(
        "aria-label",
        props.src ? "Unsafe image URL blocked" : "Image unavailable",
      );
      fb.textContent = props.src ? "Unsafe image URL blocked" : "Image unavailable";
      el.appendChild(fb);
      return;
    }

    el.setAttribute("data-status", "loading");
    el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
    el.removeAttribute("data-broken");

    const cssUrl =
      ctx.urlPolicy && typeof ctx.urlPolicy.toCssUrl === "function"
        ? ctx.urlPolicy.toCssUrl(safe)
        : defaultToCssUrl(safe);
    if (cssUrl) {
      setInlineStyle(el, { "--canvas-image-block-bg": cssUrl });
      el.setAttribute("class", "canvas-image-block canvas-image-block--has-bg");
    }

    const img = doc.createElement("img");
    img.setAttribute("class", "canvas-image-block__image");
    img.setAttribute("src", safe);
    if (a11y.decorative) {
      img.setAttribute("alt", "");
      img.setAttribute("role", "presentation");
    } else {
      img.setAttribute("alt", a11y.alt);
    }

    const loader = doc.createElement("div");
    loader.setAttribute("class", "canvas-image-block__loader");
    loader.setAttribute("aria-hidden", "true");
    if (props.imageLoading === false) {
      loader.setAttribute("hidden", "true");
      el.setAttribute("data-status", "ready");
    }

    img.onload = () => {
      el.setAttribute("data-status", "ready");
      el.removeAttribute("data-broken");
      loader.setAttribute("hidden", "true");
      img.removeAttribute("data-broken");
    };
    img.onerror = () => {
      el.setAttribute("data-broken", "true");
      el.setAttribute("data-status", "error");
      el.removeAttribute("style");
      setClass(el, "canvas-image-block canvas-image-block--error");
      clearChildren(el);
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute("aria-label", "Image failed to load");
      fb.textContent = "Image failed to load";
      el.appendChild(fb);
    };

    el.appendChild(img);
    el.appendChild(loader);
  },
});

export default ImageBlock;

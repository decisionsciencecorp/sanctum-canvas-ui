/**
 * A6.10 — ImageText / ImageTextLarge composites (safeUrl on src).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  resolveSafeUrl,
  setClass,
} from "./shared.js";
import { setInlineStyle } from "../../renderer/inlineStyle.js";

const LAYOUTS = new Set(["horizontal", "vertical"]);

/**
 * @param {"ImageText" | "ImageTextLarge"} name
 * @param {{ defaultLayout?: string, large?: boolean }} opts
 */
function createImageText(name, opts = {}) {
  return lifecycle({
    mount(doc) {
      const el = doc.createElement("div");
      el.setAttribute("data-canvas-component", name);
      return el;
    },
    patch(el, props = {}, ctx = {}) {
      const doc = ctx.document ?? el.ownerDocument;
      const layout = opts.large
        ? "vertical"
        : LAYOUTS.has(asText(props.layout))
          ? asText(props.layout)
          : opts.defaultLayout || "horizontal";
      const bold = props.bold === true;
      const title = asText(props.title);
      const subtitle = asText(props.subtitle);
      const alt = asText(props.alt) || title || "Image";
      const safe = resolveSafeUrl(props.src, ctx);

      let cls = `canvas-image-text canvas-image-text--${layout}`;
      if (opts.large) cls += " canvas-image-text--large";
      if (bold) cls += " canvas-image-text--bold";
      setClass(el, cls);
      el.setAttribute("data-layout", layout);

      clearChildren(el);

      const imgWrap = doc.createElement("div");
      imgWrap.setAttribute("class", "canvas-image-text__image-container");
      if (!opts.large && props.imageSize != null) {
        const size =
          typeof props.imageSize === "number"
            ? `${props.imageSize}px`
            : asText(props.imageSize);
        if (size) {
          setInlineStyle(imgWrap, { width: size, height: size });
        }
      }

      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("class", "canvas-image-text__image");
        img.setAttribute("src", safe);
        img.setAttribute("alt", alt);
        imgWrap.appendChild(img);
        el.setAttribute("data-status", "ready");
      } else {
        const fb = doc.createElement("div");
        fb.setAttribute("class", "canvas-image-text__fallback");
        fb.setAttribute("role", "img");
        fb.setAttribute("aria-label", props.src ? "Unsafe image URL blocked" : "Image unavailable");
        fb.textContent = props.src ? "Blocked" : "—";
        imgWrap.appendChild(fb);
        el.setAttribute("data-status", props.src ? "error" : "empty");
      }
      el.appendChild(imgWrap);

      const content = doc.createElement("div");
      content.setAttribute("class", "canvas-image-text__content");
      const titleEl = doc.createElement("div");
      titleEl.setAttribute("class", "canvas-image-text__title");
      titleEl.textContent = title;
      content.appendChild(titleEl);
      if (subtitle) {
        const sub = doc.createElement("div");
        sub.setAttribute("class", "canvas-image-text__subtitle");
        sub.textContent = subtitle;
        content.appendChild(sub);
      }
      el.appendChild(content);
    },
  });
}

export const ImageText = createImageText("ImageText", { defaultLayout: "horizontal" });
export const ImageTextLarge = createImageText("ImageTextLarge", { large: true });

export default ImageText;

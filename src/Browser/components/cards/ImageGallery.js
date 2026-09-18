/**
 * A6.10 — ImageGallery: responsive grid + optional lightbox (Modal-like).
 * All src via urlPolicy.safeUrl; blocked URLs never render as active images.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  resolveSafeUrl,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

const MAX_GRID_IMAGES = 5;

/**
 * @param {number} n
 * @returns {string}
 */
export function galleryLayoutClass(n) {
  switch (n) {
    case 1:
      return "canvas-gallery--single";
    case 2:
      return "canvas-gallery--double";
    case 3:
      return "canvas-gallery--triple";
    case 4:
      return "canvas-gallery--quad";
    default:
      return "canvas-gallery--default";
  }
}

/**
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>[]}
 */
export function normalizeGalleryImages(props = {}) {
  const raw = Array.isArray(props.images) ? props.images : [];
  return raw
    .map((img) => {
      if (!img || typeof img !== "object") return null;
      const o = /** @type {Record<string, unknown>} */ (img);
      if (o.props && typeof o.props === "object") {
        return /** @type {Record<string, unknown>} */ (o.props);
      }
      return o;
    })
    .filter(Boolean);
}

/** @type {WeakMap<Element, GalleryState>} */
const STATE = new WeakMap();

/**
 * @typedef {{
 *   open: boolean,
 *   selected: number,
 *   onKey: ((e: KeyboardEvent) => void) | null,
 * }} GalleryState
 */

function ensureState(el) {
  let s = STATE.get(el);
  if (!s) {
    s = { open: false, selected: 0, onKey: null };
    STATE.set(el, s);
  }
  return s;
}

/**
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>[]} images
 * @param {Record<string, unknown>} ctx
 * @param {GalleryState} state
 */
function renderLightbox(el, doc, images, ctx, state) {
  let overlay = null;
  for (const child of el.childNodes) {
    if (child.nodeType === 1 && /** @type {Element} */ (child).getAttribute?.("data-role") === "lightbox") {
      overlay = /** @type {Element} */ (child);
      break;
    }
  }
  if (!state.open) {
    if (overlay) el.removeChild(overlay);
    if (state.onKey) {
      doc.removeEventListener?.("keydown", state.onKey);
      state.onKey = null;
    }
    return;
  }

  if (!overlay) {
    overlay = doc.createElement("div");
    overlay.setAttribute("class", "canvas-gallery__lightbox");
    overlay.setAttribute("data-role", "lightbox");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image gallery");
    el.appendChild(overlay);
  }
  clearChildren(overlay);

  const closeBtn = doc.createElement("button");
  closeBtn.setAttribute("type", "button");
  closeBtn.setAttribute("class", "canvas-gallery__lightbox-close");
  closeBtn.setAttribute("aria-label", "Close gallery");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => {
    state.open = false;
    renderLightbox(el, doc, images, ctx, state);
  });
  overlay.appendChild(closeBtn);

  const imgData = images[state.selected] || images[0];
  const safe = imgData ? resolveSafeUrl(imgData.src, ctx) : undefined;
  const figure = doc.createElement("div");
  figure.setAttribute("class", "canvas-gallery__lightbox-figure");
  if (safe) {
    const img = doc.createElement("img");
    img.setAttribute("src", safe);
    img.setAttribute(
      "alt",
      asText(imgData.alt) || `Gallery image ${state.selected + 1}`,
    );
    figure.appendChild(img);
  } else {
    const fb = doc.createElement("div");
    fb.setAttribute("class", "canvas-gallery__fallback");
    fb.textContent = "Image unavailable";
    figure.appendChild(fb);
  }
  overlay.appendChild(figure);

  if (asText(imgData?.details)) {
    const details = doc.createElement("p");
    details.setAttribute("class", "canvas-gallery__lightbox-details");
    details.textContent = asText(imgData.details);
    overlay.appendChild(details);
  }

  if (images.length > 1) {
    const nav = doc.createElement("div");
    nav.setAttribute("class", "canvas-gallery__lightbox-nav");
    const prev = doc.createElement("button");
    prev.setAttribute("type", "button");
    prev.setAttribute("aria-label", "Previous image");
    prev.textContent = "‹";
    prev.addEventListener("click", () => {
      state.selected = (state.selected - 1 + images.length) % images.length;
      renderLightbox(el, doc, images, ctx, state);
    });
    const next = doc.createElement("button");
    next.setAttribute("type", "button");
    next.setAttribute("aria-label", "Next image");
    next.textContent = "›";
    next.addEventListener("click", () => {
      state.selected = (state.selected + 1) % images.length;
      renderLightbox(el, doc, images, ctx, state);
    });
    nav.appendChild(prev);
    nav.appendChild(next);
    overlay.appendChild(nav);
  }

  if (!state.onKey) {
    state.onKey = (e) => {
      if (e.key === "Escape") {
        state.open = false;
        renderLightbox(el, doc, images, ctx, state);
      }
    };
    doc.addEventListener?.("keydown", state.onKey);
  }
}

export const ImageGallery = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ImageGallery");
    ensureState(el);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const state = ensureState(el);
    const images = normalizeGalleryImages(props);
    const layout = galleryLayoutClass(images.length);
    setClass(el, `canvas-gallery ${layout}`);
    el.setAttribute("data-count", String(images.length));

    // Preserve lightbox open across patches; rebuild grid.
    /** @type {Element | null} */
    let lightbox = null;
    for (const child of [...el.childNodes]) {
      if (
        child.nodeType === 1 &&
        /** @type {Element} */ (child).getAttribute?.("data-role") === "lightbox"
      ) {
        lightbox = /** @type {Element} */ (child);
      } else {
        el.removeChild(child);
      }
    }

    const grid = doc.createElement("div");
    grid.setAttribute("class", "canvas-gallery__grid");

    const visible = images.slice(0, MAX_GRID_IMAGES);
    for (let i = 0; i < visible.length; i++) {
      const image = visible[i];
      const cell = doc.createElement("div");
      let cellCls = "canvas-gallery__image";
      if (i === 0) cellCls += " canvas-gallery__image--main";
      setClass(cell, cellCls);
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute(
        "aria-label",
        asText(image.alt) || `Open gallery image ${i + 1}`,
      );

      const safe = resolveSafeUrl(image.src, ctx);
      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("src", safe);
        img.setAttribute("alt", asText(image.alt) || `Gallery image ${i + 1}`);
        cell.appendChild(img);
      } else {
        const fb = doc.createElement("div");
        fb.setAttribute("class", "canvas-gallery__fallback");
        fb.setAttribute("role", "img");
        fb.setAttribute(
          "aria-label",
          image.src ? "Unsafe image URL blocked" : "Image unavailable",
        );
        fb.textContent = image.src ? "Blocked" : "—";
        cell.appendChild(fb);
        setOrRemoveAttr(cell, "data-blocked", "true");
      }

      const openAt = () => {
        state.selected = i;
        state.open = true;
        renderLightbox(el, doc, images, ctx, state);
      };
      cell.addEventListener("click", openAt);
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault?.();
          openAt();
        }
      });
      grid.appendChild(cell);
    }

    if (images.length > MAX_GRID_IMAGES) {
      const showAll = doc.createElement("div");
      showAll.setAttribute("class", "canvas-gallery__show-all-button");
      const btn = doc.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("class", "canvas-gallery__show-all");
      btn.textContent = "Show All";
      btn.addEventListener("click", () => {
        state.selected = 0;
        state.open = true;
        renderLightbox(el, doc, images, ctx, state);
      });
      showAll.appendChild(btn);
      grid.appendChild(showAll);
    }

    el.insertBefore(grid, lightbox);
    if (state.open) renderLightbox(el, doc, images, ctx, state);
  },
  unmount(el, ctx = {}) {
    const state = STATE.get(el);
    const doc = ctx.document ?? el.ownerDocument;
    if (state?.onKey) {
      doc.removeEventListener?.("keydown", state.onKey);
      state.onKey = null;
    }
    STATE.delete(el);
  },
});

export default ImageGallery;

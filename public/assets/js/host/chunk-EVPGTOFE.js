import {
  asText,
  clearChildren,
  lifecycle,
  requireDocument,
  setClass
} from "./chunk-23WAPPGV.js";
import "./chunk-MLKGABMK.js";

// src/Browser/components/containers/Carousel.js
var VARIANTS = /* @__PURE__ */ new Set(["card", "sunk"]);
var STATE = /* @__PURE__ */ new WeakMap();
function slideStructureSignature(slide) {
  if (!Array.isArray(slide)) return "";
  return slide.map((n) => {
    if (n == null || n === false) return "";
    if (typeof n === "string" || typeof n === "number") return "#text";
    if (typeof n === "object" && n !== null && "type" in n) {
      return String(
        /** @type {{ type: unknown }} */
        n.type
      );
    }
    return "?";
  }).join("|");
}
function enforceSlideStructure(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return { ok: true, slides: [], signature: "", dropped: 0 };
  }
  let signature = "";
  for (const slide of slides) {
    const sig = slideStructureSignature(Array.isArray(slide) ? slide : [slide]);
    if (sig) {
      signature = sig;
      break;
    }
  }
  if (!signature) {
    return { ok: true, slides: (
      /** @type {unknown[][]} */
      slides
    ), signature: "", dropped: 0 };
  }
  const kept = [];
  let dropped = 0;
  for (const raw of slides) {
    const slide = Array.isArray(raw) ? raw : [raw];
    if (slideStructureSignature(slide) === signature) kept.push(slide);
    else dropped += 1;
  }
  return { ok: dropped === 0, slides: kept, signature, dropped };
}
function normalizeSlides(props = {}) {
  const kids = props.children;
  if (!Array.isArray(kids)) return [];
  if (kids.length === 0) return [];
  if (Array.isArray(kids[0])) {
    return (
      /** @type {unknown[][]} */
      kids.map((s) => Array.isArray(s) ? s : [s])
    );
  }
  return kids.map((k) => Array.isArray(k) ? k : [k]);
}
function normalizeVariant(props = {}) {
  const v = asText(props.variant) || "card";
  return VARIANTS.has(v) ? v : "card";
}
function prefersReducedMotion(doc) {
  try {
    const view = (
      /** @type {{ matchMedia?: (q: string) => { matches: boolean } }} */
      doc.defaultView ?? globalThis
    );
    if (typeof view.matchMedia === "function") {
      return !!view.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  } catch {
  }
  return false;
}
function slideEls(track) {
  return [...track.childNodes ?? []].filter(
    (n) => n.nodeType === 1 && /** @type {Element} */
    n.getAttribute?.("data-canvas-carousel-slide") != null
  );
}
function indexFromScroll(track) {
  const slides = slideEls(track);
  if (slides.length === 0) return 0;
  const left = Number(track.scrollLeft) || 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < slides.length; i++) {
    const el = (
      /** @type {Element & { offsetLeft?: number }} */
      slides[i]
    );
    const offset = typeof el.offsetLeft === "number" ? el.offsetLeft : i * 280;
    const dist = Math.abs(offset - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
function goTo(state, index, opts = {}) {
  const slides = slideEls(state.track);
  if (slides.length === 0) return;
  const i = Math.max(0, Math.min(slides.length - 1, index));
  state.index = i;
  const target = (
    /** @type {Element & { offsetLeft?: number }} */
    slides[i]
  );
  const left = typeof target.offsetLeft === "number" ? target.offsetLeft : i * 280;
  const behavior = opts.instant || state.reducedMotion ? "auto" : "smooth";
  if (typeof /** @type {{ scrollTo?: Function }} */
  state.track.scrollTo === "function") {
    state.track.scrollTo({ left, behavior });
  } else {
    state.track.scrollLeft = left;
  }
  state.scrollLeft = left;
  syncChrome(state);
}
function syncChrome(state) {
  const slides = slideEls(state.track);
  const n = slides.length;
  const i = n === 0 ? 0 : Math.min(state.index, n - 1);
  state.index = i;
  const label = n === 0 ? "No slides" : `Slide ${i + 1} of ${n}`;
  state.status.textContent = label;
  state.track.setAttribute("aria-label", label);
  if (i <= 0) state.prevBtn.setAttribute("disabled", "");
  else state.prevBtn.removeAttribute("disabled");
  if (i >= n - 1 || n === 0) state.nextBtn.setAttribute("disabled", "");
  else state.nextBtn.removeAttribute("disabled");
  for (let s = 0; s < slides.length; s++) {
    const el = slides[s];
    el.setAttribute("aria-hidden", s === i ? "false" : "true");
    el.setAttribute("data-active", s === i ? "true" : "false");
  }
}
function renderSlides(root, slides, ctx, state) {
  const track = state.track;
  const prevLeft = Number(track.scrollLeft) || state.scrollLeft || 0;
  const prevIndex = state.index;
  clearChildren(track);
  const doc = requireDocument(ctx);
  slides.forEach((slide, i) => {
    const wrap = doc.createElement("div");
    wrap.setAttribute("class", "canvas-carousel__slide");
    wrap.setAttribute("data-canvas-carousel-slide", String(i));
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-roledescription", "slide");
    wrap.setAttribute("aria-label", `Slide ${i + 1} of ${slides.length}`);
    try {
      const desc = Object.getOwnPropertyDescriptor(wrap, "offsetLeft");
      const proto = Object.getPrototypeOf(wrap);
      const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, "offsetLeft") : void 0;
      const hasLayoutGetter = !!(protoDesc && protoDesc.get && !protoDesc.set);
      if (!hasLayoutGetter && (!desc || desc.writable)) {
        wrap.offsetLeft = i * 280;
      }
    } catch {
    }
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(wrap, slide);
    } else {
      for (const part of slide) {
        if (typeof part === "string" || typeof part === "number") {
          wrap.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    track.appendChild(wrap);
  });
  if (slides.length === 0) {
    state.index = 0;
    state.scrollLeft = 0;
  } else if (prevIndex < slides.length) {
    goTo(state, prevIndex, { instant: true });
  } else {
    track.scrollLeft = Math.min(prevLeft, (slides.length - 1) * 280);
    state.scrollLeft = track.scrollLeft;
    state.index = indexFromScroll(track);
    syncChrome(state);
  }
}
var Carousel = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const root = doc.createElement("div");
    root.setAttribute("data-canvas-component", "Carousel");
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    const track = doc.createElement("div");
    track.setAttribute("class", "canvas-carousel__track");
    track.setAttribute("data-canvas-carousel-track", "");
    track.setAttribute("tabindex", "0");
    track.setAttribute("role", "group");
    const prevBtn = doc.createElement("button");
    prevBtn.setAttribute("type", "button");
    prevBtn.setAttribute("class", "canvas-carousel__btn canvas-carousel__btn--prev");
    prevBtn.setAttribute("aria-label", "Previous slide");
    prevBtn.textContent = "\u2039";
    const nextBtn = doc.createElement("button");
    nextBtn.setAttribute("type", "button");
    nextBtn.setAttribute("class", "canvas-carousel__btn canvas-carousel__btn--next");
    nextBtn.setAttribute("aria-label", "Next slide");
    nextBtn.textContent = "\u203A";
    const status = doc.createElement("div");
    status.setAttribute("class", "canvas-carousel__status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    root.appendChild(prevBtn);
    root.appendChild(track);
    root.appendChild(nextBtn);
    root.appendChild(status);
    const state = {
      index: 0,
      scrollLeft: 0,
      track,
      status,
      prevBtn,
      nextBtn,
      reducedMotion: prefersReducedMotion(doc),
      signature: "",
      onKey: () => {
      },
      onScroll: () => {
      },
      onPrev: () => {
      },
      onNext: () => {
      }
    };
    state.onPrev = () => goTo(state, state.index - 1);
    state.onNext = () => goTo(state, state.index + 1);
    state.onScroll = () => {
      state.scrollLeft = Number(track.scrollLeft) || 0;
      state.index = indexFromScroll(track);
      syncChrome(state);
    };
    state.onKey = (e) => {
      const key = e?.key;
      if (key === "ArrowLeft" || key === "Left") {
        e.preventDefault?.();
        state.onPrev();
      } else if (key === "ArrowRight" || key === "Right") {
        e.preventDefault?.();
        state.onNext();
      } else if (key === "Home") {
        e.preventDefault?.();
        goTo(state, 0);
      } else if (key === "End") {
        e.preventDefault?.();
        goTo(state, slideEls(track).length - 1);
      }
    };
    if (typeof prevBtn.addEventListener === "function") {
      prevBtn.addEventListener("click", state.onPrev);
      nextBtn.addEventListener("click", state.onNext);
      track.addEventListener("keydown", state.onKey);
      track.addEventListener("scroll", state.onScroll, { passive: true });
    }
    STATE.set(root, state);
    return root;
  },
  patch(el, props = {}, ctx = {}) {
    const state = STATE.get(el);
    if (!state) return;
    const doc = requireDocument(ctx);
    const variant = normalizeVariant(props);
    state.reducedMotion = prefersReducedMotion(doc);
    setClass(
      el,
      `canvas-carousel canvas-carousel--${variant}${state.reducedMotion ? " canvas-carousel--reduced-motion" : ""}`
    );
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-reduced-motion", state.reducedMotion ? "true" : "false");
    const raw = normalizeSlides(props);
    const enforced = enforceSlideStructure(raw);
    state.signature = enforced.signature;
    if (!enforced.ok) {
      el.setAttribute("data-structure-error", "true");
      el.setAttribute(
        "data-structure-dropped",
        String(enforced.dropped)
      );
    } else {
      el.removeAttribute("data-structure-error");
      el.removeAttribute("data-structure-dropped");
    }
    if (enforced.signature) {
      el.setAttribute("data-slide-signature", enforced.signature);
    } else {
      el.removeAttribute("data-slide-signature");
    }
    renderSlides(el, enforced.slides, ctx, state);
  },
  unmount(el) {
    const state = STATE.get(el);
    if (!state) return;
    if (typeof state.prevBtn.removeEventListener === "function") {
      state.prevBtn.removeEventListener("click", state.onPrev);
      state.nextBtn.removeEventListener("click", state.onNext);
      state.track.removeEventListener("keydown", state.onKey);
      state.track.removeEventListener("scroll", state.onScroll);
    }
    STATE.delete(el);
  }
});

// src/Browser/components/containers/Modal.js
var SIZES = /* @__PURE__ */ new Set(["sm", "md", "lg"]);
var STATE2 = /* @__PURE__ */ new WeakMap();
var SCROLL_LOCK = /* @__PURE__ */ new WeakMap();
function normalizeSize(props = {}) {
  const s = asText(props.size) || "md";
  return SIZES.has(s) ? s : "md";
}
function resolveOpen(props = {}) {
  const o = props.open;
  if (o === true || o === false) return o;
  if (o && typeof o === "object") {
    if (typeof /** @type {{ get?: unknown }} */
    o.get === "function") {
      return !!/** @type {{ get: () => unknown }} */
      o.get();
    }
    if ("value" in /** @type {object} */
    o) {
      return !!/** @type {{ value: unknown }} */
      o.value;
    }
  }
  return false;
}
function writeOpen(props, value, ctx = {}) {
  const o = props.open;
  if (o && typeof o === "object" && typeof /** @type {{ set?: unknown }} */
  o.set === "function") {
    o.set(value);
  }
  if (typeof props.onOpenChange === "function") {
    props.onOpenChange(value);
  }
  if (typeof ctx.onOpenChange === "function") {
    ctx.onOpenChange(value);
  }
}
function focusableElements(root) {
  const out = [];
  const walk = (n) => {
    if (!n || n.nodeType !== 1) return;
    const el = (
      /** @type {Element} */
      n
    );
    if (el.getAttribute?.("disabled") != null) {
    } else {
      const tag = (el.tagName || "").toLowerCase();
      const tabindex = el.getAttribute?.("tabindex");
      const focusableTag = tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea" || tag === "summary";
      const tabIdx = tabindex == null ? null : Number(tabindex);
      if (focusableTag || tabIdx != null && !Number.isNaN(tabIdx) && tabIdx >= 0) {
        if (el.getAttribute?.("hidden") == null) out.push(el);
      }
    }
    for (const c of el.childNodes ?? []) walk(c);
  };
  walk(root);
  return out;
}
function setScrollLock(doc, lock) {
  const body = doc.body;
  if (!body) return;
  let count = SCROLL_LOCK.get(doc) ?? 0;
  if (lock) {
    count += 1;
    SCROLL_LOCK.set(doc, count);
    if (count === 1) {
      body.setAttribute("data-canvas-scroll-lock", "1");
      if (body.style) body.style.overflow = "hidden";
      else body.setAttribute("style", "overflow: hidden");
    }
  } else {
    count = Math.max(0, count - 1);
    SCROLL_LOCK.set(doc, count);
    if (count === 0) {
      body.removeAttribute("data-canvas-scroll-lock");
      if (body.style) body.style.overflow = "";
      else body.removeAttribute("style");
    }
  }
}
function applyOpen(dialog, state, open, props, ctx) {
  const doc = requireDocument(ctx);
  const wasOpen = state.open;
  if (open && !wasOpen) {
    state.restoreFocus = (props.trigger && typeof props.trigger.focus === "function" ? (
      /** @type {Element} */
      props.trigger
    ) : null) || (doc.activeElement && doc.activeElement !== dialog ? (
      /** @type {Element} */
      doc.activeElement
    ) : state.restoreFocus);
    state.propsRef = props;
    state.ctxRef = ctx;
    const finishOpen = () => {
      setScrollLock(doc, true);
      state.open = true;
      dialog.setAttribute("data-open", "true");
      queueMicrotaskOrNow(() => {
        if (!state.open) return;
        const focusables = focusableElements(dialog);
        const preferred = focusables.find((el) => el !== state.closeBtn) || state.closeBtn || dialog;
        preferred.focus?.();
      });
    };
    let shown = false;
    try {
      if (typeof /** @type {{ showModal?: Function }} */
      dialog.showModal === "function") {
        dialog.showModal();
        shown = true;
      } else {
        dialog.setAttribute("open", "");
        dialog.open = true;
        shown = true;
      }
    } catch {
      shown = false;
    }
    if (!shown) {
      queueMicrotaskOrNow(() => {
        if (!resolveOpen(state.propsRef) || state.open) return;
        try {
          if (typeof /** @type {{ showModal?: Function }} */
          dialog.showModal === "function") {
            dialog.showModal();
          } else {
            dialog.setAttribute("open", "");
            dialog.open = true;
          }
          finishOpen();
        } catch {
        }
      });
      return;
    }
    finishOpen();
  } else if (!open && wasOpen) {
    if (typeof /** @type {{ close?: Function }} */
    dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      dialog.open = false;
    }
    setScrollLock(doc, false);
    state.open = false;
    dialog.setAttribute("data-open", "false");
    const restore = state.restoreFocus;
    state.restoreFocus = null;
    queueMicrotaskOrNow(() => {
      restore?.focus?.();
    });
  }
}
function queueMicrotaskOrNow(fn) {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else fn();
}
function requestClose(dialog, state) {
  writeOpen(state.propsRef, false, state.ctxRef);
  applyOpen(dialog, state, false, state.propsRef, state.ctxRef);
}
var Modal = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const dialog = doc.createElement("dialog");
    dialog.setAttribute("data-canvas-component", "Modal");
    dialog.setAttribute("class", "canvas-modal");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", "dialog");
    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-modal__header");
    const titleEl = doc.createElement("h2");
    titleEl.setAttribute("class", "canvas-modal__title");
    const titleId = `canvas-modal-title-${Math.random().toString(36).slice(2, 9)}`;
    titleEl.setAttribute("id", titleId);
    dialog.setAttribute("aria-labelledby", titleId);
    const closeBtn = doc.createElement("button");
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("class", "canvas-modal__close");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\xD7";
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    const bodyEl = doc.createElement("div");
    bodyEl.setAttribute("class", "canvas-modal__body");
    bodyEl.setAttribute("data-canvas-modal-body", "");
    dialog.appendChild(header);
    dialog.appendChild(bodyEl);
    const state = {
      open: false,
      titleEl,
      bodyEl,
      closeBtn,
      restoreFocus: null,
      propsRef: {},
      ctxRef: {},
      onKeyDown: () => {
      },
      onCancel: () => {
      },
      onClick: () => {
      },
      onCloseClick: () => {
      }
    };
    state.onCloseClick = () => requestClose(dialog, state);
    state.onCancel = (e) => {
      e?.preventDefault?.();
      requestClose(dialog, state);
    };
    state.onClick = (e) => {
      if (e?.target === dialog) {
        requestClose(dialog, state);
      }
    };
    state.onKeyDown = (e) => {
      if (!state.open) return;
      if (e?.key === "Escape") {
        e.preventDefault?.();
        requestClose(dialog, state);
        return;
      }
      if (e?.key !== "Tab") return;
      const focusables = focusableElements(dialog);
      if (focusables.length === 0) {
        e.preventDefault?.();
        dialog.focus?.();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = dialog.ownerDocument?.activeElement;
      if (e.shiftKey) {
        if (active === first || active === dialog) {
          e.preventDefault?.();
          last.focus?.();
        }
      } else if (active === last) {
        e.preventDefault?.();
        first.focus?.();
      }
    };
    if (typeof dialog.addEventListener === "function") {
      dialog.addEventListener("cancel", state.onCancel);
      dialog.addEventListener("click", state.onClick);
      dialog.addEventListener("keydown", state.onKeyDown);
      closeBtn.addEventListener("click", state.onCloseClick);
    }
    dialog.setAttribute("tabindex", "-1");
    STATE2.set(dialog, state);
    dialog.setAttribute("data-open", "false");
    return dialog;
  },
  patch(el, props = {}, ctx = {}) {
    const state = STATE2.get(el);
    if (!state) return;
    state.propsRef = props;
    state.ctxRef = ctx;
    const size = normalizeSize(props);
    setClass(el, `canvas-modal canvas-modal--${size}`);
    el.setAttribute("data-size", size);
    const title = asText(props.title) || "Dialog";
    state.titleEl.textContent = title;
    const kids = Array.isArray(props.children) ? props.children : null;
    if (kids && typeof ctx.renderChildren === "function") {
      ctx.renderChildren(state.bodyEl, kids);
    } else if (kids) {
      clearChildren(state.bodyEl);
      const doc = requireDocument(ctx);
      for (const part of kids) {
        if (typeof part === "string" || typeof part === "number") {
          state.bodyEl.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    const wantOpen = resolveOpen(props);
    applyOpen(el, state, wantOpen, props, ctx);
  },
  unmount(el, ctx = {}) {
    const state = STATE2.get(el);
    if (!state) return;
    if (state.open) {
      const doc = requireDocument(ctx);
      setScrollLock(doc, false);
      state.open = false;
    }
    if (typeof el.removeEventListener === "function") {
      el.removeEventListener("cancel", state.onCancel);
      el.removeEventListener("click", state.onClick);
      el.removeEventListener("keydown", state.onKeyDown);
      state.closeBtn.removeEventListener("click", state.onCloseClick);
    }
    STATE2.delete(el);
  }
});

// src/Browser/components/containers/registerCarouselModal.js
var CAROUSEL_MODAL_COMPONENTS = Object.freeze({
  Carousel,
  Modal
});
function registerCarouselModal(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCarouselModal: registry with register() required");
  }
  registry.register("Carousel", Carousel);
  registry.register("Modal", Modal);
  return registry;
}
var registerCarouselModal_default = registerCarouselModal;
export {
  CAROUSEL_MODAL_COMPONENTS,
  Carousel,
  Modal,
  registerCarouselModal_default as default,
  registerCarouselModal
};

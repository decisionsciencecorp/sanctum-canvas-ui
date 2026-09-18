/**
 * A5.6 — Carousel: native scroll-snap, labelled prev/next, keyboard,
 * slide position status, enforced homogeneous slide structure,
 * position preserve on keyed updates, prefers-reduced-motion.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  requireDocument,
  setClass,
} from "./shared.js";

/** @type {Set<string>} */
const VARIANTS = new Set(["card", "sunk"]);

/** @type {WeakMap<Element, CarouselState>} */
const STATE = new WeakMap();

/**
 * @typedef {{
 *   index: number,
 *   scrollLeft: number,
 *   track: Element,
 *   status: Element,
 *   prevBtn: Element,
 *   nextBtn: Element,
 *   onKey: (e: KeyboardEvent) => void,
 *   onScroll: () => void,
 *   onPrev: () => void,
 *   onNext: () => void,
 *   reducedMotion: boolean,
 *   signature: string,
 * }} CarouselState
 */

/**
 * Signature of one slide's child component types (order-sensitive).
 * @param {unknown[]} slide
 * @returns {string}
 */
export function slideStructureSignature(slide) {
  if (!Array.isArray(slide)) return "";
  return slide
    .map((n) => {
      if (n == null || n === false) return "";
      if (typeof n === "string" || typeof n === "number") return "#text";
      if (typeof n === "object" && n !== null && "type" in n) {
        return String(/** @type {{ type: unknown }} */ (n).type);
      }
      return "?";
    })
    .join("|");
}

/**
 * Enforce one child structure across all slides. Keeps slides matching the
 * first non-empty signature; drops mismatches.
 * @param {unknown[][]} slides
 * @returns {{
 *   ok: boolean,
 *   slides: unknown[][],
 *   signature: string,
 *   dropped: number,
 * }}
 */
export function enforceSlideStructure(slides) {
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
    return { ok: true, slides: /** @type {unknown[][]} */ (slides), signature: "", dropped: 0 };
  }
  /** @type {unknown[][]} */
  const kept = [];
  let dropped = 0;
  for (const raw of slides) {
    const slide = Array.isArray(raw) ? raw : [raw];
    if (slideStructureSignature(slide) === signature) kept.push(slide);
    else dropped += 1;
  }
  return { ok: dropped === 0, slides: kept, signature, dropped };
}

/**
 * Normalize props.children into an array of slides (each slide = content array).
 * @param {Record<string, unknown>} props
 * @returns {unknown[][]}
 */
export function normalizeSlides(props = {}) {
  const kids = props.children;
  if (!Array.isArray(kids)) return [];
  if (kids.length === 0) return [];
  // Canonical: array of arrays
  if (Array.isArray(kids[0])) {
    return /** @type {unknown[][]} */ (kids.map((s) => (Array.isArray(s) ? s : [s])));
  }
  // Flat list of vnodes → each vnode is its own slide
  return kids.map((k) => (Array.isArray(k) ? k : [k]));
}

/**
 * @param {Record<string, unknown>} [props]
 */
function normalizeVariant(props = {}) {
  const v = asText(props.variant) || "card";
  return VARIANTS.has(v) ? v : "card";
}

/**
 * @param {Document} doc
 * @returns {boolean}
 */
export function prefersReducedMotion(doc) {
  try {
    const view = /** @type {{ matchMedia?: (q: string) => { matches: boolean } }} */ (
      doc.defaultView ?? globalThis
    );
    if (typeof view.matchMedia === "function") {
      return !!view.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * @param {Element} track
 * @returns {Element[]}
 */
function slideEls(track) {
  return [...(track.childNodes ?? [])].filter(
    (n) =>
      n.nodeType === 1 &&
      /** @type {Element} */ (n).getAttribute?.("data-canvas-carousel-slide") != null,
  );
}

/**
 * @param {Element} track
 * @returns {number}
 */
function indexFromScroll(track) {
  const slides = slideEls(track);
  if (slides.length === 0) return 0;
  const left = Number(track.scrollLeft) || 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < slides.length; i++) {
    const el = /** @type {Element & { offsetLeft?: number }} */ (slides[i]);
    const offset = typeof el.offsetLeft === "number" ? el.offsetLeft : i * 280;
    const dist = Math.abs(offset - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * @param {CarouselState} state
 * @param {number} index
 * @param {{ instant?: boolean }} [opts]
 */
function goTo(state, index, opts = {}) {
  const slides = slideEls(state.track);
  if (slides.length === 0) return;
  const i = Math.max(0, Math.min(slides.length - 1, index));
  state.index = i;
  const target = /** @type {Element & { offsetLeft?: number }} */ (slides[i]);
  const left = typeof target.offsetLeft === "number" ? target.offsetLeft : i * 280;
  const behavior =
    opts.instant || state.reducedMotion ? "auto" : "smooth";
  if (typeof /** @type {{ scrollTo?: Function }} */ (state.track).scrollTo === "function") {
    /** @type {{ scrollTo: Function }} */ (state.track).scrollTo({ left, behavior });
  } else {
    state.track.scrollLeft = left;
  }
  state.scrollLeft = left;
  syncChrome(state);
}

/**
 * @param {CarouselState} state
 */
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

/**
 * @param {Element} root
 * @param {unknown[][]} slides
 * @param {Record<string, unknown>} ctx
 * @param {CarouselState} state
 */
function renderSlides(root, slides, ctx, state) {
  const track = state.track;
  // Preserve scroll position across keyed updates
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
    // miniDom lacks layout; stamp a synthetic offsetLeft only when writable.
    // Real browsers expose offsetLeft as a getter — assignment throws and must
    // not abort slide mount (A5.8 lab / Playwright).
    try {
      const desc = Object.getOwnPropertyDescriptor(wrap, "offsetLeft");
      const proto = Object.getPrototypeOf(wrap);
      const protoDesc = proto
        ? Object.getOwnPropertyDescriptor(proto, "offsetLeft")
        : undefined;
      const hasLayoutGetter = !!(protoDesc && protoDesc.get && !protoDesc.set);
      if (!hasLayoutGetter && (!desc || desc.writable)) {
        /** @type {any} */ (wrap).offsetLeft = i * 280;
      }
    } catch {
      /* ignore — layout getter in real DOM */
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

  // Restore position: prefer previous index if still in range, else scrollLeft
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

export const Carousel = lifecycle({
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
    prevBtn.textContent = "‹";

    const nextBtn = doc.createElement("button");
    nextBtn.setAttribute("type", "button");
    nextBtn.setAttribute("class", "canvas-carousel__btn canvas-carousel__btn--next");
    nextBtn.setAttribute("aria-label", "Next slide");
    nextBtn.textContent = "›";

    const status = doc.createElement("div");
    status.setAttribute("class", "canvas-carousel__status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");

    root.appendChild(prevBtn);
    root.appendChild(track);
    root.appendChild(nextBtn);
    root.appendChild(status);

    /** @type {CarouselState} */
    const state = {
      index: 0,
      scrollLeft: 0,
      track,
      status,
      prevBtn,
      nextBtn,
      reducedMotion: prefersReducedMotion(doc),
      signature: "",
      onKey: () => {},
      onScroll: () => {},
      onPrev: () => {},
      onNext: () => {},
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
      `canvas-carousel canvas-carousel--${variant}${
        state.reducedMotion ? " canvas-carousel--reduced-motion" : ""
      }`,
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
        String(enforced.dropped),
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
  },
});

/** @param {Element} el */
export function getCarouselState(el) {
  return STATE.get(el) ?? null;
}

export default Carousel;

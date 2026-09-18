/**
 * A5.7 — Modal: native <dialog> (or equivalent) with accessible title,
 * initial focus, Tab trap, Escape/backdrop close, scroll lock,
 * restore focus to trigger. Stream updates must not reset focus or
 * close unexpectedly.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  requireDocument,
  setClass,
} from "./shared.js";

/** @type {Set<string>} */
const SIZES = new Set(["sm", "md", "lg"]);

/** @type {WeakMap<Element, ModalState>} */
const STATE = new WeakMap();

/** Document-level scroll-lock refcount */
const SCROLL_LOCK = new WeakMap();

/**
 * @typedef {{
 *   open: boolean,
 *   titleEl: Element,
 *   bodyEl: Element,
 *   closeBtn: Element,
 *   restoreFocus: Element | null,
 *   onKeyDown: (e: KeyboardEvent) => void,
 *   onCancel: (e: Event) => void,
 *   onClick: (e: MouseEvent) => void,
 *   onCloseClick: () => void,
 *   propsRef: Record<string, unknown>,
 *   ctxRef: Record<string, unknown>,
 * }} ModalState
 */

/**
 * @param {Record<string, unknown>} [props]
 */
function normalizeSize(props = {}) {
  const s = asText(props.size) || "md";
  return SIZES.has(s) ? s : "md";
}

/**
 * Read open flag from boolean or binding { get/set }.
 * @param {Record<string, unknown>} props
 * @returns {boolean}
 */
export function resolveOpen(props = {}) {
  const o = props.open;
  if (o === true || o === false) return o;
  if (o && typeof o === "object") {
    if (typeof /** @type {{ get?: unknown }} */ (o).get === "function") {
      return !!/** @type {{ get: () => unknown }} */ (o).get();
    }
    if ("value" in /** @type {object} */ (o)) {
      return !!/** @type {{ value: unknown }} */ (o).value;
    }
  }
  // Default closed when unbound
  return false;
}

/**
 * Write open flag back to binding / onOpenChange.
 * @param {Record<string, unknown>} props
 * @param {boolean} value
 * @param {Record<string, unknown>} [ctx]
 */
export function writeOpen(props, value, ctx = {}) {
  const o = props.open;
  if (o && typeof o === "object" && typeof /** @type {{ set?: unknown }} */ (o).set === "function") {
    /** @type {{ set: (v: boolean) => void }} */ (o).set(value);
  }
  if (typeof props.onOpenChange === "function") {
    /** @type {(v: boolean) => void} */ (props.onOpenChange)(value);
  }
  if (typeof ctx.onOpenChange === "function") {
    ctx.onOpenChange(value);
  }
}

/**
 * Focusable descendants (miniDom-safe walk).
 * @param {Element} root
 * @returns {Element[]}
 */
export function focusableElements(root) {
  /** @type {Element[]} */
  const out = [];
  const walk = (n) => {
    if (!n || n.nodeType !== 1) return;
    const el = /** @type {Element} */ (n);
    if (el.getAttribute?.("disabled") != null) {
      /* skip */
    } else {
      const tag = (el.tagName || "").toLowerCase();
      const tabindex = el.getAttribute?.("tabindex");
      const focusableTag =
        tag === "button" ||
        tag === "a" ||
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        tag === "summary";
      const tabIdx = tabindex == null ? null : Number(tabindex);
      if (focusableTag || (tabIdx != null && !Number.isNaN(tabIdx) && tabIdx >= 0)) {
        if (el.getAttribute?.("hidden") == null) out.push(el);
      }
    }
    for (const c of el.childNodes ?? []) walk(c);
  };
  walk(root);
  return out;
}

/**
 * @param {Document} doc
 * @param {boolean} lock
 */
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

/**
 * @param {Element} dialog
 * @param {ModalState} state
 * @param {boolean} open
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function applyOpen(dialog, state, open, props, ctx) {
  const doc = requireDocument(ctx);
  const wasOpen = state.open;

  if (open && !wasOpen) {
    // Opening — capture trigger once
    state.restoreFocus =
      (props.trigger && typeof props.trigger.focus === "function"
        ? /** @type {Element} */ (props.trigger)
        : null) ||
      (doc.activeElement && doc.activeElement !== dialog
        ? /** @type {Element} */ (doc.activeElement)
        : state.restoreFocus);

    state.propsRef = props;
    state.ctxRef = ctx;

    const finishOpen = () => {
      setScrollLock(doc, true);
      state.open = true;
      dialog.setAttribute("data-open", "true");
      queueMicrotaskOrNow(() => {
        if (!state.open) return;
        const focusables = focusableElements(dialog);
        const preferred =
          focusables.find((el) => el !== state.closeBtn) ||
          state.closeBtn ||
          dialog;
        preferred.focus?.();
      });
    };

    /**
     * Native showModal() throws if the dialog is not in a Document yet
     * (common during create()+patch before reconciler append). miniDom's
     * stub succeeds without being connected — keep that sync path for tests.
     */
    let shown = false;
    try {
      if (typeof /** @type {{ showModal?: Function }} */ (dialog).showModal === "function") {
        /** @type {{ showModal: Function }} */ (dialog).showModal();
        shown = true;
      } else {
        dialog.setAttribute("open", "");
        /** @type {{ open: boolean }} */ (dialog).open = true;
        shown = true;
      }
    } catch {
      shown = false;
    }

    if (!shown) {
      queueMicrotaskOrNow(() => {
        if (!resolveOpen(state.propsRef) || state.open) return;
        try {
          if (typeof /** @type {{ showModal?: Function }} */ (dialog).showModal === "function") {
            /** @type {{ showModal: Function }} */ (dialog).showModal();
          } else {
            dialog.setAttribute("open", "");
            /** @type {{ open: boolean }} */ (dialog).open = true;
          }
          finishOpen();
        } catch {
          /* still not connectable — leave closed */
        }
      });
      return;
    }

    finishOpen();
  } else if (!open && wasOpen) {
    // Closing
    if (typeof /** @type {{ close?: Function }} */ (dialog).close === "function") {
      /** @type {{ close: Function }} */ (dialog).close();
    } else {
      dialog.removeAttribute("open");
      /** @type {{ open: boolean }} */ (dialog).open = false;
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
  // open && wasOpen → stream update: do NOT reset focus or re-show
  // !open && !wasOpen → stay closed
}

/**
 * @param {() => void} fn
 */
function queueMicrotaskOrNow(fn) {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else fn();
}

/**
 * Request close from user gesture (Escape / backdrop / X).
 * @param {Element} dialog
 * @param {ModalState} state
 */
function requestClose(dialog, state) {
  writeOpen(state.propsRef, false, state.ctxRef);
  applyOpen(dialog, state, false, state.propsRef, state.ctxRef);
}

export const Modal = lifecycle({
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
    closeBtn.textContent = "×";

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const bodyEl = doc.createElement("div");
    bodyEl.setAttribute("class", "canvas-modal__body");
    bodyEl.setAttribute("data-canvas-modal-body", "");

    dialog.appendChild(header);
    dialog.appendChild(bodyEl);

    /** @type {ModalState} */
    const state = {
      open: false,
      titleEl,
      bodyEl,
      closeBtn,
      restoreFocus: null,
      propsRef: {},
      ctxRef: {},
      onKeyDown: () => {},
      onCancel: () => {},
      onClick: () => {},
      onCloseClick: () => {},
    };

    state.onCloseClick = () => requestClose(dialog, state);

    state.onCancel = (e) => {
      e?.preventDefault?.();
      requestClose(dialog, state);
    };

    state.onClick = (e) => {
      // Backdrop: click directly on the dialog element (not descendants)
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

    // Make dialog programmatically focusable
    dialog.setAttribute("tabindex", "-1");
    STATE.set(dialog, state);
    dialog.setAttribute("data-open", "false");
    return dialog;
  },

  patch(el, props = {}, ctx = {}) {
    const state = STATE.get(el);
    if (!state) return;
    state.propsRef = props;
    state.ctxRef = ctx;

    const size = normalizeSize(props);
    setClass(el, `canvas-modal canvas-modal--${size}`);
    el.setAttribute("data-size", size);

    const title = asText(props.title) || "Dialog";
    state.titleEl.textContent = title;

    // Body children — only via props.children; reconciler may also append
    // under vnode.children into this element. Prefer body region.
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
    const state = STATE.get(el);
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
    STATE.delete(el);
  },
});

/** @param {Element} el */
export function getModalState(el) {
  return STATE.get(el) ?? null;
}

export default Modal;

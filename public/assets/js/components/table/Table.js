/**
 * A6.5 — Read-only Table (column-oriented contract → semantic thead/tbody).
 * No TanStack. Initial page size 10. Sort + display formatting. Keyboard-scrollable overflow.
 */

import {
  DEFAULT_PAGE_SIZE,
  applyTableStatus,
  asText,
  clearChildren,
  columnsToRows,
  formatCellDisplay,
  lifecycle,
  normalizeColumns,
  setClass,
  setOrRemoveAttr,
  sortRowIndices,
} from "./shared.js";

/**
 * @typedef {{
 *   page: number,
 *   sortCol: number | null,
 *   sortDir: "asc" | "desc",
 *   wired: boolean,
 *   onKey?: (e: Event) => void,
 *   onPrev?: () => void,
 *   onNext?: () => void,
 * }} TableState
 */

/** @type {WeakMap<Element, TableState>} */
const STATE = new WeakMap();

/**
 * Resolve columns from props.columns or Col-typed children.
 * @param {Record<string, unknown>} props
 * @returns {ReturnType<typeof normalizeColumns>}
 */
export function resolveTableColumns(props = {}) {
  if (Array.isArray(props.columns) && props.columns.length) {
    return normalizeColumns(props.columns);
  }
  if (Array.isArray(props.children) && props.children.length) {
    const cols = props.children.filter(
      (c) =>
        c &&
        typeof c === "object" &&
        (/** @type {{ type?: string }} */ (c).type === "Col" ||
          (/** @type {{ props?: object }} */ (c).props &&
            "label" in /** @type {object} */ (c.props ?? {}) &&
            "data" in /** @type {object} */ (c.props ?? {}))),
    );
    if (cols.length) return normalizeColumns(cols);
  }
  return [];
}

/**
 * @param {Element} host
 * @returns {TableState}
 */
function getState(host) {
  let s = STATE.get(host);
  if (!s) {
    s = { page: 0, sortCol: null, sortDir: "asc", wired: false };
    STATE.set(host, s);
  }
  return s;
}

/**
 * @param {Document} doc
 * @param {string} label
 * @returns {HTMLButtonElement}
 */
function makePageBtn(doc, label) {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.setAttribute("class", "canvas-table__page-btn");
  btn.setAttribute("aria-label", label);
  btn.textContent = label === "Previous page" ? "‹" : "›";
  return /** @type {HTMLButtonElement} */ (btn);
}

/**
 * Render a cell value into a td. Object vnodes go through renderChildren when available.
 * @param {Document} doc
 * @param {HTMLTableCellElement} td
 * @param {unknown} value
 * @param {string} type
 * @param {Record<string, unknown>} ctx
 */
function fillCell(doc, td, value, type, ctx) {
  clearChildren(td);
  if (
    value &&
    typeof value === "object" &&
    typeof ctx.renderChildren === "function" &&
    ("type" in /** @type {object} */ (value) || Array.isArray(value))
  ) {
    const kids = Array.isArray(value) ? value : [value];
    ctx.renderChildren(td, kids);
    return;
  }
  if (type === "action" && value && typeof value === "object") {
    const obj = /** @type {Record<string, unknown>} */ (value);
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("class", "canvas-table__action");
    btn.textContent = asText(obj.label) || "Action";
    if (typeof obj.onClick === "function") {
      btn.addEventListener("click", /** @type {EventListener} */ (obj.onClick));
    }
    td.appendChild(btn);
    return;
  }
  td.textContent = formatCellDisplay(value, type);
}

/**
 * Wire keyboard horizontal scroll once.
 * @param {Element} host
 * @param {Element} scrollEl
 * @param {TableState} state
 */
function ensureScrollKeyboard(host, scrollEl, state) {
  if (state.wired) return;
  state.wired = true;
  setOrRemoveAttr(scrollEl, "tabindex", "0");
  state.onKey = (e) => {
    const ev = /** @type {KeyboardEvent} */ (e);
    const target = /** @type {Element & { scrollLeft?: number, clientWidth?: number, scrollWidth?: number, scrollTo?: Function }} */ (
      scrollEl
    );
    if (ev.key === "ArrowRight") {
      ev.preventDefault?.();
      const next = (target.scrollLeft || 0) + Math.max(40, (target.clientWidth || 200) * 0.4);
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ left: next });
      } else {
        target.scrollLeft = next;
      }
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault?.();
      const next = Math.max(
        0,
        (target.scrollLeft || 0) - Math.max(40, (target.clientWidth || 200) * 0.4),
      );
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ left: next });
      } else {
        target.scrollLeft = next;
      }
    } else if (ev.key === "Home") {
      ev.preventDefault?.();
      if (typeof target.scrollTo === "function") target.scrollTo({ left: 0 });
      else target.scrollLeft = 0;
    } else if (ev.key === "End") {
      ev.preventDefault?.();
      const max = Math.max(0, (target.scrollWidth || 0) - (target.clientWidth || 0));
      if (typeof target.scrollTo === "function") target.scrollTo({ left: max });
      else target.scrollLeft = max;
    }
  };
  scrollEl.addEventListener("keydown", state.onKey);
}

/**
 * @param {Element} host
 * @returns {TableState | undefined}
 */
export function getTableState(host) {
  return STATE.get(host);
}

export const Table = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Table");
    el.setAttribute("class", "canvas-table");

    const statusSlot = doc.createElement("div");
    statusSlot.setAttribute("data-canvas-table-status", "");
    statusSlot.setAttribute("class", "canvas-table__status");
    el.appendChild(statusSlot);

    const scroll = doc.createElement("div");
    scroll.setAttribute("class", "canvas-table__scroll");
    scroll.setAttribute("data-canvas-table-scroll", "");
    el.appendChild(scroll);

    const table = doc.createElement("table");
    table.setAttribute("class", "canvas-table__grid");
    scroll.appendChild(table);

    const thead = doc.createElement("thead");
    thead.setAttribute("class", "canvas-table__head");
    table.appendChild(thead);

    const tbody = doc.createElement("tbody");
    tbody.setAttribute("class", "canvas-table__body");
    table.appendChild(tbody);

    const pager = doc.createElement("div");
    pager.setAttribute("class", "canvas-table__pager");
    pager.setAttribute("data-canvas-table-pager", "");
    pager.hidden = true;
    el.appendChild(pager);

    return el;
  },

  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const state = getState(el);
    const cols = resolveTableColumns(props);
    const pageSize =
      typeof props.pageSize === "number" && props.pageSize > 0
        ? Math.floor(props.pageSize)
        : DEFAULT_PAGE_SIZE;

    setClass(el, "canvas-table");

    const statusHost =
      [...(el.childNodes ?? [])].find(
        (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null,
      ) ?? el;
    const { status } = applyTableStatus(
      /** @type {Element} */ (statusHost),
      doc,
      props,
      ctx,
      { emptyMessage: asText(props.emptyMessage) || "No rows" },
    );
    el.setAttribute("data-status", status);
    setOrRemoveAttr(
      el,
      "aria-busy",
      status === "loading" || status === "refetching" ? "true" : null,
    );

    const scroll = [...(el.childNodes ?? [])].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null,
    );
    const pager = [...(el.childNodes ?? [])].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-pager") != null,
    );
    const table = scroll?.firstChild;
    const thead = table?.firstChild;
    const tbody = table?.childNodes?.[1];

    if (!scroll || !table || !thead || !tbody) return;

    ensureScrollKeyboard(el, /** @type {Element} */ (scroll), state);

    if (status === "loading" || status === "error") {
      clearChildren(/** @type {Element} */ (thead));
      clearChildren(/** @type {Element} */ (tbody));
      if (pager) /** @type {HTMLElement} */ (pager).hidden = true;
      return;
    }

    if (!cols.length) {
      applyTableStatus(/** @type {Element} */ (statusHost), doc, { ...props, status: "empty" }, ctx, {
        emptyMessage: asText(props.emptyMessage) || "No rows",
      });
      el.setAttribute("data-status", "empty");
      clearChildren(/** @type {Element} */ (thead));
      clearChildren(/** @type {Element} */ (tbody));
      if (pager) /** @type {HTMLElement} */ (pager).hidden = true;
      return;
    }

    const { rows, rowCount } = columnsToRows(cols);
    if (rowCount === 0 && status !== "refetching") {
      applyTableStatus(/** @type {Element} */ (statusHost), doc, { ...props, status: "empty" }, ctx, {
        emptyMessage: asText(props.emptyMessage) || "No rows",
      });
      el.setAttribute("data-status", "empty");
    } else if (status === "refetching") {
      // keep prior rows visible under busy cue
    } else if (statusHost.getAttribute?.("data-status") === "empty" && rowCount > 0) {
      applyTableStatus(/** @type {Element} */ (statusHost), doc, { ...props, status: "ready" }, ctx);
      el.setAttribute("data-status", "ready");
    }

    // Controlled sort props win; else internal click-sort state.
    let sortCol = state.sortCol;
    let sortDir = state.sortDir;
    if (props.sortBy != null) {
      if (typeof props.sortBy === "number") sortCol = props.sortBy;
      else {
        const label = asText(props.sortBy);
        const idx = cols.findIndex((c) => c.label === label || c.key === label);
        sortCol = idx >= 0 ? idx : null;
      }
    }
    if (props.sortDir === "asc" || props.sortDir === "desc") {
      sortDir = props.sortDir;
    }

    let order = rows.map((_, i) => i);
    if (sortCol != null && sortCol >= 0 && sortCol < cols.length) {
      order = sortRowIndices(rows, sortCol, sortDir, cols[sortCol].type);
    }

    const totalPages = Math.max(1, Math.ceil(order.length / pageSize));
    if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);
    if (typeof props.page === "number" && props.page >= 0) {
      state.page = Math.min(Math.floor(props.page), totalPages - 1);
    }
    const start = state.page * pageSize;
    const end = Math.min(start + pageSize, order.length);
    const pageOrder = order.slice(start, end);

    // Header
    clearChildren(/** @type {Element} */ (thead));
    const hr = doc.createElement("tr");
    hr.setAttribute("class", "canvas-table__row canvas-table__row--head");
    cols.forEach((col, ci) => {
      const th = doc.createElement("th");
      th.setAttribute("class", `canvas-table__th canvas-table__align-${col.align || "left"}`);
      th.setAttribute("scope", "col");
      th.setAttribute("data-col-type", col.type);
      th.setAttribute("data-col-key", col.key);
      const labelEl = doc.createElement("span");
      labelEl.setAttribute("class", "canvas-table__th-label");
      labelEl.textContent = col.label;
      th.appendChild(labelEl);
      if (col.sortable || props.sortable === true) {
        th.setAttribute("tabindex", "0");
        th.setAttribute("role", "button");
        const active = sortCol === ci;
        setOrRemoveAttr(th, "aria-sort", active ? (sortDir === "asc" ? "ascending" : "descending") : "none");
        const activate = () => {
          if (state.sortCol === ci) {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
          } else {
            state.sortCol = ci;
            state.sortDir = "asc";
          }
          Table.update(el, props, ctx);
        };
        th.addEventListener("click", activate);
        th.addEventListener("keydown", (e) => {
          const ev = /** @type {KeyboardEvent} */ (e);
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault?.();
            activate();
          }
        });
      }
      hr.appendChild(th);
    });
    /** @type {Element} */ (thead).appendChild(hr);

    // Body
    clearChildren(/** @type {Element} */ (tbody));
    for (const ri of pageOrder) {
      const tr = doc.createElement("tr");
      tr.setAttribute("class", "canvas-table__row");
      tr.setAttribute("data-row-index", String(ri));
      cols.forEach((col, ci) => {
        const td = doc.createElement("td");
        td.setAttribute("class", `canvas-table__td canvas-table__align-${col.align || "left"}`);
        td.setAttribute("data-col-type", col.type);
        fillCell(doc, /** @type {HTMLTableCellElement} */ (td), rows[ri][ci], col.type, ctx);
        tr.appendChild(td);
      });
      /** @type {Element} */ (tbody).appendChild(tr);
    }

    el.setAttribute("data-row-count", String(rowCount));
    el.setAttribute("data-page", String(state.page));
    el.setAttribute("data-page-size", String(pageSize));
    el.setAttribute("data-visible-rows", String(pageOrder.length));

    // Pager
    if (pager) {
      const p = /** @type {HTMLElement} */ (pager);
      if (totalPages > 1) {
        p.hidden = false;
        clearChildren(p);
        const prev = makePageBtn(doc, "Previous page");
        prev.disabled = state.page <= 0;
        prev.addEventListener("click", () => {
          if (state.page > 0) {
            state.page -= 1;
            Table.update(el, props, ctx);
          }
        });
        const info = doc.createElement("span");
        info.setAttribute("class", "canvas-table__page-info");
        info.setAttribute("aria-live", "polite");
        info.textContent = `${state.page + 1} / ${totalPages}`;
        const next = makePageBtn(doc, "Next page");
        next.disabled = state.page >= totalPages - 1;
        next.addEventListener("click", () => {
          if (state.page < totalPages - 1) {
            state.page += 1;
            Table.update(el, props, ctx);
          }
        });
        p.appendChild(prev);
        p.appendChild(info);
        p.appendChild(next);
      } else {
        p.hidden = true;
        clearChildren(p);
      }
    }
  },

  unmount(el) {
    const state = STATE.get(el);
    if (state?.onKey) {
      const scroll = [...(el.childNodes ?? [])].find(
        (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null,
      );
      scroll?.removeEventListener?.("keydown", state.onKey);
    }
    STATE.delete(el);
  },
});

export default Table;

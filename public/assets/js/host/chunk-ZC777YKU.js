import {
  validateField
} from "./chunk-VRTNI4I3.js";
import {
  safeUrl
} from "./chunk-LQVUHYG2.js";
import "./chunk-MLKGABMK.js";

// src/Browser/components/table/shared.js
var DEFAULT_PAGE_SIZE = 10;
var SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error",
  REFETCHING: "refetching"
});
var STATUS_LABELS = Object.freeze({
  ready: "",
  loading: "Loading",
  empty: "No rows",
  error: "Error",
  refetching: "Refreshing"
});
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("table component: ctx.document required");
  }
  return doc;
}
function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}
function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}
function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
function normalizeCol(raw, index) {
  if (raw == null) {
    return { label: "", data: [], type: "string", key: String(index) };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object" && (obj.type === "Col" || obj.label == null)) {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const label = asText(obj.label ?? obj.header);
  const type = asText(obj.type) || "string";
  const key = asText(obj.key) || String(index);
  const align = asText(obj.align);
  return {
    label,
    data: asArray(obj.data),
    type,
    key,
    sortable: obj.sortable === true,
    align: align === "center" || align === "right" ? align : "left"
  };
}
function normalizeColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c, i) => normalizeCol(c, i));
}
function columnsToRows(cols) {
  const labels = cols.map((c) => c.label);
  const rowCount = cols.length ? Math.max(...cols.map((c) => c.data.length), 0) : 0;
  const rows = [];
  for (let r = 0; r < rowCount; r++) {
    rows.push(cols.map((c) => r < c.data.length ? c.data[r] : ""));
  }
  return { labels, rows, rowCount };
}
function formatCellDisplay(value, type = "string") {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value && typeof value === "object" && "label" in /** @type {object} */
    value) {
      return asText(
        /** @type {{ label?: unknown }} */
        value.label
      );
    }
    return "";
  }
  if (type === "number" || type === "action") {
    if (typeof value === "number" && Number.isFinite(value)) {
      try {
        return value.toLocaleString();
      } catch {
        return String(value);
      }
    }
  }
  return asText(value);
}
function sortRowIndices(rows, colIndex, dir = "asc", type = "string") {
  const indices = rows.map((_, i) => i);
  const mult = dir === "desc" ? -1 : 1;
  indices.sort((a, b) => {
    const va = rows[a]?.[colIndex];
    const vb = rows[b]?.[colIndex];
    if (type === "number") {
      const na = Number(va);
      const nb = Number(vb);
      const aOk = Number.isFinite(na);
      const bOk = Number.isFinite(nb);
      if (aOk && bOk) return (na - nb) * mult;
      if (aOk) return -1 * mult;
      if (bOk) return 1 * mult;
      return 0;
    }
    const sa = asText(va).toLowerCase();
    const sb = asText(vb).toLowerCase();
    if (sa < sb) return -1 * mult;
    if (sa > sb) return 1 * mult;
    return 0;
  });
  return indices;
}
function resolveTableStatus(props = {}, ctx = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready" || raw === "refetching") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.refetching === true || props.isRefetching === true) return "refetching";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  const query = ctx.query;
  if (query && typeof query === "object") {
    const loading = (
      /** @type {{ __openui_loading?: unknown[] }} */
      query.__openui_loading
    );
    const refetching = (
      /** @type {{ __openui_refetching?: unknown[] }} */
      query.__openui_refetching
    );
    const errors = (
      /** @type {{ __openui_errors?: unknown[] }} */
      query.__openui_errors
    );
    if (Array.isArray(errors) && errors.length > 0) return "error";
    if (Array.isArray(loading) && loading.length > 0) return "loading";
    if (Array.isArray(refetching) && refetching.length > 0) return "refetching";
  }
  return "ready";
}
var statusTextByHost = /* @__PURE__ */ new WeakMap();
function findStatusTextChild(el) {
  const cached = statusTextByHost.get(el);
  if (cached && cached.parentNode === el) return cached;
  for (const child of el.childNodes ?? []) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      statusTextByHost.set(el, child);
      return child;
    }
  }
  return null;
}
function applyTableStatus(el, doc, props = {}, ctx = {}, opts = {}) {
  const status = resolveTableStatus(props, ctx);
  el.setAttribute("data-status", status);
  setOrRemoveAttr(
    el,
    "aria-busy",
    status === "loading" || status === "refetching" ? "true" : null
  );
  let statusEl = findStatusTextChild(el);
  const show = opts.showStatusText !== false && (status === "loading" || status === "empty" || status === "error" || status === "refetching");
  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el.appendChild(statusEl);
      statusTextByHost.set(el, statusEl);
    }
    const msg = status === "loading" ? asText(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS.loading : status === "refetching" ? asText(props.refetchingMessage) || opts.refetchingMessage || STATUS_LABELS.refetching : status === "empty" ? asText(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS.empty : asText(props.errorMessage ?? props.error) || opts.errorMessage || STATUS_LABELS.error;
    statusEl.textContent = msg;
    statusEl.setAttribute("role", "status");
    setOrRemoveAttr(statusEl, "aria-live", status === "error" ? "assertive" : "polite");
  } else if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.removeChild(statusEl);
    statusTextByHost.delete(el);
    statusEl = null;
  }
  return { status, statusEl };
}
function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    ownsChildren: impl.ownsChildren !== false
  };
}
function normalizeEditableCellType(type) {
  const t = asText(type);
  if (t === "number" || t === "date-single" || t === "select" || t === "url" || t === "text") {
    return t;
  }
  if (t === "date") return "date-single";
  return "text";
}
function normalizeEditableColumn(raw, index) {
  let obj = raw && typeof raw === "object" ? (
    /** @type {Record<string, unknown>} */
    raw
  ) : {};
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const optionsRaw = Array.isArray(obj.options) ? obj.options : [];
  const options = optionsRaw.filter((o) => o && typeof o === "object").map((o) => {
    const opt = (
      /** @type {Record<string, unknown>} */
      o
    );
    return {
      value: asText(opt.value),
      label: asText(opt.label ?? opt.value)
    };
  });
  const width = typeof obj.width === "number" ? obj.width : void 0;
  return {
    type: normalizeEditableCellType(asText(obj.type)),
    key: asText(obj.key) || `col-${index}`,
    header: asText(obj.header ?? obj.label),
    width,
    options
  };
}
function toKeyedRows(data, columnKeys) {
  if (!Array.isArray(data)) return [];
  return data.map((row, i) => {
    let obj = row && typeof row === "object" ? (
      /** @type {Record<string, unknown>} */
      row
    ) : {};
    if (obj.props && typeof obj.props === "object" && obj.id == null) {
      obj = /** @type {Record<string, unknown>} */
      obj.props;
    }
    const id = asText(obj.id) || `row-${i}`;
    const values = {};
    if (Array.isArray(obj.values)) {
      columnKeys.forEach((key, idx) => {
        const v = obj.values[idx];
        values[key] = typeof v === "number" ? v : asText(v);
      });
    } else {
      for (const key of columnKeys) {
        const v = obj[key];
        values[key] = typeof v === "number" ? v : asText(v);
      }
    }
    return { id, values };
  });
}
function fromKeyedRows(rows, columnKeys) {
  return rows.map((row) => ({
    id: row.id,
    values: columnKeys.map((key) => {
      const v = row.values[key];
      return typeof v === "number" ? v : asText(v);
    })
  }));
}
function countChangedCells(rows, baseline, columnKeys) {
  if (!baseline) return 0;
  let count = 0;
  const current = new Map(rows.map((r) => [r.id, r.values]));
  for (const [id, baseValues] of baseline) {
    const cur = current.get(id);
    if (!cur) continue;
    for (const key of columnKeys) {
      if (cur[key] !== baseValues[key]) count++;
    }
  }
  return count;
}

// src/Browser/components/table/Col.js
var Col = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Col");
    el.setAttribute("hidden", "");
    return el;
  },
  patch(el, props = {}) {
    setClass(el, "canvas-table-col");
    el.setAttribute("data-label", String(props.label ?? ""));
    el.setAttribute("data-col-type", String(props.type ?? "string"));
  }
});

// src/Browser/components/table/Table.js
var STATE = /* @__PURE__ */ new WeakMap();
function resolveTableColumns(props = {}) {
  if (Array.isArray(props.columns) && props.columns.length) {
    return normalizeColumns(props.columns);
  }
  if (Array.isArray(props.children) && props.children.length) {
    const cols = props.children.filter(
      (c) => c && typeof c === "object" && /** @type {{ type?: string }} */
      (c.type === "Col" || /** @type {{ props?: object }} */
      c.props && "label" in /** @type {object} */
      (c.props ?? {}) && "data" in /** @type {object} */
      (c.props ?? {}))
    );
    if (cols.length) return normalizeColumns(cols);
  }
  return [];
}
function getState(host) {
  let s = STATE.get(host);
  if (!s) {
    s = { page: 0, sortCol: null, sortDir: "asc", wired: false };
    STATE.set(host, s);
  }
  return s;
}
function makePageBtn(doc, label) {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.setAttribute("class", "canvas-table__page-btn");
  btn.setAttribute("aria-label", label);
  btn.textContent = label === "Previous page" ? "\u2039" : "\u203A";
  return (
    /** @type {HTMLButtonElement} */
    btn
  );
}
function fillCell(doc, td, value, type, ctx) {
  clearChildren(td);
  if (value && typeof value === "object" && typeof ctx.renderChildren === "function" && ("type" in /** @type {object} */
  value || Array.isArray(value))) {
    const kids = Array.isArray(value) ? value : [value];
    ctx.renderChildren(td, kids);
    return;
  }
  if (type === "action" && value && typeof value === "object") {
    const obj = (
      /** @type {Record<string, unknown>} */
      value
    );
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("class", "canvas-table__action");
    btn.textContent = asText(obj.label) || "Action";
    if (typeof obj.onClick === "function") {
      btn.addEventListener(
        "click",
        /** @type {EventListener} */
        obj.onClick
      );
    }
    td.appendChild(btn);
    return;
  }
  td.textContent = formatCellDisplay(value, type);
}
function ensureScrollKeyboard(host, scrollEl, state) {
  if (state.wired) return;
  state.wired = true;
  setOrRemoveAttr(scrollEl, "tabindex", "0");
  state.onKey = (e) => {
    const ev = (
      /** @type {KeyboardEvent} */
      e
    );
    const target = (
      /** @type {Element & { scrollLeft?: number, clientWidth?: number, scrollWidth?: number, scrollTo?: Function }} */
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
        (target.scrollLeft || 0) - Math.max(40, (target.clientWidth || 200) * 0.4)
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
var Table = lifecycle({
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
    const pageSize = typeof props.pageSize === "number" && props.pageSize > 0 ? Math.floor(props.pageSize) : DEFAULT_PAGE_SIZE;
    setClass(el, "canvas-table");
    const statusHost = [...el.childNodes ?? []].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null
    ) ?? el;
    const { status } = applyTableStatus(
      /** @type {Element} */
      statusHost,
      doc,
      props,
      ctx,
      { emptyMessage: asText(props.emptyMessage) || "No rows" }
    );
    el.setAttribute("data-status", status);
    setOrRemoveAttr(
      el,
      "aria-busy",
      status === "loading" || status === "refetching" ? "true" : null
    );
    const scroll = [...el.childNodes ?? []].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
    );
    const pager = [...el.childNodes ?? []].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-pager") != null
    );
    const table = scroll?.firstChild;
    const thead = table?.firstChild;
    const tbody = table?.childNodes?.[1];
    if (!scroll || !table || !thead || !tbody) return;
    ensureScrollKeyboard(
      el,
      /** @type {Element} */
      scroll,
      state
    );
    if (status === "loading" || status === "error") {
      clearChildren(
        /** @type {Element} */
        thead
      );
      clearChildren(
        /** @type {Element} */
        tbody
      );
      if (pager) pager.hidden = true;
      return;
    }
    if (!cols.length) {
      applyTableStatus(
        /** @type {Element} */
        statusHost,
        doc,
        { ...props, status: "empty" },
        ctx,
        {
          emptyMessage: asText(props.emptyMessage) || "No rows"
        }
      );
      el.setAttribute("data-status", "empty");
      clearChildren(
        /** @type {Element} */
        thead
      );
      clearChildren(
        /** @type {Element} */
        tbody
      );
      if (pager) pager.hidden = true;
      return;
    }
    const { rows, rowCount } = columnsToRows(cols);
    if (rowCount === 0 && status !== "refetching") {
      applyTableStatus(
        /** @type {Element} */
        statusHost,
        doc,
        { ...props, status: "empty" },
        ctx,
        {
          emptyMessage: asText(props.emptyMessage) || "No rows"
        }
      );
      el.setAttribute("data-status", "empty");
    } else if (status === "refetching") {
    } else if (statusHost.getAttribute?.("data-status") === "empty" && rowCount > 0) {
      applyTableStatus(
        /** @type {Element} */
        statusHost,
        doc,
        { ...props, status: "ready" },
        ctx
      );
      el.setAttribute("data-status", "ready");
    }
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
    clearChildren(
      /** @type {Element} */
      thead
    );
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
        setOrRemoveAttr(th, "aria-sort", active ? sortDir === "asc" ? "ascending" : "descending" : "none");
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
          const ev = (
            /** @type {KeyboardEvent} */
            e
          );
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault?.();
            activate();
          }
        });
      }
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    clearChildren(
      /** @type {Element} */
      tbody
    );
    for (const ri of pageOrder) {
      const tr = doc.createElement("tr");
      tr.setAttribute("class", "canvas-table__row");
      tr.setAttribute("data-row-index", String(ri));
      cols.forEach((col, ci) => {
        const td = doc.createElement("td");
        td.setAttribute("class", `canvas-table__td canvas-table__align-${col.align || "left"}`);
        td.setAttribute("data-col-type", col.type);
        fillCell(
          doc,
          /** @type {HTMLTableCellElement} */
          td,
          rows[ri][ci],
          col.type,
          ctx
        );
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    el.setAttribute("data-row-count", String(rowCount));
    el.setAttribute("data-page", String(state.page));
    el.setAttribute("data-page-size", String(pageSize));
    el.setAttribute("data-visible-rows", String(pageOrder.length));
    if (pager) {
      const p = (
        /** @type {HTMLElement} */
        pager
      );
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
      const scroll = [...el.childNodes ?? []].find(
        (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
      );
      scroll?.removeEventListener?.("keydown", state.onKey);
    }
    STATE.delete(el);
  }
});

// src/Browser/components/table/EditableTable.js
var STATE2 = /* @__PURE__ */ new WeakMap();
function normalizeEditableColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c, i) => normalizeEditableColumn(c, i));
}
function getState2(host) {
  let s = STATE2.get(host);
  if (!s) {
    s = {
      rows: [],
      baseline: null,
      selected: null,
      editing: null,
      editBuffer: "",
      justCancelled: false,
      columnKeys: [],
      mutationStatus: "idle",
      mutationError: "",
      cellErrors: /* @__PURE__ */ new Map(),
      wired: false,
      initializedFrom: ""
    };
    STATE2.set(host, s);
  }
  return s;
}
function rulesForCellType(type) {
  const t = normalizeEditableCellType(type);
  if (t === "number") return { number: true };
  if (t === "url") return { url: true };
  if (t === "date-single") {
    return { pattern: "\\d{4}-\\d{2}-\\d{2}" };
  }
  return {};
}
function validateEditableCell(value, type, options = []) {
  const t = normalizeEditableCellType(type);
  if (t === "select") {
    const str = asText(value);
    if (options.length && !options.some((o) => o.value === str)) {
      return { ok: false, code: "select", message: "invalid option" };
    }
    return { ok: true, value: str };
  }
  if (t === "number") {
    const raw = value == null ? "" : String(value);
    if (raw.trim() === "") return { ok: true, value: 0 };
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return { ok: false, code: "number", message: "not a number" };
    }
    return { ok: true, value: parsed };
  }
  const result = validateField(value, rulesForCellType(t));
  if (!result.ok) return result;
  return { ok: true, value: typeof value === "number" ? value : asText(value) };
}
function validateEditableTable(rows, columns) {
  const errors = [];
  for (const row of rows) {
    for (const col of columns) {
      const v = row.values[col.key];
      const r = validateEditableCell(v, col.type, col.options);
      if (!r.ok) {
        errors.push({ rowId: row.id, key: col.key, message: r.message });
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: fromKeyedRows(rows, columns.map((c) => c.key))
  };
}
function navigateCell(row, col, direction, rowCount, columnKeys) {
  const ci = columnKeys.indexOf(col);
  let newRow = row;
  let newCi = ci < 0 ? 0 : ci;
  switch (direction) {
    case "up":
      newRow = Math.max(0, row - 1);
      break;
    case "down":
      newRow = Math.min(Math.max(0, rowCount - 1), row + 1);
      break;
    case "left":
      newCi = Math.max(0, newCi - 1);
      break;
    case "right":
      newCi = Math.min(columnKeys.length - 1, newCi + 1);
      break;
    default:
      break;
  }
  return { row: newRow, col: columnKeys[newCi] || col };
}
function dataSignature(data, keys) {
  try {
    return JSON.stringify({ keys, data });
  } catch {
    return String(keys.join(","));
  }
}
function renderChangesBar(doc, host, state, columns, props, ctx) {
  let bar = [...host.childNodes ?? []].find(
    (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-editable-changes") != null
  );
  const count = countChangedCells(state.rows, state.baseline, state.columnKeys);
  if (count <= 0) {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    return;
  }
  if (!bar) {
    bar = doc.createElement("div");
    bar.setAttribute("data-canvas-editable-changes", "");
    bar.setAttribute("class", "canvas-editable-table__changes");
    host.appendChild(bar);
  }
  clearChildren(
    /** @type {Element} */
    bar
  );
  const countEl = doc.createElement("div");
  countEl.setAttribute("class", "canvas-editable-table__changes-count");
  countEl.textContent = `${count} changes made`;
  bar.appendChild(countEl);
  const btns = doc.createElement("div");
  btns.setAttribute("class", "canvas-editable-table__changes-buttons");
  const reset = doc.createElement("button");
  reset.type = "button";
  reset.setAttribute("class", "canvas-editable-table__btn canvas-editable-table__btn--secondary");
  reset.textContent = asText(props.resetLabel) || "Reset";
  reset.addEventListener("click", () => {
    if (state.baseline) {
      state.rows = [...state.baseline.entries()].map(([id, values]) => ({
        id,
        values: { ...values }
      }));
    }
    state.selected = null;
    state.editing = null;
    state.cellErrors.clear();
    state.mutationStatus = "idle";
    state.mutationError = "";
    EditableTable.update(host, props, ctx);
  });
  btns.appendChild(reset);
  const save = doc.createElement("button");
  save.type = "button";
  save.setAttribute("class", "canvas-editable-table__btn canvas-editable-table__btn--primary");
  save.textContent = asText(props.saveLabel) || "Save Changes";
  setOrRemoveAttr(save, "disabled", state.mutationStatus === "loading" ? "true" : null);
  save.addEventListener("click", () => {
    void commitMutation(host, state, columns, props, ctx);
  });
  btns.appendChild(save);
  bar.appendChild(btns);
  if (state.mutationStatus === "error" && state.mutationError) {
    const err = doc.createElement("div");
    err.setAttribute("class", "canvas-editable-table__mutation-error");
    err.setAttribute("role", "alert");
    err.textContent = state.mutationError;
    bar.appendChild(err);
  }
  if (state.mutationStatus === "loading") {
    const busy = doc.createElement("div");
    busy.setAttribute("class", "canvas-editable-table__mutation-busy");
    busy.setAttribute("role", "status");
    busy.textContent = "Saving\u2026";
    bar.appendChild(busy);
  }
}
async function commitMutation(host, state, columns, props, ctx) {
  const validated = validateEditableTable(state.rows, columns);
  state.cellErrors.clear();
  if (!validated.ok) {
    for (const e of validated.errors) {
      state.cellErrors.set(`${e.rowId}:${e.key}`, e.message);
    }
    state.mutationStatus = "error";
    state.mutationError = "Validation failed";
    EditableTable.update(host, props, ctx);
    return;
  }
  const mutationId = asText(props.mutationId) || asText(props.name) || "EditableTable";
  const mutations = ctx.mutations;
  state.mutationStatus = "loading";
  state.mutationError = "";
  EditableTable.update(host, props, ctx);
  try {
    if (mutations && typeof mutations.runMutation === "function") {
      if (typeof mutations.register === "function") {
        mutations.register({
          statementId: mutationId,
          toolName: asText(props.toolName) || "saveEditableTable",
          args: {},
          refreshQueries: Array.isArray(props.refreshQueries) ? props.refreshQueries : []
        });
      }
      const result = await mutations.runMutation(mutationId, {
        name: asText(props.name),
        data: validated.data
      });
      if (result?.status === "error") {
        state.mutationStatus = "error";
        state.mutationError = asText(result.error) || "Save failed";
      } else {
        state.mutationStatus = "success";
        state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
      }
    } else if (typeof props.onSave === "function") {
      await /** @type {Function} */
      props.onSave(validated.data);
      state.mutationStatus = "success";
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
    } else {
      state.mutationStatus = "success";
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
      if (typeof ctx.reportError === "function" && props.requireMutation === true) {
        ctx.reportError(new Error("editable-table-missing-mutations"));
      }
    }
  } catch (err) {
    state.mutationStatus = "error";
    state.mutationError = err instanceof Error ? err.message : String(err);
  }
  EditableTable.update(host, props, ctx);
}
function renderDisplayValue(doc, cell, value, col, ctx, invalid) {
  clearChildren(cell);
  const type = col.type;
  if (type === "url") {
    const raw = asText(value);
    const policy = ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function" ? ctx.urlPolicy.safeUrl : safeUrl;
    const href = policy(raw);
    const wrap = doc.createElement("span");
    wrap.setAttribute("class", "canvas-editable-table__url");
    if (href) {
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("class", "canvas-editable-table__url-link");
      a.textContent = raw;
      a.addEventListener("click", (e) => e.stopPropagation?.());
      wrap.appendChild(a);
    } else {
      const span = doc.createElement("span");
      span.setAttribute("class", "canvas-editable-table__url-text");
      span.textContent = raw;
      wrap.appendChild(span);
    }
    if (invalid || raw && !href) {
      const warn = doc.createElement("span");
      warn.setAttribute("class", "canvas-editable-table__url-warn");
      warn.setAttribute("title", "This might not be a valid URL");
      warn.setAttribute("aria-label", "Invalid URL");
      warn.textContent = "!";
      wrap.appendChild(warn);
    }
    cell.appendChild(wrap);
    return;
  }
  if (type === "select") {
    const match = col.options.find((o) => o.value === asText(value));
    cell.textContent = match ? match.label : asText(value);
    return;
  }
  cell.textContent = value == null ? "" : String(value);
}
function renderCell(doc, host, state, columns, props, ctx, rowIndex, col, td) {
  const row = state.rows[rowIndex];
  if (!row) return;
  const value = row.values[col.key];
  const isSelected = state.selected?.row === rowIndex && state.selected?.col === col.key;
  const isEditing = state.editing?.row === rowIndex && state.editing?.col === col.key;
  const errKey = `${row.id}:${col.key}`;
  const errMsg = state.cellErrors.get(errKey);
  setClass(
    td,
    [
      "canvas-editable-table__td",
      isSelected ? "canvas-editable-table__td--selected" : "",
      isEditing ? "canvas-editable-table__td--editing" : "",
      errMsg ? "canvas-editable-table__td--invalid" : ""
    ].filter(Boolean).join(" ")
  );
  td.setAttribute("data-row-id", row.id);
  td.setAttribute("data-col-key", col.key);
  td.setAttribute("data-cell-type", col.type);
  setOrRemoveAttr(td, "aria-selected", isSelected ? "true" : null);
  setOrRemoveAttr(td, "aria-invalid", errMsg ? "true" : null);
  const inner = doc.createElement("div");
  inner.setAttribute("class", "canvas-editable-table__cell");
  inner.setAttribute("tabindex", "0");
  setOrRemoveAttr(inner, "data-selected", isSelected ? "true" : null);
  setOrRemoveAttr(inner, "data-editing", isEditing ? "true" : null);
  const startEdit = (seed) => {
    state.selected = { row: rowIndex, col: col.key };
    state.editing = { row: rowIndex, col: col.key };
    state.editBuffer = seed != null ? String(seed) : value == null ? "" : String(value);
    EditableTable.update(host, props, ctx);
  };
  const finishEdit = (save) => {
    if (save && state.editing) {
      const parsed = validateEditableCell(state.editBuffer, col.type, col.options);
      if (!parsed.ok) {
        state.cellErrors.set(errKey, parsed.message);
      } else {
        state.cellErrors.delete(errKey);
        row.values[col.key] = /** @type {string|number} */
        parsed.value;
      }
    }
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  const cancelEdit = () => {
    state.justCancelled = true;
    state.editBuffer = value == null ? "" : String(value);
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  const move = (dir) => {
    const next = navigateCell(
      rowIndex,
      col.key,
      dir,
      state.rows.length,
      state.columnKeys
    );
    state.selected = next;
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  inner.addEventListener("click", (e) => {
    e.stopPropagation?.();
    if (!isSelected && !isEditing) {
      state.selected = { row: rowIndex, col: col.key };
      state.editing = null;
      EditableTable.update(host, props, ctx);
    } else if (!isEditing) {
      startEdit();
    }
  });
  inner.addEventListener("keydown", (e) => {
    const ev = (
      /** @type {KeyboardEvent} */
      e
    );
    if (isEditing) {
      if (ev.key === "Enter") {
        ev.preventDefault?.();
        finishEdit(true);
        move("down");
      } else if (ev.key === "Tab") {
        ev.preventDefault?.();
        finishEdit(true);
        move(ev.shiftKey ? "left" : "right");
      } else if (ev.key === "Escape") {
        ev.preventDefault?.();
        cancelEdit();
      }
      return;
    }
    if (!isSelected) return;
    if (ev.key === "Enter" || ev.key === "F2") {
      ev.preventDefault?.();
      startEdit();
    } else if (ev.key === "Tab") {
      ev.preventDefault?.();
      move(ev.shiftKey ? "left" : "right");
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault?.();
      move("up");
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault?.();
      move("down");
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault?.();
      move("left");
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault?.();
      move("right");
    } else if (ev.key && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault?.();
      startEdit(ev.key);
    }
  });
  inner.addEventListener("blur", (e) => {
    if (state.justCancelled) {
      state.justCancelled = false;
      return;
    }
    if (!state.editing || state.editing.row !== rowIndex || state.editing.col !== col.key) {
      return;
    }
    const related = (
      /** @type {FocusEvent} */
      e.relatedTarget
    );
    if (related && inner.contains?.(
      /** @type {Node} */
      related
    )) return;
    finishEdit(true);
  });
  if (isEditing) {
    let input;
    if (col.type === "select") {
      input = doc.createElement("select");
      input.setAttribute("class", "canvas-editable-table__input");
      for (const opt of col.options) {
        const o = doc.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === state.editBuffer) o.selected = true;
        input.appendChild(o);
      }
      input.addEventListener("change", () => {
        state.editBuffer = /** @type {HTMLSelectElement} */
        input.value;
      });
    } else {
      input = doc.createElement("input");
      const inputType = col.type === "number" ? "number" : col.type === "date-single" ? "date" : col.type === "url" ? "url" : "text";
      input.setAttribute("type", inputType);
      input.setAttribute("class", "canvas-editable-table__input");
      input.value = state.editBuffer;
      input.addEventListener("input", () => {
        state.editBuffer = /** @type {HTMLInputElement} */
        input.value;
      });
    }
    input.addEventListener("keydown", (e) => {
      const ev = (
        /** @type {KeyboardEvent} */
        e
      );
      if (ev.key === "Enter") {
        ev.preventDefault?.();
        finishEdit(true);
        move("down");
      } else if (ev.key === "Tab") {
        ev.preventDefault?.();
        finishEdit(true);
        move(ev.shiftKey ? "left" : "right");
      } else if (ev.key === "Escape") {
        ev.preventDefault?.();
        cancelEdit();
      }
    });
    inner.appendChild(input);
    Promise.resolve().then(() => {
      if (typeof input.focus === "function") input.focus();
      if (typeof input.setSelectionRange === "function" && "value" in input) {
        try {
          input.setSelectionRange(0, String(input.value ?? "").length);
        } catch {
        }
      }
    });
  } else {
    renderDisplayValue(doc, inner, value, col, ctx, !!errMsg);
  }
  if (errMsg) {
    const tip = doc.createElement("span");
    tip.setAttribute("class", "canvas-editable-table__cell-error");
    tip.textContent = errMsg;
    inner.appendChild(tip);
  }
  clearChildren(td);
  td.appendChild(inner);
  if (isSelected && !isEditing) {
    void Promise.resolve().then(() => {
      if (typeof inner.focus === "function") inner.focus();
    });
  }
}
var EditableTable = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "EditableTable");
    el.setAttribute("class", "canvas-editable-table");
    el.setAttribute("tabindex", "0");
    const statusSlot = doc.createElement("div");
    statusSlot.setAttribute("data-canvas-table-status", "");
    statusSlot.setAttribute("class", "canvas-table__status");
    el.appendChild(statusSlot);
    const scroll = doc.createElement("div");
    scroll.setAttribute("class", "canvas-table__scroll canvas-editable-table__scroll");
    scroll.setAttribute("data-canvas-table-scroll", "");
    scroll.setAttribute("tabindex", "0");
    el.appendChild(scroll);
    const table = doc.createElement("table");
    table.setAttribute("class", "canvas-table__grid canvas-editable-table__grid");
    scroll.appendChild(table);
    const thead = doc.createElement("thead");
    thead.setAttribute("class", "canvas-table__head");
    table.appendChild(thead);
    const tbody = doc.createElement("tbody");
    tbody.setAttribute("class", "canvas-table__body");
    table.appendChild(tbody);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const state = getState2(el);
    const columns = normalizeEditableColumns(props.columns);
    const columnKeys = columns.map((c) => c.key);
    state.columnKeys = columnKeys;
    const name = asText(props.name);
    if (name) el.setAttribute("data-table-name", name);
    setClass(el, "canvas-editable-table");
    setOrRemoveAttr(el, "data-mutation-status", state.mutationStatus);
    const statusHost = [...el.childNodes ?? []].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null
    ) ?? el;
    const { status } = applyTableStatus(
      /** @type {Element} */
      statusHost,
      doc,
      props,
      ctx,
      { emptyMessage: "No rows" }
    );
    el.setAttribute("data-status", status);
    const scroll = [...el.childNodes ?? []].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
    );
    const table = scroll?.firstChild;
    const thead = table?.firstChild;
    const tbody = table?.childNodes?.[1];
    if (!scroll || !table || !thead || !tbody) return;
    if (status === "loading" || status === "error") {
      clearChildren(
        /** @type {Element} */
        thead
      );
      clearChildren(
        /** @type {Element} */
        tbody
      );
      return;
    }
    const sig = dataSignature(props.data, columnKeys);
    const streaming = props.isStreaming === true || ctx.stream && typeof ctx.stream === "object" && ctx.stream.isStreaming === true;
    if (!state.editing) {
      if (state.initializedFrom !== sig) {
        state.rows = toKeyedRows(props.data, columnKeys);
        state.initializedFrom = sig;
        if (!streaming) {
          state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
        }
      }
    }
    if (!streaming && state.baseline == null && state.rows.length) {
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
    }
    if (!columns.length || !state.rows.length) {
      if (!state.rows.length) {
        applyTableStatus(
          /** @type {Element} */
          statusHost,
          doc,
          { ...props, status: "empty" },
          ctx
        );
        el.setAttribute("data-status", "empty");
      }
      clearChildren(
        /** @type {Element} */
        thead
      );
      clearChildren(
        /** @type {Element} */
        tbody
      );
      renderChangesBar(doc, el, state, columns, props, ctx);
      return;
    }
    clearChildren(
      /** @type {Element} */
      thead
    );
    const hr = doc.createElement("tr");
    columns.forEach((col) => {
      const th = doc.createElement("th");
      th.setAttribute("class", "canvas-table__th");
      th.setAttribute("scope", "col");
      th.setAttribute("data-col-key", col.key);
      th.setAttribute("data-cell-type", col.type);
      if (col.width) th.setAttribute("data-min-width", String(col.width));
      th.textContent = col.header;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    clearChildren(
      /** @type {Element} */
      tbody
    );
    state.rows.forEach((row, ri) => {
      const tr = doc.createElement("tr");
      tr.setAttribute("class", "canvas-table__row");
      tr.setAttribute("data-row-id", row.id);
      columns.forEach((col) => {
        const td = doc.createElement("td");
        renderCell(
          doc,
          el,
          state,
          columns,
          props,
          ctx,
          ri,
          col,
          /** @type {HTMLTableCellElement} */
          td
        );
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    el.setAttribute(
      "data-changed-cells",
      String(countChangedCells(state.rows, state.baseline, columnKeys))
    );
    el.setAttribute("data-row-count", String(state.rows.length));
    renderChangesBar(doc, el, state, columns, props, ctx);
    if (!state.wired) {
      state.wired = true;
      state.onKey = (e) => {
        const ev = (
          /** @type {KeyboardEvent} */
          e
        );
        if (!state.editing && ev.key === "Tab" && (ctx.document?.activeElement === el || /** @type {Document} */
        el.ownerDocument?.activeElement === el)) {
          if (!state.selected && state.rows.length && columnKeys.length) {
            ev.preventDefault?.();
            state.selected = { row: 0, col: columnKeys[0] };
            EditableTable.update(el, props, ctx);
          }
        }
      };
      el.addEventListener("keydown", state.onKey);
    }
  },
  unmount(el) {
    const state = STATE2.get(el);
    if (state?.onKey) el.removeEventListener("keydown", state.onKey);
    STATE2.delete(el);
  }
});

// src/Browser/components/table/registerTable.js
var TABLE_COMPONENTS = Object.freeze({
  Col,
  Table,
  EditableTable
});
function registerTable(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTable: registry with register() required");
  }
  registry.register("Col", Col);
  registry.register("Table", Table);
  registry.register("EditableTable", EditableTable);
  return registry;
}
var registerTable_default = registerTable;
export {
  Col,
  EditableTable,
  TABLE_COMPONENTS,
  Table,
  registerTable_default as default,
  registerTable
};

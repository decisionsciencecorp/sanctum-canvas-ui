/**
 * Shared helpers for A6.5/A6.6 Table + EditableTable.
 */

/** @typedef {"ready" | "loading" | "empty" | "error" | "refetching"} SurfaceStatus */

export const DEFAULT_PAGE_SIZE = 10;

export const SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error",
  REFETCHING: "refetching",
});

const STATUS_LABELS = Object.freeze({
  ready: "",
  loading: "Loading",
  empty: "No rows",
  error: "Error",
  refetching: "Refreshing",
});

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("table component: ctx.document required");
  }
  return doc;
}

/**
 * @param {Element} el
 * @param {string} className
 */
export function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}

/**
 * @param {Element} el
 * @param {string} name
 * @param {string | null | undefined | boolean} value
 */
export function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}

/**
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Coerce unknown into a plain array (Col.data may be a single value).
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Normalize a Col-like entry from columns[] or children.
 * @param {unknown} raw
 * @param {number} index
 * @returns {{ label: string, data: unknown[], type: string, key: string, sortable?: boolean, align?: string }}
 */
export function normalizeCol(raw, index) {
  if (raw == null) {
    return { label: "", data: [], type: "string", key: String(index) };
  }
  /** @type {Record<string, unknown>} */
  let obj = /** @type {Record<string, unknown>} */ (raw);
  if (obj.props && typeof obj.props === "object" && (obj.type === "Col" || obj.label == null)) {
    obj = /** @type {Record<string, unknown>} */ (obj.props);
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
    align: align === "center" || align === "right" ? align : "left",
  };
}

/**
 * @param {unknown} columns
 * @returns {ReturnType<typeof normalizeCol>[]}
 */
export function normalizeColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns
    .filter((c) => c != null)
    .map((c, i) => normalizeCol(c, i));
}

/**
 * Column-oriented → row matrix. Uneven columns pad with "".
 * @param {ReturnType<typeof normalizeCol>[]} cols
 * @returns {{ labels: string[], rows: unknown[][], rowCount: number }}
 */
export function columnsToRows(cols) {
  const labels = cols.map((c) => c.label);
  const rowCount = cols.length ? Math.max(...cols.map((c) => c.data.length), 0) : 0;
  /** @type {unknown[][]} */
  const rows = [];
  for (let r = 0; r < rowCount; r++) {
    rows.push(cols.map((c) => (r < c.data.length ? c.data[r] : "")));
  }
  return { labels, rows, rowCount };
}

/**
 * Display formatting by column type hint.
 * @param {unknown} value
 * @param {string} [type]
 * @returns {string}
 */
export function formatCellDisplay(value, type = "string") {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value && typeof value === "object" && "label" in /** @type {object} */ (value)) {
      return asText(/** @type {{ label?: unknown }} */ (value).label);
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

/**
 * Sort row indices by a column.
 * @param {unknown[][]} rows
 * @param {number} colIndex
 * @param {"asc"|"desc"} dir
 * @param {string} [type]
 * @returns {number[]}
 */
export function sortRowIndices(rows, colIndex, dir = "asc", type = "string") {
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

/**
 * Resolve surface status from props + optional query snapshot on ctx.
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} [ctx]
 * @returns {SurfaceStatus}
 */
export function resolveTableStatus(props = {}, ctx = {}) {
  const raw = props.status ?? props.state;
  if (
    raw === "loading" ||
    raw === "empty" ||
    raw === "error" ||
    raw === "ready" ||
    raw === "refetching"
  ) {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.refetching === true || props.isRefetching === true) return "refetching";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";

  const query = ctx.query;
  if (query && typeof query === "object") {
    const loading = /** @type {{ __openui_loading?: unknown[] }} */ (query).__openui_loading;
    const refetching = /** @type {{ __openui_refetching?: unknown[] }} */ (query)
      .__openui_refetching;
    const errors = /** @type {{ __openui_errors?: unknown[] }} */ (query).__openui_errors;
    if (Array.isArray(errors) && errors.length > 0) return "error";
    if (Array.isArray(loading) && loading.length > 0) return "loading";
    if (Array.isArray(refetching) && refetching.length > 0) return "refetching";
  }
  return "ready";
}

/** @type {WeakMap<Element, Element>} */
const statusTextByHost = new WeakMap();

/**
 * @param {Element} el
 * @returns {Element | null}
 */
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

/**
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} [ctx]
 * @param {{ emptyMessage?: string, loadingMessage?: string, errorMessage?: string, refetchingMessage?: string, showStatusText?: boolean }} [opts]
 * @returns {{ status: SurfaceStatus, statusEl: Element | null }}
 */
export function applyTableStatus(el, doc, props = {}, ctx = {}, opts = {}) {
  const status = resolveTableStatus(props, ctx);
  el.setAttribute("data-status", status);
  setOrRemoveAttr(
    el,
    "aria-busy",
    status === "loading" || status === "refetching" ? "true" : null,
  );

  let statusEl = findStatusTextChild(el);
  const show =
    opts.showStatusText !== false &&
    (status === "loading" ||
      status === "empty" ||
      status === "error" ||
      status === "refetching");

  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el.appendChild(statusEl);
      statusTextByHost.set(el, statusEl);
    }
    const msg =
      status === "loading"
        ? asText(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS.loading
        : status === "refetching"
          ? asText(props.refetchingMessage) ||
            opts.refetchingMessage ||
            STATUS_LABELS.refetching
          : status === "empty"
            ? asText(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS.empty
            : asText(props.errorMessage ?? props.error) ||
              opts.errorMessage ||
              STATUS_LABELS.error;
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

/**
 * @template T
 * @param {{
 *   mount: (doc: Document, props: Record<string, unknown>, ctx: Record<string, unknown>) => Element,
 *   patch: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   unmount?: (el: Element, ctx: Record<string, unknown>) => void,
 *   ownsChildren?: boolean,
 * }} impl
 */
export function lifecycle(impl) {
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
    ownsChildren: impl.ownsChildren !== false,
  };
}

/**
 * Editable column types from upstream schema.
 * @param {string} type
 * @returns {"text"|"number"|"date-single"|"select"|"url"}
 */
export function normalizeEditableCellType(type) {
  const t = asText(type);
  if (t === "number" || t === "date-single" || t === "select" || t === "url" || t === "text") {
    return t;
  }
  if (t === "date") return "date-single";
  return "text";
}

/**
 * @param {unknown} raw
 * @param {number} index
 * @returns {{ type: string, key: string, header: string, width?: number, options: { value: string, label: string }[] }}
 */
export function normalizeEditableColumn(raw, index) {
  /** @type {Record<string, unknown>} */
  let obj =
    raw && typeof raw === "object"
      ? /** @type {Record<string, unknown>} */ (raw)
      : {};
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */ (obj.props);
  }
  const optionsRaw = Array.isArray(obj.options) ? obj.options : [];
  const options = optionsRaw
    .filter((o) => o && typeof o === "object")
    .map((o) => {
      const opt = /** @type {Record<string, unknown>} */ (o);
      return {
        value: asText(opt.value),
        label: asText(opt.label ?? opt.value),
      };
    });
  const width = typeof obj.width === "number" ? obj.width : undefined;
  return {
    type: normalizeEditableCellType(asText(obj.type)),
    key: asText(obj.key) || `col-${index}`,
    header: asText(obj.header ?? obj.label),
    width,
    options,
  };
}

/**
 * Positional rows → keyed objects.
 * @param {unknown} data
 * @param {string[]} columnKeys
 * @returns {{ id: string, values: Record<string, string|number> }[]}
 */
export function toKeyedRows(data, columnKeys) {
  if (!Array.isArray(data)) return [];
  return data.map((row, i) => {
    /** @type {Record<string, unknown>} */
    let obj =
      row && typeof row === "object"
        ? /** @type {Record<string, unknown>} */ (row)
        : {};
    if (obj.props && typeof obj.props === "object" && obj.id == null) {
      obj = /** @type {Record<string, unknown>} */ (obj.props);
    }
    const id = asText(obj.id) || `row-${i}`;
    /** @type {Record<string, string|number>} */
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

/**
 * Keyed rows → positional mutation payload.
 * @param {{ id: string, values: Record<string, string|number> }[]} rows
 * @param {string[]} columnKeys
 * @returns {{ id: string, values: (string|number)[] }[]}
 */
export function fromKeyedRows(rows, columnKeys) {
  return rows.map((row) => ({
    id: row.id,
    values: columnKeys.map((key) => {
      const v = row.values[key];
      return typeof v === "number" ? v : asText(v);
    }),
  }));
}

/**
 * Count cells that differ from baseline (by row id + column key).
 * @param {{ id: string, values: Record<string, string|number> }[]} rows
 * @param {Map<string, Record<string, string|number>>|null|undefined} baseline
 * @param {string[]} columnKeys
 * @returns {number}
 */
export function countChangedCells(rows, baseline, columnKeys) {
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

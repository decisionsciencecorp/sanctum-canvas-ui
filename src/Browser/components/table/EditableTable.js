/**
 * A6.6 — EditableTable: text/number/date/select/URL cells, stable row IDs,
 * edit/commit/cancel keyboard, changed-cell tracking, validation,
 * mutation payloads via runtime/mutations.js, URLs via urlPolicy.
 * No TanStack.
 */

import { validateField } from "../../runtime/formValidation.js";
import { safeUrl as defaultSafeUrl } from "../../security/urlPolicy.js";
import {
  applyTableStatus,
  asText,
  clearChildren,
  countChangedCells,
  fromKeyedRows,
  lifecycle,
  normalizeEditableCellType,
  normalizeEditableColumn,
  setClass,
  setOrRemoveAttr,
  toKeyedRows,
} from "./shared.js";

/**
 * @typedef {{
 *   rows: { id: string, values: Record<string, string|number> }[],
 *   baseline: Map<string, Record<string, string|number>> | null,
 *   selected: { row: number, col: string } | null,
 *   editing: { row: number, col: string } | null,
 *   editBuffer: string,
 *   justCancelled: boolean,
 *   columnKeys: string[],
 *   mutationStatus: "idle"|"loading"|"success"|"error",
 *   mutationError: string,
 *   cellErrors: Map<string, string>,
 *   wired: boolean,
 *   onKey?: (e: Event) => void,
 *   initializedFrom: string,
 * }} EditableState
 */

/** @type {WeakMap<Element, EditableState>} */
const STATE = new WeakMap();

/**
 * @param {unknown} columns
 * @returns {ReturnType<typeof normalizeEditableColumn>[]}
 */
export function normalizeEditableColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c, i) => normalizeEditableColumn(c, i));
}

/**
 * @param {Element} host
 * @returns {EditableState}
 */
function getState(host) {
  let s = STATE.get(host);
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
      cellErrors: new Map(),
      wired: false,
      initializedFrom: "",
    };
    STATE.set(host, s);
  }
  return s;
}

/**
 * @param {Element} host
 * @returns {EditableState | undefined}
 */
export function getEditableTableState(host) {
  return STATE.get(host);
}

/**
 * Validation rules by cell type.
 * @param {string} type
 * @returns {Record<string, unknown>}
 */
export function rulesForCellType(type) {
  const t = normalizeEditableCellType(type);
  if (t === "number") return { number: true };
  if (t === "url") return { url: true };
  if (t === "date-single") {
    return { pattern: "\\d{4}-\\d{2}-\\d{2}" };
  }
  return {};
}

/**
 * @param {unknown} value
 * @param {string} type
 * @param {{ value: string, label: string }[]} [options]
 * @returns {{ ok: true, value: string|number } | { ok: false, code: string, message: string }}
 */
export function validateEditableCell(value, type, options = []) {
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

/**
 * Validate entire table; returns positional payload only when all ok.
 * @param {{ id: string, values: Record<string, string|number> }[]} rows
 * @param {ReturnType<typeof normalizeEditableColumn>[]} columns
 * @returns {{ ok: true, data: { id: string, values: (string|number)[] }[] } | { ok: false, errors: { rowId: string, key: string, message: string }[] }}
 */
export function validateEditableTable(rows, columns) {
  /** @type {{ rowId: string, key: string, message: string }[]} */
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
    data: fromKeyedRows(rows, columns.map((c) => c.key)),
  };
}

/**
 * @param {number} row
 * @param {string} col
 * @param {"up"|"down"|"left"|"right"} direction
 * @param {number} rowCount
 * @param {string[]} columnKeys
 * @returns {{ row: number, col: string }}
 */
export function navigateCell(row, col, direction, rowCount, columnKeys) {
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

/**
 * Snapshot signature so we re-baseline when props.data identity changes after stream.
 * @param {unknown} data
 * @param {string[]} keys
 */
function dataSignature(data, keys) {
  try {
    return JSON.stringify({ keys, data });
  } catch {
    return String(keys.join(","));
  }
}

/**
 * @param {Document} doc
 * @param {Element} host
 * @param {EditableState} state
 * @param {ReturnType<typeof normalizeEditableColumn>[]} columns
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function renderChangesBar(doc, host, state, columns, props, ctx) {
  let bar = [...(host.childNodes ?? [])].find(
    (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-editable-changes") != null,
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
  clearChildren(/** @type {Element} */ (bar));
  const countEl = doc.createElement("div");
  countEl.setAttribute("class", "canvas-editable-table__changes-count");
  countEl.textContent = `${count} changes made`;
  /** @type {Element} */ (bar).appendChild(countEl);

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
        values: { ...values },
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

  /** @type {Element} */ (bar).appendChild(btns);

  if (state.mutationStatus === "error" && state.mutationError) {
    const err = doc.createElement("div");
    err.setAttribute("class", "canvas-editable-table__mutation-error");
    err.setAttribute("role", "alert");
    err.textContent = state.mutationError;
    /** @type {Element} */ (bar).appendChild(err);
  }
  if (state.mutationStatus === "loading") {
    const busy = doc.createElement("div");
    busy.setAttribute("class", "canvas-editable-table__mutation-busy");
    busy.setAttribute("role", "status");
    busy.textContent = "Saving…";
    /** @type {Element} */ (bar).appendChild(busy);
  }
}

/**
 * @param {Element} host
 * @param {EditableState} state
 * @param {ReturnType<typeof normalizeEditableColumn>[]} columns
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
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
          refreshQueries: Array.isArray(props.refreshQueries) ? props.refreshQueries : [],
        });
      }
      const result = await mutations.runMutation(mutationId, {
        name: asText(props.name),
        data: validated.data,
      });
      if (result?.status === "error") {
        state.mutationStatus = "error";
        state.mutationError = asText(result.error) || "Save failed";
      } else {
        state.mutationStatus = "success";
        state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
      }
    } else if (typeof props.onSave === "function") {
      await /** @type {Function} */ (props.onSave)(validated.data);
      state.mutationStatus = "success";
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
    } else {
      // No mutation manager — still accept validated payload as baseline (local commit).
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

/**
 * @param {Document} doc
 * @param {HTMLElement} cell
 * @param {unknown} value
 * @param {ReturnType<typeof normalizeEditableColumn>} col
 * @param {Record<string, unknown>} ctx
 * @param {boolean} invalid
 */
function renderDisplayValue(doc, cell, value, col, ctx, invalid) {
  clearChildren(cell);
  const type = col.type;
  if (type === "url") {
    const raw = asText(value);
    const policy =
      ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function"
        ? ctx.urlPolicy.safeUrl
        : defaultSafeUrl;
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
    if (invalid || (raw && !href)) {
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

/**
 * @param {Document} doc
 * @param {Element} host
 * @param {EditableState} state
 * @param {ReturnType<typeof normalizeEditableColumn>[]} columns
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {number} rowIndex
 * @param {ReturnType<typeof normalizeEditableColumn>} col
 * @param {HTMLTableCellElement} td
 */
function renderCell(doc, host, state, columns, props, ctx, rowIndex, col, td) {
  const row = state.rows[rowIndex];
  if (!row) return;
  const value = row.values[col.key];
  const isSelected =
    state.selected?.row === rowIndex && state.selected?.col === col.key;
  const isEditing =
    state.editing?.row === rowIndex && state.editing?.col === col.key;
  const errKey = `${row.id}:${col.key}`;
  const errMsg = state.cellErrors.get(errKey);

  setClass(
    td,
    [
      "canvas-editable-table__td",
      isSelected ? "canvas-editable-table__td--selected" : "",
      isEditing ? "canvas-editable-table__td--editing" : "",
      errMsg ? "canvas-editable-table__td--invalid" : "",
    ]
      .filter(Boolean)
      .join(" "),
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
    state.editBuffer =
      seed != null ? String(seed) : value == null ? "" : String(value);
    EditableTable.update(host, props, ctx);
  };

  const finishEdit = (save) => {
    if (save && state.editing) {
      const parsed = validateEditableCell(state.editBuffer, col.type, col.options);
      if (!parsed.ok) {
        state.cellErrors.set(errKey, parsed.message);
      } else {
        state.cellErrors.delete(errKey);
        row.values[col.key] = /** @type {string|number} */ (parsed.value);
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
      state.columnKeys,
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
    const ev = /** @type {KeyboardEvent} */ (e);
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
    const related = /** @type {FocusEvent} */ (e).relatedTarget;
    if (related && inner.contains?.(/** @type {Node} */ (related))) return;
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
        state.editBuffer = /** @type {HTMLSelectElement} */ (input).value;
      });
    } else {
      input = doc.createElement("input");
      const inputType =
        col.type === "number" ? "number" : col.type === "date-single" ? "date" : col.type === "url" ? "url" : "text";
      input.setAttribute("type", inputType);
      input.setAttribute("class", "canvas-editable-table__input");
      input.value = state.editBuffer;
      input.addEventListener("input", () => {
        state.editBuffer = /** @type {HTMLInputElement} */ (input).value;
      });
    }
    input.addEventListener("keydown", (e) => {
      const ev = /** @type {KeyboardEvent} */ (e);
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
    // Focus after mount (next tick so miniDom/DOM attach).
    Promise.resolve().then(() => {
      if (typeof input.focus === "function") input.focus();
      if (typeof input.setSelectionRange === "function" && "value" in input) {
        try {
          input.setSelectionRange(0, String(input.value ?? "").length);
        } catch {
          // ignore selection failures in stub DOM
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

export const EditableTable = lifecycle({
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
    const state = getState(el);
    const columns = normalizeEditableColumns(props.columns);
    const columnKeys = columns.map((c) => c.key);
    state.columnKeys = columnKeys;

    const name = asText(props.name);
    if (name) el.setAttribute("data-table-name", name);

    setClass(el, "canvas-editable-table");
    setOrRemoveAttr(el, "data-mutation-status", state.mutationStatus);

    const statusHost =
      [...(el.childNodes ?? [])].find(
        (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null,
      ) ?? el;
    const { status } = applyTableStatus(
      /** @type {Element} */ (statusHost),
      doc,
      props,
      ctx,
      { emptyMessage: "No rows" },
    );
    el.setAttribute("data-status", status);

    const scroll = [...(el.childNodes ?? [])].find(
      (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null,
    );
    const table = scroll?.firstChild;
    const thead = table?.firstChild;
    const tbody = table?.childNodes?.[1];
    if (!scroll || !table || !thead || !tbody) return;

    if (status === "loading" || status === "error") {
      clearChildren(/** @type {Element} */ (thead));
      clearChildren(/** @type {Element} */ (tbody));
      return;
    }

    const sig = dataSignature(props.data, columnKeys);
    const streaming =
      props.isStreaming === true ||
      (ctx.stream && typeof ctx.stream === "object" && ctx.stream.isStreaming === true);

    // Seed / refresh rows from props when not mid-edit, or first mount / data change after stream.
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
          /** @type {Element} */ (statusHost),
          doc,
          { ...props, status: "empty" },
          ctx,
        );
        el.setAttribute("data-status", "empty");
      }
      clearChildren(/** @type {Element} */ (thead));
      clearChildren(/** @type {Element} */ (tbody));
      renderChangesBar(doc, el, state, columns, props, ctx);
      return;
    }

    // Header
    clearChildren(/** @type {Element} */ (thead));
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
    /** @type {Element} */ (thead).appendChild(hr);

    // Body — preserve row identity via data-row-id
    clearChildren(/** @type {Element} */ (tbody));
    state.rows.forEach((row, ri) => {
      const tr = doc.createElement("tr");
      tr.setAttribute("class", "canvas-table__row");
      tr.setAttribute("data-row-id", row.id);
      columns.forEach((col) => {
        const td = doc.createElement("td");
        renderCell(doc, el, state, columns, props, ctx, ri, col, /** @type {HTMLTableCellElement} */ (td));
        tr.appendChild(td);
      });
      /** @type {Element} */ (tbody).appendChild(tr);
    });

    el.setAttribute(
      "data-changed-cells",
      String(countChangedCells(state.rows, state.baseline, columnKeys)),
    );
    el.setAttribute("data-row-count", String(state.rows.length));

    renderChangesBar(doc, el, state, columns, props, ctx);

    // Table-level Tab focuses first cell
    if (!state.wired) {
      state.wired = true;
      state.onKey = (e) => {
        const ev = /** @type {KeyboardEvent} */ (e);
        if (
          !state.editing &&
          ev.key === "Tab" &&
          (ctx.document?.activeElement === el ||
            /** @type {Document} */ (el.ownerDocument)?.activeElement === el)
        ) {
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
    const state = STATE.get(el);
    if (state?.onKey) el.removeEventListener("keydown", state.onKey);
    STATE.delete(el);
  },
});

export default EditableTable;

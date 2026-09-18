/**
 * EntityList — two-column key/value rows with optional header/footer.
 * Strings are plain text (no markdown) for CSP-safe rendering.
 */

import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const SIZES = new Set(["small", "default"]);

/**
 * @param {Document} doc
 * @param {Record<string, unknown>} row
 * @param {"header" | "body" | "footer"} rowType
 */
function createRow(doc, row, rowType) {
  const rightVariant =
    asText(row.rightVariant) === "number" ? "number" : "text";
  const rowEl = doc.createElement("div");
  rowEl.setAttribute(
    "class",
    `canvas-entity-list__row canvas-entity-list__row--${rowType}`,
  );
  rowEl.setAttribute("data-row-type", rowType);

  const left = doc.createElement("span");
  left.setAttribute(
    "class",
    `canvas-entity-list__cell-left canvas-entity-list__cell-left--${rowType}`,
  );
  left.textContent = asText(row.left);

  const right = doc.createElement("span");
  right.setAttribute(
    "class",
    `canvas-entity-list__cell-right canvas-entity-list__cell-right--${rightVariant} canvas-entity-list__cell-right--${rowType}`,
  );
  right.setAttribute("data-right-variant", rightVariant);
  right.textContent = asText(row.right);

  rowEl.appendChild(left);
  rowEl.appendChild(right);
  return rowEl;
}

export const EntityList = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "EntityList");
    el.setAttribute("role", "table");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const sizeRaw = asText(props.size) || "default";
    const size = SIZES.has(sizeRaw) ? sizeRaw : "default";
    setClass(el, `canvas-entity-list canvas-entity-list--${size}`);
    el.setAttribute("data-size", size);

    clearChildren(el);
    const { status } = applySurfaceStatus(el, doc, props, {
      emptyMessage: "No rows",
    });
    if (status === "loading" || status === "error") return;

    const rows = Array.isArray(props.rows) ? props.rows : [];
    const showHeaderFooter = size === "default";

    if (!rows.length && !(showHeaderFooter && (props.header || props.footer))) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: asText(props.emptyMessage) || "No rows",
      });
      return;
    }

    if (showHeaderFooter && props.header && typeof props.header === "object") {
      el.appendChild(createRow(doc, props.header, "header"));
    }
    for (const row of rows) {
      if (row && typeof row === "object") {
        el.appendChild(createRow(doc, row, "body"));
      }
    }
    if (showHeaderFooter && props.footer && typeof props.footer === "object") {
      el.appendChild(createRow(doc, props.footer, "footer"));
    }
  },
});

export default EntityList;

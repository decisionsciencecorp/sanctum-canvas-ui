/**
 * Adjacent textual / data-table representation (a11y companion — not the Forms Table component).
 */

/**
 * @param {Document} doc
 * @param {{
 *   caption?: string,
 *   columns: string[],
 *   rows: (string | number)[][],
 * }} data
 * @returns {HTMLElement}
 */
export function renderDataTable(doc, data) {
  const wrap = doc.createElement("div");
  wrap.setAttribute("class", "canvas-chart__data-table");
  wrap.setAttribute("data-canvas-chart-table", "");

  const table = doc.createElement("table");
  table.setAttribute("class", "canvas-chart__table");

  if (data.caption) {
    const cap = doc.createElement("caption");
    cap.setAttribute("class", "canvas-chart__table-caption");
    cap.textContent = data.caption;
    table.appendChild(cap);
  }

  const thead = doc.createElement("thead");
  const hr = doc.createElement("tr");
  for (const col of data.columns || []) {
    const th = doc.createElement("th");
    th.setAttribute("scope", "col");
    th.textContent = String(col);
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  for (const row of data.rows || []) {
    const tr = doc.createElement("tr");
    row.forEach((cell, i) => {
      const td = doc.createElement(i === 0 ? "th" : "td");
      if (i === 0) td.setAttribute("scope", "row");
      td.textContent = String(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/**
 * Build table model from cartesian chart data.
 * @param {string[]} labels
 * @param {{ name: string, values: number[] }[]} series
 * @param {string} [caption]
 */
export function cartesianTableModel(labels, series, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", ...series.map((s) => s.name)],
    rows: labels.map((label, i) => [
      label,
      ...series.map((s) => (Number.isFinite(Number(s.values[i])) ? Number(s.values[i]) : "")),
    ]),
  };
}

/**
 * @param {{ label: string, value: number }[]} items
 * @param {string} [caption]
 */
export function slicesTableModel(items, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", "Value"],
    rows: items.map((it) => [it.label, it.value]),
  };
}

/**
 * @param {{ name: string, points: { x: number, y: number, z?: number }[] }[]} datasets
 * @param {string} [caption]
 */
export function scatterTableModel(datasets, caption) {
  /** @type {(string|number)[][]} */
  const rows = [];
  for (const ds of datasets) {
    for (const p of ds.points) {
      rows.push([ds.name, p.x, p.y, p.z != null ? p.z : ""]);
    }
  }
  return {
    caption: caption || "Scatter data",
    columns: ["Series", "X", "Y", "Z"],
    rows,
  };
}

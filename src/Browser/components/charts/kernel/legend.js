/**
 * Chart legend (color + non-color mark).
 */

import { seriesMark } from "./palette.js";
import { setInlineStyle } from "../../../renderer/inlineStyle.js";

/**
 * @param {Document} doc
 * @param {{ name: string, color: string, mark?: string }[]} items
 * @returns {HTMLElement}
 */
export function renderLegend(doc, items) {
  const list = doc.createElement("ul");
  list.setAttribute("class", "canvas-chart__legend");
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", "Chart legend");

  (items || []).forEach((item, i) => {
    const li = doc.createElement("li");
    li.setAttribute("class", "canvas-chart__legend-item");
    li.setAttribute("role", "listitem");
    const mark = item.mark || seriesMark(i);
    li.setAttribute("data-mark", mark);

    const swatch = doc.createElement("span");
    swatch.setAttribute("class", "canvas-chart__legend-swatch");
    swatch.setAttribute("data-mark", mark);
    setInlineStyle(swatch, { background: item.color });
    swatch.setAttribute("aria-hidden", "true");

    const label = doc.createElement("span");
    label.setAttribute("class", "canvas-chart__legend-label");
    label.textContent = item.name;

    li.appendChild(swatch);
    li.appendChild(label);
    list.appendChild(li);
  });

  return list;
}

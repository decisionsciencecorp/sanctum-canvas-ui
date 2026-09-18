/**
 * SVG axes + ticks.
 */

import { svgEl } from "./svg.js";
import { formatTick, niceTicks } from "./scales.js";

/**
 * @param {Document} doc
 * @param {{
 *   x0: number, x1: number, y0: number, y1: number,
 *   xTicks?: { label: string, x: number }[],
 *   yTicks?: { label: string, y: number }[],
 *   xLabel?: string,
 *   yLabel?: string,
 *   grid?: boolean,
 * }} opts
 * @returns {SVGGElement}
 */
export function renderAxes(doc, opts) {
  const g = svgEl(doc, "g", { class: "canvas-chart__axes" });

  // Plot border / baseline
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--x",
      x1: opts.x0,
      y1: opts.y1,
      x2: opts.x1,
      y2: opts.y1,
    }),
  );
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--y",
      x1: opts.x0,
      y1: opts.y0,
      x2: opts.x0,
      y2: opts.y1,
    }),
  );

  for (const t of opts.yTicks || []) {
    if (opts.grid !== false) {
      g.appendChild(
        svgEl(doc, "line", {
          class: "canvas-chart__grid-line",
          x1: opts.x0,
          y1: t.y,
          x2: opts.x1,
          y2: t.y,
        }),
      );
    }
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--y",
        x: opts.x0 - 6,
        y: t.y,
        "text-anchor": "end",
        "dominant-baseline": "middle",
      }),
    ).textContent = t.label;
  }

  for (const t of opts.xTicks || []) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--x",
        x: t.x,
        y: opts.y1 + 14,
        "text-anchor": "middle",
        "dominant-baseline": "hanging",
      }),
    ).textContent = t.label;
  }

  if (opts.xLabel) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__axis-title canvas-chart__axis-title--x",
        x: (opts.x0 + opts.x1) / 2,
        y: opts.y1 + 32,
        "text-anchor": "middle",
      }),
    ).textContent = opts.xLabel;
  }
  if (opts.yLabel) {
    const ty = svgEl(doc, "text", {
      class: "canvas-chart__axis-title canvas-chart__axis-title--y",
      x: 12,
      y: (opts.y0 + opts.y1) / 2,
      "text-anchor": "middle",
      transform: `rotate(-90 12 ${(opts.y0 + opts.y1) / 2})`,
    });
    ty.textContent = opts.yLabel;
    g.appendChild(ty);
  }

  return /** @type {SVGGElement} */ (g);
}

/**
 * Build y-tick descriptors from a domain + scale.
 * @param {[number, number]} domain
 * @param {(v: number) => number} yScale
 * @param {number} [count]
 */
export function buildYTicks(domain, yScale, count = 5) {
  return niceTicks(domain[0], domain[1], count).map((v) => ({
    label: formatTick(v),
    y: yScale(v),
    value: v,
  }));
}

/**
 * Category x ticks at band centers.
 * @param {string[]} labels
 * @param {{ (i: number): number, bandwidth: number }} xScale
 * @param {number} [maxLabels]
 */
export function buildXCategoryTicks(labels, xScale, maxLabels = 12) {
  const n = labels.length;
  const step = n > maxLabels ? Math.ceil(n / maxLabels) : 1;
  /** @type {{ label: string, x: number }[]} */
  const ticks = [];
  for (let i = 0; i < n; i += step) {
    ticks.push({
      label: labels[i],
      x: xScale(i) + xScale.bandwidth / 2,
    });
  }
  return ticks;
}

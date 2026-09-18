/**
 * SingleStackedBarChart — one horizontal 100% stacked bar.
 */

import {
  lifecycle,
  markDatapoint,
  mountChartHost,
  normalizeSlices,
  patchChartHost,
  resolvePalette,
  seriesMark,
  slicesTableModel,
  stackedBarSegments,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

export const SingleStackedBarChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "SingleStackedBarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { items, empty } = normalizeSlices(props);
    const colors = resolvePalette(items.length, /** @type {string[]} */ (props.palette));

    patchChartHost(el, doc, props, {
      empty,
      legendItems: items.map((it, i) => ({
        name: it.label,
        color: colors[i],
        mark: seriesMark(i),
      })),
      tableModel: slicesTableModel(items, "Stacked bar data"),
      paint(svg, _size, plot) {
        const barY = (plot.y0 + plot.y1) / 2 - 14;
        const segs = stackedBarSegments(items, {
          x0: plot.x0,
          x1: plot.x1,
          y: barY,
          height: 28,
        });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        // Track background
        g.appendChild(
          svgEl(doc, "rect", {
            class: "canvas-chart__stack-track",
            x: plot.x0,
            y: barY,
            width: Math.max(0, plot.x1 - plot.x0),
            height: 28,
            rx: 4,
          }),
        );
        for (const s of segs) {
          const rect = svgEl(doc, "rect", {
            class: "canvas-chart__stack-seg",
            x: s.x,
            y: s.y,
            width: Math.max(0, s.width),
            height: s.height,
            fill: colors[s.i % colors.length],
            "data-mark": seriesMark(s.i),
          });
          markDatapoint(rect, {
            id: `stack-${s.i}`,
            label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`,
          });
          g.appendChild(rect);
        }
        svg.appendChild(g);
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default SingleStackedBarChart;

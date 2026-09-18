/**
 * RadialChart — concentric radial bars.
 */

import {
  donutArcPath,
  lifecycle,
  markDatapoint,
  mountChartHost,
  normalizeSlices,
  patchChartHost,
  radialBars,
  resolvePalette,
  seriesMark,
  slicesTableModel,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

export const RadialChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "RadialChart");
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
      tableModel: slicesTableModel(items, "Radial chart data"),
      paint(svg, _size, plot) {
        const cx = (plot.x0 + plot.x1) / 2;
        const cy = (plot.y0 + plot.y1) / 2;
        const rOuter = Math.max(12, Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 8);
        const rInner = rOuter * 0.35;
        const start = -Math.PI / 2;
        const end = start + Math.PI * 2;
        const bars = radialBars(items, { cx, cy, rOuter, rInner, startAngle: start, endAngle: end });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        bars.forEach((b, i) => {
          g.appendChild(
            svgEl(doc, "path", {
              class: "canvas-chart__radial-track",
              d: donutArcPath(cx, cy, b.rOuter, b.rInner, start, end),
              fill: "var(--canvas-surface-sunk, #eee)",
            }),
          );
          const path = svgEl(doc, "path", {
            class: "canvas-chart__radial-bar",
            d: b.path,
            fill: colors[i],
            "data-mark": seriesMark(i),
          });
          markDatapoint(path, {
            id: `radial-${i}`,
            label: `${b.label}: ${b.value}`,
          });
          g.appendChild(path);
        });
        svg.appendChild(g);
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default RadialChart;

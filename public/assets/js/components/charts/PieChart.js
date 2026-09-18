/**
 * PieChart — circular / donut / semiCircular.
 */

import {
  lifecycle,
  markDatapoint,
  mountChartHost,
  normalizeSlices,
  patchChartHost,
  pieSlices,
  resolvePalette,
  seriesMark,
  slicesTableModel,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

export const PieChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "PieChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { items, empty } = normalizeSlices(props);
    const colors = resolvePalette(items.length, /** @type {string[]} */ (props.palette));
    const variant = props.variant === "donut" ? "donut" : "pie";
    const appearance = props.appearance === "semiCircular" ? "semiCircular" : "circular";

    patchChartHost(el, doc, props, {
      empty,
      legendItems: items.map((it, i) => ({
        name: it.label,
        color: colors[i],
        mark: seriesMark(i),
      })),
      tableModel: slicesTableModel(items, "Pie chart data"),
      paint(svg, size, plot) {
        const cx = (plot.x0 + plot.x1) / 2;
        const cy =
          appearance === "semiCircular"
            ? plot.y0 + (plot.y1 - plot.y0) * 0.75
            : (plot.y0 + plot.y1) / 2;
        const rOuter = Math.max(
          10,
          Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 8,
        );
        const rInner = variant === "donut" ? rOuter * 0.55 : 0;
        const startAngle = appearance === "semiCircular" ? Math.PI : -Math.PI / 2;
        const endAngle = appearance === "semiCircular" ? 2 * Math.PI : startAngle + Math.PI * 2;

        const slices = pieSlices(items, {
          cx,
          cy,
          rOuter,
          rInner,
          startAngle,
          endAngle,
          padAngle: 0.02,
        });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        slices.forEach((s, i) => {
          const path = svgEl(doc, "path", {
            class: "canvas-chart__slice",
            d: s.path,
            fill: colors[i],
            "data-mark": seriesMark(i),
          });
          markDatapoint(path, {
            id: `pie-${i}`,
            label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`,
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

export default PieChart;

/**
 * BarChart — vertical bars (grouped | stacked).
 */

import {
  bandScale,
  barRects,
  buildXCategoryTicks,
  buildYTicks,
  cartesianTableModel,
  dashForMark,
  lifecycle,
  linearScale,
  markDatapoint,
  mountChartHost,
  niceDomain,
  normalizeCartesian,
  collectValues,
  patchChartHost,
  renderAxes,
  resolvePalette,
  seriesMark,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

function paintBar(doc, svg, plot, props, data, colors) {
  const variant = props.variant === "stacked" ? "stacked" : "grouped";
  const values = collectValues(data.series, variant);
  const yDomain = niceDomain(values);
  const xScale = bandScale(data.labels, [plot.x0, plot.x1]);
  const yScale = linearScale(yDomain[0], yDomain[1], [plot.y1, plot.y0]);

  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks: buildXCategoryTicks(data.labels, xScale),
      yTicks: buildYTicks(yDomain, yScale),
      xLabel: props.xLabel ? String(props.xLabel) : undefined,
      yLabel: props.yLabel ? String(props.yLabel) : undefined,
      grid: props.grid !== false,
    }),
  );

  const rects = barRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, yDomain },
  );
  const g = svgEl(doc, "g", { class: "canvas-chart__series" });
  for (const r of rects) {
    const mark = seriesMark(r.si);
    const rect = svgEl(doc, "rect", {
      class: "canvas-chart__bar",
      x: r.x,
      y: r.y,
      width: Math.max(0, r.width),
      height: Math.max(0, r.height),
      fill: colors[r.si % colors.length],
      "data-mark": mark,
      "stroke-dasharray": dashForMark(mark),
    });
    markDatapoint(rect, {
      id: `bar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`,
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}

export const BarChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "BarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const data = normalizeCartesian(props);
    const colors = resolvePalette(data.series.length, /** @type {string[]} */ (props.palette));
    patchChartHost(el, doc, props, {
      empty: data.empty,
      legendItems: data.series.map((s, i) => ({
        name: s.name,
        color: colors[i],
        mark: seriesMark(i),
      })),
      tableModel: cartesianTableModel(data.labels, data.series, "Bar chart data"),
      paint(svg, _size, plot) {
        paintBar(doc, svg, plot, props, data, colors);
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default BarChart;

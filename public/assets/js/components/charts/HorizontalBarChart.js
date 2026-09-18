/**
 * HorizontalBarChart — horizontal bars (grouped | stacked).
 */

import {
  bandScale,
  cartesianTableModel,
  collectValues,
  formatTick,
  horizontalBarRects,
  lifecycle,
  linearScale,
  markDatapoint,
  mountChartHost,
  niceDomain,
  niceTicks,
  normalizeCartesian,
  patchChartHost,
  renderAxes,
  resolvePalette,
  seriesMark,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

function paintHBar(doc, svg, plot, props, data, colors) {
  const variant = props.variant === "stacked" ? "stacked" : "grouped";
  const values = collectValues(data.series, variant);
  const xDomain = niceDomain(values);
  const yScale = bandScale(data.labels, [plot.y0, plot.y1]);
  const xScale = linearScale(xDomain[0], xDomain[1], [plot.x0, plot.x1]);

  const xTicks = niceTicks(xDomain[0], xDomain[1], 5).map((v) => ({
    label: formatTick(v),
    x: xScale(v),
  }));
  const yTicks = data.labels.map((label, i) => ({
    label,
    y: yScale(i) + yScale.bandwidth / 2,
  }));

  // Reuse axes renderer: swap roles by drawing custom
  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks,
      yTicks: yTicks.map((t) => ({ label: t.label, y: t.y })),
      xLabel: props.xLabel ? String(props.xLabel) : undefined,
      yLabel: props.yLabel ? String(props.yLabel) : undefined,
      grid: props.grid !== false,
    }),
  );

  const rects = horizontalBarRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, xDomain },
  );
  const g = svgEl(doc, "g", { class: "canvas-chart__series" });
  for (const r of rects) {
    const mark = seriesMark(r.si);
    const rect = svgEl(doc, "rect", {
      class: "canvas-chart__bar canvas-chart__bar--horizontal",
      x: r.x,
      y: r.y,
      width: Math.max(0, r.width),
      height: Math.max(0, r.height),
      fill: colors[r.si % colors.length],
      "data-mark": mark,
    });
    markDatapoint(rect, {
      id: `hbar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`,
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}

export const HorizontalBarChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "HorizontalBarChart");
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
      tableModel: cartesianTableModel(data.labels, data.series, "Horizontal bar chart data"),
      paint(svg, _size, plot) {
        paintHBar(doc, svg, plot, props, data, colors);
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default HorizontalBarChart;

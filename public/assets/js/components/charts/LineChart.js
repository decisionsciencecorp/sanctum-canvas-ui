/**
 * LineChart — categories × series (linear | natural | step).
 */

import {
  bandScale,
  buildXCategoryTicks,
  buildYTicks,
  cartesianTableModel,
  collectValues,
  dashForMark,
  focusDot,
  lifecycle,
  linearScale,
  markDatapoint,
  mountChartHost,
  niceDomain,
  normalizeCartesian,
  patchChartHost,
  renderAxes,
  resolvePalette,
  seriesMark,
  seriesPath,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

function paintLine(doc, svg, plot, props, data, colors, filled) {
  const variant =
    props.variant === "natural" || props.variant === "step" ? props.variant : "linear";
  const values = collectValues(data.series, "grouped");
  const yDomain = niceDomain(values);
  const xScale = bandScale(data.labels, [plot.x0, plot.x1], {
    paddingInner: 0.1,
    paddingOuter: 0.05,
  });
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

  data.series.forEach((s, si) => {
    const mark = seriesMark(si);
    const pathData = seriesPath(s.values, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      yDomain,
      labels: data.labels,
      variant,
    });
    const g = svgEl(doc, "g", { class: "canvas-chart__series", "data-series": s.name });
    if (filled) {
      g.appendChild(
        svgEl(doc, "path", {
          class: "canvas-chart__area",
          d: pathData.area,
          fill: colors[si],
          opacity: "0.25",
          "data-mark": mark,
        }),
      );
    }
    g.appendChild(
      svgEl(doc, "path", {
        class: "canvas-chart__line",
        d: pathData.line,
        fill: "none",
        stroke: colors[si],
        "stroke-width": "2",
        "stroke-dasharray": dashForMark(mark),
        "data-mark": mark,
      }),
    );
    for (const p of pathData.points) {
      const dot = focusDot(doc, p.x, p.y, 4);
      dot.setAttribute("fill", colors[si]);
      markDatapoint(dot, {
        id: `line-${si}-${p.i}`,
        label: `${s.name}, ${data.labels[p.i]}: ${p.value}`,
      });
      g.appendChild(dot);
    }
    svg.appendChild(g);
  });
}

function makeLineLike(typeName, filled) {
  return lifecycle({
    mount(doc) {
      return mountChartHost(doc, typeName);
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
        tableModel: cartesianTableModel(
          data.labels,
          data.series,
          filled ? "Area chart data" : "Line chart data",
        ),
        paint(svg, _size, plot) {
          paintLine(doc, svg, plot, props, data, colors, filled);
        },
      });
    },
    unmount(el) {
      unmountChartHost(el);
    },
  });
}

export const LineChart = makeLineLike("LineChart", false);
export const AreaChart = makeLineLike("AreaChart", true);

export default LineChart;

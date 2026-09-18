/**
 * ScatterChart — X/Y datasets.
 */

import {
  buildYTicks,
  formatTick,
  lifecycle,
  linearScale,
  markDatapoint,
  mountChartHost,
  niceDomain,
  niceTicks,
  normalizeScatter,
  patchChartHost,
  renderAxes,
  resolvePalette,
  scatterPositions,
  scatterTableModel,
  seriesMark,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

export const ScatterChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "ScatterChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { datasets, empty } = normalizeScatter(props);
    const colors = resolvePalette(datasets.length, /** @type {string[]} */ (props.palette));

    patchChartHost(el, doc, props, {
      empty,
      legendItems: datasets.map((d, i) => ({
        name: d.name || `Series ${i + 1}`,
        color: colors[i],
        mark: seriesMark(i),
      })),
      tableModel: scatterTableModel(datasets, "Scatter chart data"),
      paint(svg, _size, plot) {
        const xs = datasets.flatMap((d) => d.points.map((p) => p.x));
        const ys = datasets.flatMap((d) => d.points.map((p) => p.y));
        // Degenerate domains: expand safely
        const xDomain = niceDomain(xs.length ? xs : [0, 1], { includeZero: false, pad: 0.08 });
        const yDomain = niceDomain(ys.length ? ys : [0, 1], { includeZero: false, pad: 0.08 });
        const xScale = linearScale(xDomain[0], xDomain[1], [plot.x0, plot.x1]);
        const yScale = linearScale(yDomain[0], yDomain[1], [plot.y1, plot.y0]);

        svg.appendChild(
          renderAxes(doc, {
            x0: plot.x0,
            x1: plot.x1,
            y0: plot.y0,
            y1: plot.y1,
            xTicks: niceTicks(xDomain[0], xDomain[1], 5).map((v) => ({
              label: formatTick(v),
              x: xScale(v),
            })),
            yTicks: buildYTicks(yDomain, yScale),
            xLabel: props.xLabel ? String(props.xLabel) : undefined,
            yLabel: props.yLabel ? String(props.yLabel) : undefined,
            grid: props.grid !== false,
          }),
        );

        const pts = scatterPositions(datasets, {
          x0: plot.x0,
          x1: plot.x1,
          y0: plot.y0,
          y1: plot.y1,
          xDomain,
          yDomain,
        });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        const shape = props.shape === "square" ? "square" : "circle";
        for (const p of pts) {
          let node;
          if (shape === "square") {
            const s = 7;
            node = svgEl(doc, "rect", {
              class: "canvas-chart__point",
              x: p.x - s / 2,
              y: p.y - s / 2,
              width: s,
              height: s,
              fill: colors[p.si % colors.length],
              "data-mark": seriesMark(p.si),
            });
          } else {
            node = svgEl(doc, "circle", {
              class: "canvas-chart__point",
              cx: p.x,
              cy: p.y,
              r: 4,
              fill: colors[p.si % colors.length],
              "data-mark": seriesMark(p.si),
            });
          }
          markDatapoint(node, {
            id: `scatter-${p.si}-${p.i}`,
            label: `${p.series || "Point"}: (${p.vx}, ${p.vy})`,
          });
          g.appendChild(node);
        }
        svg.appendChild(g);
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default ScatterChart;

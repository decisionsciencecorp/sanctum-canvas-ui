/**
 * RadarChart — spider/web over categories × series.
 */

import {
  cartesianTableModel,
  collectValues,
  dashForMark,
  lifecycle,
  markDatapoint,
  mountChartHost,
  normalizeCartesian,
  patchChartHost,
  radarGeometry,
  resolvePalette,
  seriesMark,
  svgEl,
  unmountChartHost,
} from "./kernel/index.js";

export const RadarChart = lifecycle({
  mount(doc) {
    return mountChartHost(doc, "RadarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const data = normalizeCartesian(props);
    const colors = resolvePalette(data.series.length, /** @type {string[]} */ (props.palette));
    const max = Math.max(...collectValues(data.series), 1);

    patchChartHost(el, doc, props, {
      empty: data.empty || data.labels.length < 3,
      emptyMessage: data.labels.length < 3 ? "Radar needs at least 3 categories" : "No chart data",
      legendItems: data.series.map((s, i) => ({
        name: s.name,
        color: colors[i],
        mark: seriesMark(i),
      })),
      tableModel: cartesianTableModel(data.labels, data.series, "Radar chart data"),
      paint(svg, _size, plot) {
        const cx = (plot.x0 + plot.x1) / 2;
        const cy = (plot.y0 + plot.y1) / 2;
        const r = Math.max(12, Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 20);

        // Use first series length aligned to labels for axes/rings
        const axisVals = data.labels.map(() => max);
        const base = radarGeometry(axisVals, { cx, cy, r, max, levels: 4 });

        const grid = svgEl(doc, "g", { class: "canvas-chart__radar-grid" });
        for (const ring of base.rings) {
          grid.appendChild(
            svgEl(doc, "path", {
              class: "canvas-chart__radar-ring",
              d: ring,
              fill: "none",
            }),
          );
        }
        for (const ax of base.axes) {
          grid.appendChild(
            svgEl(doc, "line", {
              class: "canvas-chart__radar-axis",
              x1: ax.x1,
              y1: ax.y1,
              x2: ax.x2,
              y2: ax.y2,
            }),
          );
          const label = data.labels[ax.i] || "";
          // Compact canvases: skip labels when radius is small
          if (r >= 48 && label) {
            const lx = ax.x2 + (ax.x2 - cx) * 0.08;
            const ly = ax.y2 + (ax.y2 - cy) * 0.08;
            const t = svgEl(doc, "text", {
              class: "canvas-chart__tick-label",
              x: lx,
              y: ly,
              "text-anchor": "middle",
              "dominant-baseline": "middle",
            });
            t.textContent = label;
            grid.appendChild(t);
          }
        }
        svg.appendChild(grid);

        data.series.forEach((s, si) => {
          const mark = seriesMark(si);
          const geo = radarGeometry(s.values.slice(0, data.labels.length), {
            cx,
            cy,
            r,
            max,
          });
          const g = svgEl(doc, "g", { class: "canvas-chart__series" });
          g.appendChild(
            svgEl(doc, "path", {
              class: "canvas-chart__radar-area",
              d: geo.polygon,
              fill: colors[si],
              opacity: "0.2",
              stroke: colors[si],
              "stroke-width": "2",
              "stroke-dasharray": dashForMark(mark),
              "data-mark": mark,
            }),
          );
          for (const p of geo.points) {
            const c = svgEl(doc, "circle", {
              class: "canvas-chart__point",
              cx: p.x,
              cy: p.y,
              r: 3.5,
              fill: colors[si],
            });
            markDatapoint(c, {
              id: `radar-${si}-${p.i}`,
              label: `${s.name}, ${data.labels[p.i]}: ${p.value}`,
            });
            g.appendChild(c);
          }
          svg.appendChild(g);
        });
      },
    });
  },
  unmount(el) {
    unmountChartHost(el);
  },
});

export default RadarChart;

import {
  lifecycle,
  setInlineStyle
} from "./chunk-SL6LI3PJ.js";
import "./chunk-MLKGABMK.js";

// src/Browser/components/charts/kernel/scales.js
function linearScale(domainMin, domainMax, range) {
  const [r0, r1] = range;
  const d0 = Number(domainMin);
  const d1 = Number(domainMax);
  const span = d1 - d0;
  if (!Number.isFinite(d0) || !Number.isFinite(d1) || span === 0) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  return (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return r0;
    return r0 + (n - d0) / span * (r1 - r0);
  };
}
function bandScale(domain, range, opts = {}) {
  const labels = Array.isArray(domain) ? domain : [];
  const [r0, r1] = range;
  const n = Math.max(labels.length, 1);
  const padInner = opts.paddingInner ?? opts.padding ?? 0.2;
  const padOuter = opts.paddingOuter ?? opts.padding ?? 0.1;
  const span = r1 - r0;
  const step = span / (n - padInner + 2 * padOuter);
  const bandwidth = Math.max(0, step * (1 - padInner));
  const start = r0 + padOuter * step;
  function scale(i) {
    const idx = Number(i);
    if (!Number.isFinite(idx) || idx < 0) return start;
    return start + idx * step;
  }
  scale.bandwidth = bandwidth;
  scale.step = step;
  return scale;
}
function niceDomain(values, opts = {}) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return [0, 1];
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (opts.includeZero !== false) {
    if (min > 0) min = 0;
    if (max < 0) max = 0;
  }
  if (min === max) {
    if (min === 0) return [0, 1];
    const pad2 = Math.abs(min) * 0.1 || 1;
    return [min - pad2, max + pad2];
  }
  const pad = (opts.pad ?? 0.05) * (max - min);
  return [min - (opts.includeZero === false ? pad : 0), max + pad];
}
function niceTicks(min, max, count = 5) {
  const d0 = Number(min);
  const d1 = Number(max);
  const n = Math.max(2, Math.floor(count) || 5);
  if (!Number.isFinite(d0) || !Number.isFinite(d1)) return [0, 1];
  if (d0 === d1) return [d0];
  const span = d1 - d0;
  const step0 = span / (n - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(step0) || 1)));
  const err = step0 / mag;
  let niceStep;
  if (err <= 1.5) niceStep = 1 * mag;
  else if (err <= 3) niceStep = 2 * mag;
  else if (err <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;
  const start = Math.ceil(d0 / niceStep) * niceStep;
  const ticks = [];
  for (let v = start; v <= d1 + niceStep * 1e-9; v += niceStep) {
    const rounded = Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12));
    ticks.push(rounded);
    if (ticks.length > 20) break;
  }
  if (!ticks.length) ticks.push(d0, d1);
  return ticks;
}
function formatTick(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(4)));
}

// src/Browser/components/charts/kernel/geometry.js
function polarToCartesian(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}
function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  const o0 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o1 = polarToCartesian(cx, cy, rOuter, endAngle);
  if (rInner <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${o0.x} ${o0.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
      "Z"
    ].join(" ");
  }
  const i0 = polarToCartesian(cx, cy, rInner, endAngle);
  const i1 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
    `L ${i0.x} ${i0.y}`,
    `A ${rInner} ${rInner} 0 ${large} ${sweep ? 0 : 1} ${i1.x} ${i1.y}`,
    "Z"
  ].join(" ");
}
function pieSlices(slices, opts) {
  const items = (Array.isArray(slices) ? slices : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const total = items.reduce((a, s) => a + s.value, 0);
  const start0 = opts.startAngle ?? -Math.PI / 2;
  const end0 = opts.endAngle ?? start0 + Math.PI * 2;
  const span = end0 - start0;
  const pad = opts.padAngle ?? 0;
  const rInner = opts.rInner ?? 0;
  const out = [];
  if (!items.length || total <= 0 || !Number.isFinite(span) || span === 0) {
    return out;
  }
  let angle = start0;
  const usable = span - pad * items.length;
  for (const item of items) {
    const portion = item.value / total;
    const sliceSpan = Math.max(0, usable * portion);
    const a0 = angle + pad / 2;
    const a1 = a0 + sliceSpan;
    out.push({
      ...item,
      percent: portion * 100,
      startAngle: a0,
      endAngle: a1,
      midAngle: (a0 + a1) / 2,
      path: donutArcPath(opts.cx, opts.cy, opts.rOuter, rInner, a0, a1)
    });
    angle = a1 + pad / 2;
  }
  return out;
}
function barRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const xScale = bandScale(labels, [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const out = [];
  if (variant === "stacked") {
    for (let i = 0; i < labels.length; i++) {
      let accPos = 0;
      let accNeg = 0;
      const bw = xScale.bandwidth;
      const x = xScale(i);
      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        const v = Number(s.values?.[i]) || 0;
        const yBase = v >= 0 ? accPos : accNeg;
        const y1 = yScale(yBase);
        const y0 = yScale(yBase + v);
        const top = Math.min(y0, y1);
        const h = Math.abs(y1 - y0);
        out.push({
          series: s.name,
          label: labels[i],
          value: v,
          x,
          y: top,
          width: bw,
          height: h,
          i,
          si
        });
        if (v >= 0) accPos += v;
        else accNeg += v;
      }
    }
    return out;
  }
  const group = xScale.bandwidth;
  const n = Math.max(series.length, 1);
  const gap = group * 0.08;
  const barW = Math.max(1, (group - gap * (n - 1)) / n);
  const y0line = yScale(0);
  for (let i = 0; i < labels.length; i++) {
    const baseX = xScale(i);
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const v = Number(s.values?.[i]) || 0;
      const yv = yScale(v);
      const top = Math.min(yv, y0line);
      const h = Math.abs(yv - y0line);
      out.push({
        series: s.name,
        label: labels[i],
        value: v,
        x: baseX + si * (barW + gap),
        y: top,
        width: barW,
        height: h,
        i,
        si
      });
    }
  }
  return out;
}
function horizontalBarRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const yScale = bandScale(labels, [plot.y0, plot.y1]);
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  const out = [];
  const x0line = xScale(0);
  if (variant === "stacked") {
    for (let i = 0; i < labels.length; i++) {
      let accPos = 0;
      let accNeg = 0;
      const bh = yScale.bandwidth;
      const y = yScale(i);
      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        const v = Number(s.values?.[i]) || 0;
        const xBase = v >= 0 ? accPos : accNeg;
        const x1 = xScale(xBase);
        const x2 = xScale(xBase + v);
        out.push({
          series: s.name,
          label: labels[i],
          value: v,
          x: Math.min(x1, x2),
          y,
          width: Math.abs(x2 - x1),
          height: bh,
          i,
          si
        });
        if (v >= 0) accPos += v;
        else accNeg += v;
      }
    }
    return out;
  }
  const group = yScale.bandwidth;
  const n = Math.max(series.length, 1);
  const gap = group * 0.08;
  const barH = Math.max(1, (group - gap * (n - 1)) / n);
  for (let i = 0; i < labels.length; i++) {
    const baseY = yScale(i);
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const v = Number(s.values?.[i]) || 0;
      const xv = xScale(v);
      out.push({
        series: s.name,
        label: labels[i],
        value: v,
        x: Math.min(xv, x0line),
        y: baseY + si * (barH + gap),
        width: Math.abs(xv - x0line),
        height: barH,
        i,
        si
      });
    }
  }
  return out;
}
function seriesPath(values, plot) {
  const labels = plot.labels || [];
  const n = labels.length;
  const xScale = bandScale(labels, [plot.x0, plot.x1], { paddingInner: 0.1, paddingOuter: 0.05 });
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const bw = xScale.bandwidth;
  const points = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values?.[i]) || 0;
    points.push({
      x: xScale(i) + bw / 2,
      y: yScale(v),
      value: v,
      i
    });
  }
  const variant = plot.variant || "linear";
  let line = "";
  if (variant === "step") {
    line = points.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `L ${mid} ${prev.y} L ${mid} ${p.y} L ${p.x} ${p.y}`;
    }).join(" ");
  } else if (variant === "natural" && points.length >= 2) {
    line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  } else {
    line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }
  const yBase = yScale(Math.min(Math.max(0, plot.yDomain[0]), plot.yDomain[1]));
  let area = "";
  if (points.length) {
    area = `${line} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`;
  }
  return { line, area, points };
}
function radarGeometry(values, opts) {
  const vals = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
  const n = Math.max(vals.length, 3);
  const max = opts.max && opts.max > 0 ? opts.max : Math.max(...vals, 1);
  const start = -Math.PI / 2;
  const points = [];
  const axes = [];
  for (let i = 0; i < n; i++) {
    const angle = start + i * 2 * Math.PI / n;
    const tip = polarToCartesian(opts.cx, opts.cy, opts.r, angle);
    axes.push({ x1: opts.cx, y1: opts.cy, x2: tip.x, y2: tip.y, i });
    const v = vals[i] ?? 0;
    const rr = Math.max(0, v) / max * opts.r;
    const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
    points.push({ ...p, value: v, i });
  }
  const polygon = points.length ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z" : "";
  const levels = opts.levels ?? 4;
  const rings = [];
  for (let L = 1; L <= levels; L++) {
    const rr = opts.r * L / levels;
    const ringPts = [];
    for (let i = 0; i < n; i++) {
      const angle = start + i * 2 * Math.PI / n;
      const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
      ringPts.push(`${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
    }
    rings.push(ringPts.join(" ") + " Z");
  }
  return { points, polygon, axes, rings };
}
function radialBars(items, opts) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const max = Math.max(...rows.map((r) => r.value), 1);
  const start0 = opts.startAngle ?? -Math.PI / 2;
  const end0 = opts.endAngle ?? start0 + Math.PI * 2;
  const span = end0 - start0;
  const n = Math.max(rows.length, 1);
  const track = (opts.rOuter - opts.rInner) / n;
  return rows.map((row, i) => {
    const r1 = opts.rInner + i * track + track * 0.15;
    const r0 = opts.rInner + (i + 1) * track - track * 0.15;
    const a1 = start0 + span * (row.value / max);
    return {
      ...row,
      percent: row.value / max * 100,
      i,
      rInner: r1,
      rOuter: r0,
      startAngle: start0,
      endAngle: a1,
      path: donutArcPath(opts.cx, opts.cy, r0, r1, start0, a1)
    };
  });
}
function scatterPositions(datasets, plot) {
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const out = [];
  (datasets || []).forEach((ds, si) => {
    (ds.points || []).forEach((pt, i) => {
      const vx = Number(pt.x);
      const vy = Number(pt.y);
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;
      out.push({
        series: ds.name,
        x: xScale(vx),
        y: yScale(vy),
        vx,
        vy,
        z: pt.z != null ? Number(pt.z) : void 0,
        i,
        si
      });
    });
  });
  return out;
}
function stackedBarSegments(items, plot) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  const width = plot.x1 - plot.x0;
  let x = plot.x0;
  return rows.map((row, i) => {
    const w = row.value / total * width;
    const seg = {
      ...row,
      percent: row.value / total * 100,
      x,
      y: plot.y,
      width: w,
      height: plot.height,
      i
    };
    x += w;
    return seg;
  });
}

// src/Browser/components/charts/kernel/palette.js
var CHART_PALETTE_FALLBACKS = Object.freeze([
  "#0D47A1",
  "#208B3A",
  "#B12A90",
  "#E16462",
  "#FCA636",
  "#1976D2",
  "#7014CC",
  "#CB253E"
]);
var SERIES_MARKS = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
function resolvePalette(count, custom) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (Array.isArray(custom) && custom.length) {
    return Array.from({ length: n }, (_, i) => String(custom[i % custom.length]));
  }
  return Array.from({ length: n }, (_, i) => {
    const idx = i % 8 + 1;
    return `var(--canvas-chart-${idx}, ${CHART_PALETTE_FALLBACKS[i % CHART_PALETTE_FALLBACKS.length]})`;
  });
}
function seriesMark(seriesIndex) {
  return SERIES_MARKS[seriesIndex % SERIES_MARKS.length];
}
function dashForMark(mark) {
  switch (mark) {
    case "dashed":
      return "6 4";
    case "dotted":
      return "2 3";
    case "dashdot":
      return "8 3 2 3";
    default:
      return null;
  }
}

// src/Browser/components/charts/kernel/measure.js
function observeSize(el, onSize, defaults = {}) {
  const fallbackW = Number(defaults.width) || 320;
  const fallbackH = Number(defaults.height) || 240;
  const read = () => {
    const w = Number(el.clientWidth) || Number(
      /** @type {any} */
      el.offsetWidth
    ) || fallbackW;
    const h = Number(el.clientHeight) || Number(
      /** @type {any} */
      el.offsetHeight
    ) || fallbackH;
    return {
      width: Math.max(40, w),
      height: Math.max(40, h)
    };
  };
  let current = read();
  onSize(current);
  let observer = null;
  const RO = globalThis.ResizeObserver;
  if (typeof RO === "function") {
    const ro = new RO(() => {
      current = read();
      onSize(current);
    });
    try {
      ro.observe(el);
      observer = ro;
    } catch {
      observer = null;
    }
  }
  return {
    disconnect() {
      observer?.disconnect?.();
      observer = null;
    },
    getSize() {
      return current;
    }
  };
}
function resolveChartSize(props, measured) {
  const height = Number(props.height);
  const width = Number(props.width);
  return {
    width: Number.isFinite(width) && width > 0 ? width : measured.width,
    height: Number.isFinite(height) && height > 0 ? height : measured.height || 240
  };
}

// src/Browser/components/charts/kernel/normalize.js
function unwrap(node) {
  if (node == null) return null;
  if (typeof node !== "object") return null;
  const o = (
    /** @type {Record<string, unknown>} */
    node
  );
  if (o.type === "element" && o.props && typeof o.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      o.props
    );
  }
  if (typeof o.type === "string" && o.type !== "element" && o.props && typeof o.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      o.props
    );
  }
  return o;
}
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}
function normalizeLabels(labels) {
  return asArray(labels).map((l) => String(l ?? ""));
}
function normalizeSeries(series) {
  return asArray(series).map((item) => {
    const p = unwrap(item) || {};
    const name = String(p.category ?? p.name ?? "");
    const values = asArray(p.values).map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
    return { name, values };
  }).filter((s) => s.name !== "" || s.values.length);
}
function normalizeCartesian(props) {
  const labels = normalizeLabels(props.labels);
  let series = normalizeSeries(props.series);
  const rows = asArray(props.series);
  if (rows.length && Array.isArray(rows[0])) {
    const seriesNames = labels.slice(1);
    const cats = rows.map((row) => String(
      /** @type {unknown[]} */
      row[0] ?? ""
    ));
    series = seriesNames.map((name, si) => ({
      name,
      values: rows.map((row) => {
        const n = Number(
          /** @type {unknown[]} */
          row[si + 1]
        );
        return Number.isFinite(n) ? n : 0;
      })
    }));
    return {
      labels: cats,
      series,
      empty: !cats.length || !series.length
    };
  }
  return {
    labels,
    series,
    empty: !labels.length || !series.length
  };
}
function normalizeSlices(props) {
  const labels = normalizeLabels(props.labels);
  const values = asArray(props.values).map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
  if (labels.length && values.length) {
    const n = Math.min(labels.length, values.length);
    const items2 = Array.from({ length: n }, (_, i) => ({
      label: labels[i],
      value: values[i]
    }));
    return { items: items2, empty: !items2.length || items2.every((x) => x.value === 0) };
  }
  const items = asArray(props.labels).map((node) => {
    const p = unwrap(node);
    if (!p || p.category == null) return null;
    const value = Number(p.value);
    return {
      label: String(p.category),
      value: Number.isFinite(value) ? value : 0
    };
  }).filter(Boolean);
  return {
    items: (
      /** @type {{ label: string, value: number }[]} */
      items
    ),
    empty: !items.length
  };
}
function normalizeScatter(props) {
  const datasets = asArray(props.datasets).map((ds) => {
    const p = unwrap(ds) || {};
    const name = String(p.name ?? "");
    const points = asArray(p.points).map((pt) => {
      const q = unwrap(pt) || {};
      const x = Number(q.x);
      const y = Number(q.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const z = q.z != null ? Number(q.z) : void 0;
      return Number.isFinite(z) ? { x, y, z } : { x, y };
    }).filter(Boolean);
    return {
      name,
      points: (
        /** @type {{ x: number, y: number, z?: number }[]} */
        points
      )
    };
  }).filter((d) => d.points.length);
  return { datasets, empty: !datasets.length };
}
function collectValues(series, variant = "grouped") {
  if (variant === "stacked") {
    const len = Math.max(0, ...series.map((s) => s.values.length));
    const sums = [];
    for (let i = 0; i < len; i++) {
      let pos = 0;
      let neg = 0;
      for (const s of series) {
        const v = Number(s.values[i]) || 0;
        if (v >= 0) pos += v;
        else neg += v;
      }
      sums.push(pos, neg);
    }
    return sums;
  }
  return series.flatMap((s) => s.values);
}

// src/Browser/components/charts/kernel/svg.js
var SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(doc, tag, attrs = {}) {
  const el = typeof doc.createElementNS === "function" ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, String(v));
  }
  return el;
}
function setAttr(el, name, value) {
  if (value == null || value === false || value === "") el.removeAttribute(name);
  else el.setAttribute(name, String(value));
}

// src/Browser/components/charts/kernel/axes.js
function renderAxes(doc, opts) {
  const g = svgEl(doc, "g", { class: "canvas-chart__axes" });
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--x",
      x1: opts.x0,
      y1: opts.y1,
      x2: opts.x1,
      y2: opts.y1
    })
  );
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--y",
      x1: opts.x0,
      y1: opts.y0,
      x2: opts.x0,
      y2: opts.y1
    })
  );
  for (const t of opts.yTicks || []) {
    if (opts.grid !== false) {
      g.appendChild(
        svgEl(doc, "line", {
          class: "canvas-chart__grid-line",
          x1: opts.x0,
          y1: t.y,
          x2: opts.x1,
          y2: t.y
        })
      );
    }
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--y",
        x: opts.x0 - 6,
        y: t.y,
        "text-anchor": "end",
        "dominant-baseline": "middle"
      })
    ).textContent = t.label;
  }
  for (const t of opts.xTicks || []) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--x",
        x: t.x,
        y: opts.y1 + 14,
        "text-anchor": "middle",
        "dominant-baseline": "hanging"
      })
    ).textContent = t.label;
  }
  if (opts.xLabel) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__axis-title canvas-chart__axis-title--x",
        x: (opts.x0 + opts.x1) / 2,
        y: opts.y1 + 32,
        "text-anchor": "middle"
      })
    ).textContent = opts.xLabel;
  }
  if (opts.yLabel) {
    const ty = svgEl(doc, "text", {
      class: "canvas-chart__axis-title canvas-chart__axis-title--y",
      x: 12,
      y: (opts.y0 + opts.y1) / 2,
      "text-anchor": "middle",
      transform: `rotate(-90 12 ${(opts.y0 + opts.y1) / 2})`
    });
    ty.textContent = opts.yLabel;
    g.appendChild(ty);
  }
  return (
    /** @type {SVGGElement} */
    g
  );
}
function buildYTicks(domain, yScale, count = 5) {
  return niceTicks(domain[0], domain[1], count).map((v) => ({
    label: formatTick(v),
    y: yScale(v),
    value: v
  }));
}
function buildXCategoryTicks(labels, xScale, maxLabels = 12) {
  const n = labels.length;
  const step = n > maxLabels ? Math.ceil(n / maxLabels) : 1;
  const ticks = [];
  for (let i = 0; i < n; i += step) {
    ticks.push({
      label: labels[i],
      x: xScale(i) + xScale.bandwidth / 2
    });
  }
  return ticks;
}

// src/Browser/components/charts/kernel/legend.js
function renderLegend(doc, items) {
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

// src/Browser/components/charts/kernel/dataTable.js
function renderDataTable(doc, data) {
  const wrap = doc.createElement("div");
  wrap.setAttribute("class", "canvas-chart__data-table");
  wrap.setAttribute("data-canvas-chart-table", "");
  const table = doc.createElement("table");
  table.setAttribute("class", "canvas-chart__table");
  if (data.caption) {
    const cap = doc.createElement("caption");
    cap.setAttribute("class", "canvas-chart__table-caption");
    cap.textContent = data.caption;
    table.appendChild(cap);
  }
  const thead = doc.createElement("thead");
  const hr = doc.createElement("tr");
  for (const col of data.columns || []) {
    const th = doc.createElement("th");
    th.setAttribute("scope", "col");
    th.textContent = String(col);
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = doc.createElement("tbody");
  for (const row of data.rows || []) {
    const tr = doc.createElement("tr");
    row.forEach((cell, i) => {
      const td = doc.createElement(i === 0 ? "th" : "td");
      if (i === 0) td.setAttribute("scope", "row");
      td.textContent = String(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
function cartesianTableModel(labels, series, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", ...series.map((s) => s.name)],
    rows: labels.map((label, i) => [
      label,
      ...series.map((s) => Number.isFinite(Number(s.values[i])) ? Number(s.values[i]) : "")
    ])
  };
}
function slicesTableModel(items, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", "Value"],
    rows: items.map((it) => [it.label, it.value])
  };
}
function scatterTableModel(datasets, caption) {
  const rows = [];
  for (const ds of datasets) {
    for (const p of ds.points) {
      rows.push([ds.name, p.x, p.y, p.z != null ? p.z : ""]);
    }
  }
  return {
    caption: caption || "Scatter data",
    columns: ["Series", "X", "Y", "Z"],
    rows
  };
}

// src/Browser/components/charts/kernel/datapoints.js
function markDatapoint(shape, meta) {
  setAttr(shape, "tabindex", "0");
  setAttr(shape, "role", "img");
  setAttr(shape, "aria-label", meta.label);
  setAttr(shape, "data-canvas-datapoint", meta.id);
  setAttr(shape, "focusable", "true");
}
function attachDatapointKeyboard(host, tooltipEl) {
  let activeId = null;
  const setActive = (id, text) => {
    activeId = id;
    if (id == null) {
      tooltipEl.setAttribute("hidden", "");
      tooltipEl.textContent = "";
      tooltipEl.removeAttribute("data-active-id");
      return;
    }
    tooltipEl.removeAttribute("hidden");
    tooltipEl.setAttribute("data-active-id", id);
    if (text != null) tooltipEl.textContent = text;
  };
  const onFocusIn = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (!id) return;
    setActive(id, t.getAttribute("aria-label") || "");
  };
  const onFocusOut = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (id && activeId === id) setActive(null);
  };
  const onKeyDown = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    if (!t?.getAttribute?.("data-canvas-datapoint")) return;
    const points = collectDatapoints(host);
    if (!points.length) return;
    const idx = points.findIndex((p) => p === t);
    if (idx < 0) return;
    let next = idx;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (idx + 1) % points.length;
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp")
      next = (idx - 1 + points.length) % points.length;
    else if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = points.length - 1;
    else if (ev.key === "Escape") {
      setActive(null);
      t.blur?.();
      return;
    } else return;
    ev.preventDefault?.();
    const el = points[next];
    el.focus?.();
    setActive(
      el.getAttribute("data-canvas-datapoint"),
      el.getAttribute("aria-label") || ""
    );
  };
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);
  host.addEventListener("keydown", onKeyDown);
  return {
    setActive,
    destroy() {
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      host.removeEventListener("keydown", onKeyDown);
      setActive(null);
    }
  };
}
function collectDatapoints(host) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (n.getAttribute?.("data-canvas-datapoint") != null) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(host);
  return out;
}
function createTooltip(doc) {
  const el = doc.createElement("div");
  el.setAttribute("class", "canvas-chart__tooltip");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("hidden", "");
  return el;
}
function focusDot(doc, cx, cy, r = 4) {
  return svgEl(doc, "circle", {
    class: "canvas-chart__point",
    cx,
    cy,
    r
  });
}

// src/Browser/components/charts/kernel/shared.js
var SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error"
});
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("chart component: ctx.document required");
  }
  return doc;
}
function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function resolveStatus(props = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}
function applySurfaceStatus(el, doc, props = {}, opts = {}) {
  const status = resolveStatus(props);
  el.setAttribute("data-status", status);
  if (status === "loading") el.setAttribute("aria-busy", "true");
  else el.removeAttribute("aria-busy");
  for (const child of [...el.childNodes ?? []]) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      el.removeChild(child);
    }
  }
  if (status === "loading" || status === "empty" || status === "error") {
    const statusEl = doc.createElement("span");
    statusEl.setAttribute("data-canvas-status-text", "");
    statusEl.setAttribute("class", "canvas-status-text canvas-chart__status");
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", status === "error" ? "assertive" : "polite");
    statusEl.textContent = status === "loading" ? asText(props.loadingMessage) || opts.loadingMessage || "Loading" : status === "empty" ? asText(props.emptyMessage) || opts.emptyMessage || "No data" : asText(props.errorMessage ?? props.error) || opts.errorMessage || "Error";
    el.appendChild(statusEl);
  }
  return { status };
}
function lifecycle2(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    ownsChildren: true
  };
}
var chartRuntime = /* @__PURE__ */ new WeakMap();
function prefersReducedMotion(doc) {
  try {
    const mq = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    return !!mq?.matches;
  } catch {
    return false;
  }
}

// src/Browser/components/charts/kernel/chartFrame.js
function mountChartHost(doc, typeName) {
  const el = doc.createElement("div");
  el.setAttribute("data-canvas-component", typeName);
  el.setAttribute("class", `canvas-chart canvas-chart--${typeName}`);
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", typeName);
  return el;
}
function patchChartHost(el, doc, props, spec) {
  const prev = chartRuntime.get(el);
  prev?.disconnect?.();
  prev?.destroyKeyboard?.();
  const statusProps = { ...props };
  if (spec.empty && resolveReady(props)) {
    statusProps.status = "empty";
  }
  setClass(
    el,
    `canvas-chart canvas-chart--${el.getAttribute("data-canvas-component")} ${prefersReducedMotion(doc) ? "canvas-chart--reduced-motion" : ""}`.trim()
  );
  clearChildren(el);
  const { status } = applySurfaceStatus(el, doc, statusProps, {
    emptyMessage: spec.emptyMessage || "No chart data"
  });
  if (status !== "ready") {
    chartRuntime.set(el, {});
    return;
  }
  const body = doc.createElement("div");
  body.setAttribute("class", "canvas-chart__body");
  const plotHost = doc.createElement("div");
  plotHost.setAttribute("class", "canvas-chart__plot");
  const tooltip = createTooltip(doc);
  const svg = svgEl(doc, "svg", {
    class: "canvas-chart__svg",
    role: "img",
    "aria-hidden": "true"
  });
  plotHost.appendChild(svg);
  plotHost.appendChild(tooltip);
  body.appendChild(plotHost);
  if (spec.legendItems?.length && props.legend !== false) {
    body.appendChild(renderLegend(doc, spec.legendItems));
  }
  el.appendChild(body);
  if (spec.tableModel && props.showDataTable !== false) {
    el.appendChild(renderDataTable(doc, spec.tableModel));
  }
  const keyboard = attachDatapointKeyboard(el, tooltip);
  const paint = (size) => {
    const resolved = resolveChartSize(props, size);
    if (!Number(props.height) && size.height <= 40) {
      resolved.height = 240;
    }
    svg.setAttribute("width", String(resolved.width));
    svg.setAttribute("height", String(resolved.height));
    svg.setAttribute("viewBox", `0 0 ${resolved.width} ${resolved.height}`);
    clearChildren(svg);
    const margin = {
      top: 16,
      right: 16,
      bottom: props.xLabel ? 48 : 36,
      left: props.yLabel ? 48 : 40
    };
    const plot = {
      x0: margin.left,
      x1: Math.max(margin.left + 10, resolved.width - margin.right),
      y0: margin.top,
      y1: Math.max(margin.top + 10, resolved.height - margin.bottom),
      width: resolved.width,
      height: resolved.height
    };
    spec.paint(svg, resolved, plot);
  };
  const obs = observeSize(plotHost, paint, {
    width: Number(props.width) || 320,
    height: Number(props.height) || 240
  });
  chartRuntime.set(el, {
    disconnect: () => obs.disconnect(),
    destroyKeyboard: () => keyboard.destroy()
  });
}
function resolveReady(props) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "error") return false;
  if (props.loading === true) return false;
  if (props.error != null && props.error !== false) return false;
  return true;
}
function unmountChartHost(el) {
  const rt = chartRuntime.get(el);
  rt?.disconnect?.();
  rt?.destroyKeyboard?.();
  chartRuntime.delete(el);
}

// src/Browser/components/charts/BarChart.js
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
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
  );
  const rects = barRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, yDomain }
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
      "stroke-dasharray": dashForMark(mark)
    });
    markDatapoint(rect, {
      id: `bar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}
var BarChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "BarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const data = normalizeCartesian(props);
    const colors = resolvePalette(
      data.series.length,
      /** @type {string[]} */
      props.palette
    );
    patchChartHost(el, doc, props, {
      empty: data.empty,
      legendItems: data.series.map((s, i) => ({
        name: s.name,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: cartesianTableModel(data.labels, data.series, "Bar chart data"),
      paint(svg, _size, plot) {
        paintBar(doc, svg, plot, props, data, colors);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/LineChart.js
function paintLine(doc, svg, plot, props, data, colors, filled) {
  const variant = props.variant === "natural" || props.variant === "step" ? props.variant : "linear";
  const values = collectValues(data.series, "grouped");
  const yDomain = niceDomain(values);
  const xScale = bandScale(data.labels, [plot.x0, plot.x1], {
    paddingInner: 0.1,
    paddingOuter: 0.05
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
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
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
      variant
    });
    const g = svgEl(doc, "g", { class: "canvas-chart__series", "data-series": s.name });
    if (filled) {
      g.appendChild(
        svgEl(doc, "path", {
          class: "canvas-chart__area",
          d: pathData.area,
          fill: colors[si],
          opacity: "0.25",
          "data-mark": mark
        })
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
        "data-mark": mark
      })
    );
    for (const p of pathData.points) {
      const dot = focusDot(doc, p.x, p.y, 4);
      dot.setAttribute("fill", colors[si]);
      markDatapoint(dot, {
        id: `line-${si}-${p.i}`,
        label: `${s.name}, ${data.labels[p.i]}: ${p.value}`
      });
      g.appendChild(dot);
    }
    svg.appendChild(g);
  });
}
function makeLineLike(typeName, filled) {
  return lifecycle2({
    mount(doc) {
      return mountChartHost(doc, typeName);
    },
    patch(el, props = {}, ctx = {}) {
      const doc = ctx.document ?? el.ownerDocument;
      const data = normalizeCartesian(props);
      const colors = resolvePalette(
        data.series.length,
        /** @type {string[]} */
        props.palette
      );
      patchChartHost(el, doc, props, {
        empty: data.empty,
        legendItems: data.series.map((s, i) => ({
          name: s.name,
          color: colors[i],
          mark: seriesMark(i)
        })),
        tableModel: cartesianTableModel(
          data.labels,
          data.series,
          filled ? "Area chart data" : "Line chart data"
        ),
        paint(svg, _size, plot) {
          paintLine(doc, svg, plot, props, data, colors, filled);
        }
      });
    },
    unmount(el) {
      unmountChartHost(el);
    }
  });
}
var LineChart = makeLineLike("LineChart", false);
var AreaChart = makeLineLike("AreaChart", true);

// src/Browser/components/charts/HorizontalBarChart.js
function paintHBar(doc, svg, plot, props, data, colors) {
  const variant = props.variant === "stacked" ? "stacked" : "grouped";
  const values = collectValues(data.series, variant);
  const xDomain = niceDomain(values);
  const yScale = bandScale(data.labels, [plot.y0, plot.y1]);
  const xScale = linearScale(xDomain[0], xDomain[1], [plot.x0, plot.x1]);
  const xTicks = niceTicks(xDomain[0], xDomain[1], 5).map((v) => ({
    label: formatTick(v),
    x: xScale(v)
  }));
  const yTicks = data.labels.map((label, i) => ({
    label,
    y: yScale(i) + yScale.bandwidth / 2
  }));
  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks,
      yTicks: yTicks.map((t) => ({ label: t.label, y: t.y })),
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
  );
  const rects = horizontalBarRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, xDomain }
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
      "data-mark": mark
    });
    markDatapoint(rect, {
      id: `hbar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}
var HorizontalBarChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "HorizontalBarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const data = normalizeCartesian(props);
    const colors = resolvePalette(
      data.series.length,
      /** @type {string[]} */
      props.palette
    );
    patchChartHost(el, doc, props, {
      empty: data.empty,
      legendItems: data.series.map((s, i) => ({
        name: s.name,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: cartesianTableModel(data.labels, data.series, "Horizontal bar chart data"),
      paint(svg, _size, plot) {
        paintHBar(doc, svg, plot, props, data, colors);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/PieChart.js
var PieChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "PieChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { items, empty } = normalizeSlices(props);
    const colors = resolvePalette(
      items.length,
      /** @type {string[]} */
      props.palette
    );
    const variant = props.variant === "donut" ? "donut" : "pie";
    const appearance = props.appearance === "semiCircular" ? "semiCircular" : "circular";
    patchChartHost(el, doc, props, {
      empty,
      legendItems: items.map((it, i) => ({
        name: it.label,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: slicesTableModel(items, "Pie chart data"),
      paint(svg, size, plot) {
        const cx = (plot.x0 + plot.x1) / 2;
        const cy = appearance === "semiCircular" ? plot.y0 + (plot.y1 - plot.y0) * 0.75 : (plot.y0 + plot.y1) / 2;
        const rOuter = Math.max(
          10,
          Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 8
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
          padAngle: 0.02
        });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        slices.forEach((s, i) => {
          const path = svgEl(doc, "path", {
            class: "canvas-chart__slice",
            d: s.path,
            fill: colors[i],
            "data-mark": seriesMark(i)
          });
          markDatapoint(path, {
            id: `pie-${i}`,
            label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`
          });
          g.appendChild(path);
        });
        svg.appendChild(g);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/SingleStackedBarChart.js
var SingleStackedBarChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "SingleStackedBarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { items, empty } = normalizeSlices(props);
    const colors = resolvePalette(
      items.length,
      /** @type {string[]} */
      props.palette
    );
    patchChartHost(el, doc, props, {
      empty,
      legendItems: items.map((it, i) => ({
        name: it.label,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: slicesTableModel(items, "Stacked bar data"),
      paint(svg, _size, plot) {
        const barY = (plot.y0 + plot.y1) / 2 - 14;
        const segs = stackedBarSegments(items, {
          x0: plot.x0,
          x1: plot.x1,
          y: barY,
          height: 28
        });
        const g = svgEl(doc, "g", { class: "canvas-chart__series" });
        g.appendChild(
          svgEl(doc, "rect", {
            class: "canvas-chart__stack-track",
            x: plot.x0,
            y: barY,
            width: Math.max(0, plot.x1 - plot.x0),
            height: 28,
            rx: 4
          })
        );
        for (const s of segs) {
          const rect = svgEl(doc, "rect", {
            class: "canvas-chart__stack-seg",
            x: s.x,
            y: s.y,
            width: Math.max(0, s.width),
            height: s.height,
            fill: colors[s.i % colors.length],
            "data-mark": seriesMark(s.i)
          });
          markDatapoint(rect, {
            id: `stack-${s.i}`,
            label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`
          });
          g.appendChild(rect);
        }
        svg.appendChild(g);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/RadarChart.js
var RadarChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "RadarChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const data = normalizeCartesian(props);
    const colors = resolvePalette(
      data.series.length,
      /** @type {string[]} */
      props.palette
    );
    const max = Math.max(...collectValues(data.series), 1);
    patchChartHost(el, doc, props, {
      empty: data.empty || data.labels.length < 3,
      emptyMessage: data.labels.length < 3 ? "Radar needs at least 3 categories" : "No chart data",
      legendItems: data.series.map((s, i) => ({
        name: s.name,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: cartesianTableModel(data.labels, data.series, "Radar chart data"),
      paint(svg, _size, plot) {
        const cx = (plot.x0 + plot.x1) / 2;
        const cy = (plot.y0 + plot.y1) / 2;
        const r = Math.max(12, Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 20);
        const axisVals = data.labels.map(() => max);
        const base = radarGeometry(axisVals, { cx, cy, r, max, levels: 4 });
        const grid = svgEl(doc, "g", { class: "canvas-chart__radar-grid" });
        for (const ring of base.rings) {
          grid.appendChild(
            svgEl(doc, "path", {
              class: "canvas-chart__radar-ring",
              d: ring,
              fill: "none"
            })
          );
        }
        for (const ax of base.axes) {
          grid.appendChild(
            svgEl(doc, "line", {
              class: "canvas-chart__radar-axis",
              x1: ax.x1,
              y1: ax.y1,
              x2: ax.x2,
              y2: ax.y2
            })
          );
          const label = data.labels[ax.i] || "";
          if (r >= 48 && label) {
            const lx = ax.x2 + (ax.x2 - cx) * 0.08;
            const ly = ax.y2 + (ax.y2 - cy) * 0.08;
            const t = svgEl(doc, "text", {
              class: "canvas-chart__tick-label",
              x: lx,
              y: ly,
              "text-anchor": "middle",
              "dominant-baseline": "middle"
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
            max
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
              "data-mark": mark
            })
          );
          for (const p of geo.points) {
            const c = svgEl(doc, "circle", {
              class: "canvas-chart__point",
              cx: p.x,
              cy: p.y,
              r: 3.5,
              fill: colors[si]
            });
            markDatapoint(c, {
              id: `radar-${si}-${p.i}`,
              label: `${s.name}, ${data.labels[p.i]}: ${p.value}`
            });
            g.appendChild(c);
          }
          svg.appendChild(g);
        });
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/RadialChart.js
var RadialChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "RadialChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { items, empty } = normalizeSlices(props);
    const colors = resolvePalette(
      items.length,
      /** @type {string[]} */
      props.palette
    );
    patchChartHost(el, doc, props, {
      empty,
      legendItems: items.map((it, i) => ({
        name: it.label,
        color: colors[i],
        mark: seriesMark(i)
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
              fill: "var(--canvas-surface-sunk, #eee)"
            })
          );
          const path = svgEl(doc, "path", {
            class: "canvas-chart__radial-bar",
            d: b.path,
            fill: colors[i],
            "data-mark": seriesMark(i)
          });
          markDatapoint(path, {
            id: `radial-${i}`,
            label: `${b.label}: ${b.value}`
          });
          g.appendChild(path);
        });
        svg.appendChild(g);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/ScatterChart.js
var ScatterChart = lifecycle2({
  mount(doc) {
    return mountChartHost(doc, "ScatterChart");
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const { datasets, empty } = normalizeScatter(props);
    const colors = resolvePalette(
      datasets.length,
      /** @type {string[]} */
      props.palette
    );
    patchChartHost(el, doc, props, {
      empty,
      legendItems: datasets.map((d, i) => ({
        name: d.name || `Series ${i + 1}`,
        color: colors[i],
        mark: seriesMark(i)
      })),
      tableModel: scatterTableModel(datasets, "Scatter chart data"),
      paint(svg, _size, plot) {
        const xs = datasets.flatMap((d) => d.points.map((p) => p.x));
        const ys = datasets.flatMap((d) => d.points.map((p) => p.y));
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
              x: xScale(v)
            })),
            yTicks: buildYTicks(yDomain, yScale),
            xLabel: props.xLabel ? String(props.xLabel) : void 0,
            yLabel: props.yLabel ? String(props.yLabel) : void 0,
            grid: props.grid !== false
          })
        );
        const pts = scatterPositions(datasets, {
          x0: plot.x0,
          x1: plot.x1,
          y0: plot.y0,
          y1: plot.y1,
          xDomain,
          yDomain
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
              "data-mark": seriesMark(p.si)
            });
          } else {
            node = svgEl(doc, "circle", {
              class: "canvas-chart__point",
              cx: p.x,
              cy: p.y,
              r: 4,
              fill: colors[p.si % colors.length],
              "data-mark": seriesMark(p.si)
            });
          }
          markDatapoint(node, {
            id: `scatter-${p.si}-${p.i}`,
            label: `${p.series || "Point"}: (${p.vx}, ${p.vy})`
          });
          g.appendChild(node);
        }
        svg.appendChild(g);
      }
    });
  },
  unmount(el) {
    unmountChartHost(el);
  }
});

// src/Browser/components/charts/dataLeaf.js
function dataLeaf(typeName) {
  return lifecycle({
    mount(doc) {
      const el = doc.createElement("span");
      el.setAttribute("data-canvas-component", typeName);
      el.setAttribute("hidden", "");
      return el;
    },
    patch(el, props = {}) {
      el.setAttribute("data-leaf", typeName);
      const label = props.category ?? props.label ?? props.name ?? "";
      if (label !== "") el.setAttribute("data-label", String(label));
    }
  });
}
var Series = dataLeaf("Series");
var Slice = dataLeaf("Slice");
var ScatterSeries = dataLeaf("ScatterSeries");
var Point = dataLeaf("Point");

// src/Browser/components/charts/registerCharts.js
var CHART_COMPONENTS = {
  BarChart,
  LineChart,
  AreaChart,
  HorizontalBarChart,
  PieChart,
  SingleStackedBarChart,
  RadarChart,
  RadialChart,
  ScatterChart,
  Series,
  Slice,
  ScatterSeries,
  Point
};
function registerCharts(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCharts: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHART_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var registerCharts_default = registerCharts;
export {
  AreaChart,
  BarChart,
  CHART_COMPONENTS,
  HorizontalBarChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialChart,
  ScatterChart,
  SingleStackedBarChart,
  registerCharts_default as default,
  registerCharts
};

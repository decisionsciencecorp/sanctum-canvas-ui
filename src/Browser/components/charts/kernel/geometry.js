/**
 * Deterministic chart geometry (pure functions — unit-tested).
 */

import { bandScale, linearScale } from "./scales.js";

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} angleRad
 * @returns {{ x: number, y: number }}
 */
export function polarToCartesian(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

/**
 * SVG arc path from startAngle→endAngle (radians, 0 = east, clockwise positive for SVG y-down).
 * @param {number} cx
 * @param {number} cy
 * @param {number} rOuter
 * @param {number} rInner
 * @param {number} startAngle
 * @param {number} endAngle
 * @returns {string}
 */
export function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  const o0 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o1 = polarToCartesian(cx, cy, rOuter, endAngle);
  if (rInner <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${o0.x} ${o0.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
      "Z",
    ].join(" ");
  }
  const i0 = polarToCartesian(cx, cy, rInner, endAngle);
  const i1 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
    `L ${i0.x} ${i0.y}`,
    `A ${rInner} ${rInner} 0 ${large} ${sweep ? 0 : 1} ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * @param {{ label: string, value: number }[]} slices
 * @param {{ cx: number, cy: number, rOuter: number, rInner?: number, startAngle?: number, endAngle?: number, padAngle?: number }} opts
 * @returns {{ label: string, value: number, percent: number, startAngle: number, endAngle: number, path: string, midAngle: number }[]}
 */
export function pieSlices(slices, opts) {
  const items = (Array.isArray(slices) ? slices : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0),
  }));
  const total = items.reduce((a, s) => a + s.value, 0);
  const start0 = opts.startAngle ?? -Math.PI / 2;
  const end0 = opts.endAngle ?? start0 + Math.PI * 2;
  const span = end0 - start0;
  const pad = opts.padAngle ?? 0;
  const rInner = opts.rInner ?? 0;
  /** @type {ReturnType<typeof pieSlices>} */
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
      path: donutArcPath(opts.cx, opts.cy, opts.rOuter, rInner, a0, a1),
    });
    angle = a1 + pad / 2;
  }
  return out;
}

/**
 * Vertical bar rectangles (grouped or stacked).
 * @param {{ labels: string[], series: { name: string, values: number[] }[], variant?: "grouped"|"stacked" }} data
 * @param {{ x0: number, x1: number, y0: number, y1: number, yDomain: [number, number] }} plot
 * @returns {{ series: string, label: string, value: number, x: number, y: number, width: number, height: number, i: number, si: number }[]}
 */
export function barRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const xScale = bandScale(labels, [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  /** @type {ReturnType<typeof barRects>} */
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
          si,
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
        si,
      });
    }
  }
  return out;
}

/**
 * Horizontal bar rectangles.
 * @param {{ labels: string[], series: { name: string, values: number[] }[], variant?: "grouped"|"stacked" }} data
 * @param {{ x0: number, x1: number, y0: number, y1: number, xDomain: [number, number] }} plot
 */
export function horizontalBarRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const yScale = bandScale(labels, [plot.y0, plot.y1]);
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  /** @type {{ series: string, label: string, value: number, x: number, y: number, width: number, height: number, i: number, si: number }[]} */
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
          si,
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
        si,
      });
    }
  }
  return out;
}

/**
 * Polyline / area path for one series over categories.
 * @param {number[]} values
 * @param {{ x0: number, x1: number, y0: number, y1: number, yDomain: [number, number], labels: string[], variant?: "linear"|"step"|"natural" }} plot
 * @returns {{ line: string, area: string, points: { x: number, y: number, value: number, i: number }[] }}
 */
export function seriesPath(values, plot) {
  const labels = plot.labels || [];
  const n = labels.length;
  const xScale = bandScale(labels, [plot.x0, plot.x1], { paddingInner: 0.1, paddingOuter: 0.05 });
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const bw = xScale.bandwidth;
  /** @type {{ x: number, y: number, value: number, i: number }[]} */
  const points = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values?.[i]) || 0;
    points.push({
      x: xScale(i) + bw / 2,
      y: yScale(v),
      value: v,
      i,
    });
  }
  const variant = plot.variant || "linear";
  let line = "";
  if (variant === "step") {
    line = points
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const mid = (prev.x + p.x) / 2;
        return `L ${mid} ${prev.y} L ${mid} ${p.y} L ${p.x} ${p.y}`;
      })
      .join(" ");
  } else if (variant === "natural" && points.length >= 2) {
    // Catmull-Rom → cubic bezier (deterministic)
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

/**
 * Radar polygon for one series.
 * @param {number[]} values
 * @param {{ cx: number, cy: number, r: number, levels?: number, max?: number }} opts
 * @returns {{ points: { x: number, y: number, value: number, i: number }[], polygon: string, axes: { x1: number, y1: number, x2: number, y2: number, i: number }[], rings: string[] }}
 */
export function radarGeometry(values, opts) {
  const vals = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
  const n = Math.max(vals.length, 3);
  const max = opts.max && opts.max > 0 ? opts.max : Math.max(...vals, 1);
  const start = -Math.PI / 2;
  /** @type {{ x: number, y: number, value: number, i: number }[]} */
  const points = [];
  /** @type {{ x1: number, y1: number, x2: number, y2: number, i: number }[]} */
  const axes = [];
  for (let i = 0; i < n; i++) {
    const angle = start + (i * 2 * Math.PI) / n;
    const tip = polarToCartesian(opts.cx, opts.cy, opts.r, angle);
    axes.push({ x1: opts.cx, y1: opts.cy, x2: tip.x, y2: tip.y, i });
    const v = vals[i] ?? 0;
    const rr = (Math.max(0, v) / max) * opts.r;
    const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
    points.push({ ...p, value: v, i });
  }
  const polygon = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
    : "";
  const levels = opts.levels ?? 4;
  /** @type {string[]} */
  const rings = [];
  for (let L = 1; L <= levels; L++) {
    const rr = (opts.r * L) / levels;
    /** @type {string[]} */
    const ringPts = [];
    for (let i = 0; i < n; i++) {
      const angle = start + (i * 2 * Math.PI) / n;
      const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
      ringPts.push(`${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
    }
    rings.push(ringPts.join(" ") + " Z");
  }
  return { points, polygon, axes, rings };
}

/**
 * Radial bar arcs (one per category).
 * @param {{ label: string, value: number }[]} items
 * @param {{ cx: number, cy: number, rOuter: number, rInner: number, startAngle?: number, endAngle?: number }} opts
 */
export function radialBars(items, opts) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0),
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
      percent: (row.value / max) * 100,
      i,
      rInner: r1,
      rOuter: r0,
      startAngle: start0,
      endAngle: a1,
      path: donutArcPath(opts.cx, opts.cy, r0, r1, start0, a1),
    };
  });
}

/**
 * Scatter point positions.
 * @param {{ name: string, points: { x: number, y: number, z?: number }[] }[]} datasets
 * @param {{ x0: number, x1: number, y0: number, y1: number, xDomain: [number, number], yDomain: [number, number] }} plot
 */
export function scatterPositions(datasets, plot) {
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  /** @type {{ series: string, x: number, y: number, vx: number, vy: number, z?: number, i: number, si: number }[]} */
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
        z: pt.z != null ? Number(pt.z) : undefined,
        i,
        si,
      });
    });
  });
  return out;
}

/**
 * Single stacked bar segments (percent of total).
 * @param {{ label: string, value: number }[]} items
 * @param {{ x0: number, x1: number, y: number, height: number }} plot
 */
export function stackedBarSegments(items, plot) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0),
  }));
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  const width = plot.x1 - plot.x0;
  let x = plot.x0;
  return rows.map((row, i) => {
    const w = (row.value / total) * width;
    const seg = {
      ...row,
      percent: (row.value / total) * 100,
      x,
      y: plot.y,
      width: w,
      height: plot.height,
      i,
    };
    x += w;
    return seg;
  });
}

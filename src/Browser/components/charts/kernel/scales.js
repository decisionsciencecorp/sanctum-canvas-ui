/**
 * Deterministic scales + tick helpers (no d3).
 */

/**
 * @param {number} domainMin
 * @param {number} domainMax
 * @param {[number, number]} range
 * @returns {(v: number) => number}
 */
export function linearScale(domainMin, domainMax, range) {
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
    return r0 + ((n - d0) / span) * (r1 - r0);
  };
}

/**
 * Band scale for discrete categories.
 * @param {string[]} domain
 * @param {[number, number]} range
 * @param {{ padding?: number, paddingInner?: number, paddingOuter?: number }} [opts]
 * @returns {{ (i: number): number, bandwidth: number, step: number }}
 */
export function bandScale(domain, range, opts = {}) {
  const labels = Array.isArray(domain) ? domain : [];
  const [r0, r1] = range;
  const n = Math.max(labels.length, 1);
  const padInner = opts.paddingInner ?? opts.padding ?? 0.2;
  const padOuter = opts.paddingOuter ?? opts.padding ?? 0.1;
  const span = r1 - r0;
  const step = span / (n - padInner + 2 * padOuter);
  const bandwidth = Math.max(0, step * (1 - padInner));
  const start = r0 + padOuter * step;

  /** @param {number} i */
  function scale(i) {
    const idx = Number(i);
    if (!Number.isFinite(idx) || idx < 0) return start;
    return start + idx * step;
  }
  scale.bandwidth = bandwidth;
  scale.step = step;
  return scale;
}

/**
 * Expand domain to include 0 when all values share a sign; pad slightly.
 * @param {number[]} values
 * @param {{ includeZero?: boolean, pad?: number }} [opts]
 * @returns {[number, number]}
 */
export function niceDomain(values, opts = {}) {
  const nums = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return [0, 1];
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (opts.includeZero !== false) {
    if (min > 0) min = 0;
    if (max < 0) max = 0;
  }
  if (min === max) {
    if (min === 0) return [0, 1];
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (opts.pad ?? 0.05) * (max - min);
  return [min - (opts.includeZero === false ? pad : 0), max + pad];
}

/**
 * Approximate "nice" ticks for a continuous domain.
 * @param {number} min
 * @param {number} max
 * @param {number} [count=5]
 * @returns {number[]}
 */
export function niceTicks(min, max, count = 5) {
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
  /** @type {number[]} */
  const ticks = [];
  for (let v = start; v <= d1 + niceStep * 1e-9; v += niceStep) {
    const rounded = Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12));
    ticks.push(rounded);
    if (ticks.length > 20) break;
  }
  if (!ticks.length) ticks.push(d0, d1);
  return ticks;
}

/**
 * Format tick label compactly.
 * @param {number} v
 * @returns {string}
 */
export function formatTick(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(4)));
}

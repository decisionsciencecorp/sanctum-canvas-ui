/**
 * Normalize OpenUI chart props (labels/series, labels/values, datasets).
 */

/**
 * @param {unknown} node
 * @returns {Record<string, unknown> | null}
 */
export function unwrap(node) {
  if (node == null) return null;
  if (typeof node !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (node);
  if (o.type === "element" && o.props && typeof o.props === "object") {
    return /** @type {Record<string, unknown>} */ (o.props);
  }
  return o;
}

/**
 * @param {unknown} v
 * @returns {unknown[]}
 */
export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
export function normalizeLabels(labels) {
  return asArray(labels).map((l) => String(l ?? ""));
}

/**
 * @param {unknown} series
 * @returns {{ name: string, values: number[] }[]}
 */
export function normalizeSeries(series) {
  return asArray(series)
    .map((item) => {
      const p = unwrap(item) || {};
      const name = String(p.category ?? p.name ?? "");
      const values = asArray(p.values).map((v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      });
      return { name, values };
    })
    .filter((s) => s.name !== "" || s.values.length);
}

/**
 * Cartesian 2D chart data.
 * @param {Record<string, unknown>} props
 * @returns {{ labels: string[], series: { name: string, values: number[] }[], empty: boolean }}
 */
export function normalizeCartesian(props) {
  const labels = normalizeLabels(props.labels);
  let series = normalizeSeries(props.series);

  // Tabular: labels = column names, series = rows of cells
  const rows = asArray(props.series);
  if (rows.length && Array.isArray(rows[0])) {
    const seriesNames = labels.slice(1);
    const cats = rows.map((row) => String(/** @type {unknown[]} */ (row)[0] ?? ""));
    series = seriesNames.map((name, si) => ({
      name,
      values: rows.map((row) => {
        const n = Number(/** @type {unknown[]} */ (row)[si + 1]);
        return Number.isFinite(n) ? n : 0;
      }),
    }));
    return {
      labels: cats,
      series,
      empty: !cats.length || !series.length,
    };
  }

  return {
    labels,
    series,
    empty: !labels.length || !series.length,
  };
}

/**
 * 1D slice data (pie / radial / single stacked).
 * @param {Record<string, unknown>} props
 * @returns {{ items: { label: string, value: number }[], empty: boolean }}
 */
export function normalizeSlices(props) {
  const labels = normalizeLabels(props.labels);
  const values = asArray(props.values).map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });

  if (labels.length && values.length) {
    const n = Math.min(labels.length, values.length);
    const items = Array.from({ length: n }, (_, i) => ({
      label: labels[i],
      value: values[i],
    }));
    return { items, empty: !items.length || items.every((x) => x.value === 0) };
  }

  // Legacy Slice[] in labels slot
  const items = asArray(props.labels)
    .map((node) => {
      const p = unwrap(node);
      if (!p || p.category == null) return null;
      const value = Number(p.value);
      return {
        label: String(p.category),
        value: Number.isFinite(value) ? value : 0,
      };
    })
    .filter(Boolean);
  return {
    items: /** @type {{ label: string, value: number }[]} */ (items),
    empty: !items.length,
  };
}

/**
 * Scatter datasets.
 * @param {Record<string, unknown>} props
 * @returns {{ datasets: { name: string, points: { x: number, y: number, z?: number }[] }[], empty: boolean }}
 */
export function normalizeScatter(props) {
  const datasets = asArray(props.datasets)
    .map((ds) => {
      const p = unwrap(ds) || {};
      const name = String(p.name ?? "");
      const points = asArray(p.points)
        .map((pt) => {
          const q = unwrap(pt) || {};
          const x = Number(q.x);
          const y = Number(q.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const z = q.z != null ? Number(q.z) : undefined;
          return Number.isFinite(z) ? { x, y, z } : { x, y };
        })
        .filter(Boolean);
      return {
        name,
        points: /** @type {{ x: number, y: number, z?: number }[]} */ (points),
      };
    })
    .filter((d) => d.points.length);
  return { datasets, empty: !datasets.length };
}

/**
 * Flatten all numeric values from cartesian series.
 * @param {{ values: number[] }[]} series
 * @param {"grouped"|"stacked"} [variant]
 * @returns {number[]}
 */
export function collectValues(series, variant = "grouped") {
  if (variant === "stacked") {
    const len = Math.max(0, ...series.map((s) => s.values.length));
    /** @type {number[]} */
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

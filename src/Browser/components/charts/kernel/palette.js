/**
 * Chart palette from --canvas-chart-* tokens (with solid fallbacks).
 */

/** Fallback hex when CSS vars are unavailable (tests / print). */
export const CHART_PALETTE_FALLBACKS = Object.freeze([
  "#0D47A1",
  "#208B3A",
  "#B12A90",
  "#E16462",
  "#FCA636",
  "#1976D2",
  "#7014CC",
  "#CB253E",
]);

/**
 * Pattern marks for non-color cues (stroke-dash / hatch keys).
 */
export const SERIES_MARKS = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);

/**
 * @param {number} count
 * @param {string[]} [custom]
 * @returns {string[]}
 */
export function resolvePalette(count, custom) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (Array.isArray(custom) && custom.length) {
    return Array.from({ length: n }, (_, i) => String(custom[i % custom.length]));
  }
  return Array.from({ length: n }, (_, i) => {
    const idx = (i % 8) + 1;
    return `var(--canvas-chart-${idx}, ${CHART_PALETTE_FALLBACKS[i % CHART_PALETTE_FALLBACKS.length]})`;
  });
}

/**
 * @param {number} seriesIndex
 * @returns {string}
 */
export function seriesMark(seriesIndex) {
  return SERIES_MARKS[seriesIndex % SERIES_MARKS.length];
}

/**
 * Stroke-dasharray for non-color series discrimination.
 * @param {string} mark
 * @returns {string | null}
 */
export function dashForMark(mark) {
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

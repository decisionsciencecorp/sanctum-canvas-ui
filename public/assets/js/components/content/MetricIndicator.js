/**
 * MetricIndicator — headline metric with optional previous value + trend.
 * Variants: with-strikethrough | inline (aliases MetricIndicatorWithStrikethrough / MetricIndicatorInline).
 */

import {
  applySurfaceStatus,
  applyVariantCue,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const VARIANTS = new Set(["with-strikethrough", "inline"]);

function resolveVariant(props) {
  const raw = asText(props.variant);
  if (VARIANTS.has(raw)) return raw;
  if (props.previousValue != null && asText(props.previousValue) !== "") {
    return "with-strikethrough";
  }
  return "inline";
}

function trendDirection(trend) {
  if (!trend || typeof trend !== "object") return null;
  const d = asText(trend.direction);
  return d === "up" || d === "down" ? d : null;
}

export const MetricIndicator = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "MetricIndicator");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = resolveVariant(props);
    const subtext = asText(props.subtext);
    let cls = `canvas-metric-indicator canvas-metric-indicator--${variant}`;
    if (subtext) cls += " canvas-metric-indicator--has-subtext";
    setClass(el, cls);
    el.setAttribute("data-variant", variant);

    clearChildren(el);
    const { status } = applySurfaceStatus(el, doc, props, {
      emptyMessage: "No metric",
    });
    if (status !== "ready") return;

    const value = asText(props.value);
    if (!value) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: "No metric",
      });
      return;
    }

    const row = doc.createElement("div");
    row.setAttribute("class", "canvas-metric-indicator__row");

    const main = doc.createElement("div");
    main.setAttribute("class", "canvas-metric-indicator__main-value");
    main.textContent = value;
    row.appendChild(main);

    const previousValue = asText(props.previousValue);
    if (variant === "with-strikethrough" && previousValue) {
      const prev = doc.createElement("div");
      prev.setAttribute("class", "canvas-metric-indicator__previous-value");
      prev.textContent = previousValue;
      row.appendChild(prev);
    }

    const dir = trendDirection(props.trend);
    if (dir && props.trend) {
      const trendEl = doc.createElement("div");
      const tone = dir === "up" ? "up" : "down";
      trendEl.setAttribute(
        "class",
        `canvas-metric-indicator__trend canvas-metric-indicator__trend--${tone}`,
      );
      trendEl.setAttribute("data-trend", dir);
      // Non-color cue: explicit direction word + signed percent
      const pct = Number(props.trend.value);
      const pctText = Number.isFinite(pct) ? `${pct}%` : asText(props.trend.value);
      const word = dir === "up" ? "up" : "down";
      const sign = dir === "up" ? "+" : "-";
      trendEl.setAttribute("aria-label", `Trend ${word} ${pctText}`);
      trendEl.textContent = `${sign}${pctText}`;
      applyVariantCue(trendEl, tone, { up: "Trend up", down: "Trend down" });
      row.appendChild(trendEl);
    }

    if (variant === "inline" && subtext) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-metric-indicator__subtext");
      s.textContent = subtext;
      row.appendChild(s);
    }

    el.appendChild(row);

    if (variant !== "inline" && subtext) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-metric-indicator__subtext");
      s.textContent = subtext;
      el.appendChild(s);
    }
  },
});

/** Alias lifecycle matching library MetricIndicatorWithStrikethrough. */
export const MetricIndicatorWithStrikethrough = {
  create(props = {}, ctx = {}) {
    return MetricIndicator.create({ ...props, variant: "with-strikethrough" }, ctx);
  },
  update(el, props = {}, ctx = {}) {
    return MetricIndicator.update(el, { ...props, variant: "with-strikethrough" }, ctx);
  },
  destroy(el, ctx = {}) {
    return MetricIndicator.destroy(el, ctx);
  },
};

/** Alias lifecycle matching library MetricIndicatorInline. */
export const MetricIndicatorInline = {
  create(props = {}, ctx = {}) {
    return MetricIndicator.create({ ...props, variant: "inline" }, ctx);
  },
  update(el, props = {}, ctx = {}) {
    return MetricIndicator.update(el, { ...props, variant: "inline" }, ctx);
  },
  destroy(el, ctx = {}) {
    return MetricIndicator.destroy(el, ctx);
  },
};

export default MetricIndicator;

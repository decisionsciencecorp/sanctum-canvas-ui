/**
 * Shared chart frame — host chrome, measure, legend, table, tooltip, status.
 */

import {
  applySurfaceStatus,
  chartRuntime,
  clearChildren,
  prefersReducedMotion,
  setClass,
} from "./shared.js";
import { observeSize, resolveChartSize } from "./measure.js";
import { createTooltip, attachDatapointKeyboard } from "./datapoints.js";
import { renderLegend } from "./legend.js";
import { renderDataTable } from "./dataTable.js";
import { svgEl } from "./svg.js";

/**
 * @param {Document} doc
 * @param {string} typeName
 * @returns {HTMLElement}
 */
export function mountChartHost(doc, typeName) {
  const el = doc.createElement("div");
  el.setAttribute("data-canvas-component", typeName);
  el.setAttribute("class", `canvas-chart canvas-chart--${typeName}`);
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", typeName);
  return el;
}

/**
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>} props
 * @param {{
 *   empty: boolean,
 *   emptyMessage?: string,
 *   legendItems?: { name: string, color: string, mark?: string }[],
 *   tableModel?: { caption?: string, columns: string[], rows: (string|number)[][] },
 *   paint: (svg: Element, size: { width: number, height: number }, plot: {
 *     x0: number, x1: number, y0: number, y1: number, width: number, height: number
 *   }) => void,
 * }} spec
 */
export function patchChartHost(el, doc, props, spec) {
  const prev = chartRuntime.get(el);
  prev?.disconnect?.();
  prev?.destroyKeyboard?.();

  const statusProps = { ...props };
  if (spec.empty && resolveReady(props)) {
    statusProps.status = "empty";
  }
  setClass(
    el,
    `canvas-chart canvas-chart--${el.getAttribute("data-canvas-component")} ${
      prefersReducedMotion(doc) ? "canvas-chart--reduced-motion" : ""
    }`.trim(),
  );

  clearChildren(el);
  const { status } = applySurfaceStatus(el, doc, statusProps, {
    emptyMessage: spec.emptyMessage || "No chart data",
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
    "aria-hidden": "true",
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
    // Default plot height when host has no intrinsic height
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
      left: props.yLabel ? 48 : 40,
    };
    const plot = {
      x0: margin.left,
      x1: Math.max(margin.left + 10, resolved.width - margin.right),
      y0: margin.top,
      y1: Math.max(margin.top + 10, resolved.height - margin.bottom),
      width: resolved.width,
      height: resolved.height,
    };
    spec.paint(svg, resolved, plot);
  };

  const obs = observeSize(plotHost, paint, {
    width: Number(props.width) || 320,
    height: Number(props.height) || 240,
  });

  chartRuntime.set(el, {
    disconnect: () => obs.disconnect(),
    destroyKeyboard: () => keyboard.destroy(),
  });
}

/**
 * @param {Record<string, unknown>} props
 */
function resolveReady(props) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "error") return false;
  if (props.loading === true) return false;
  if (props.error != null && props.error !== false) return false;
  return true;
}

/**
 * @param {Element} el
 */
export function unmountChartHost(el) {
  const rt = chartRuntime.get(el);
  rt?.disconnect?.();
  rt?.destroyKeyboard?.();
  chartRuntime.delete(el);
}

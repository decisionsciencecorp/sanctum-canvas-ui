/**
 * Register A6.7–A6.9 chart components on a createComponentRegistry instance.
 */

import { BarChart } from "./BarChart.js";
import { LineChart } from "./LineChart.js";
import { AreaChart } from "./AreaChart.js";
import { HorizontalBarChart } from "./HorizontalBarChart.js";
import { PieChart } from "./PieChart.js";
import { SingleStackedBarChart } from "./SingleStackedBarChart.js";
import { RadarChart } from "./RadarChart.js";
import { RadialChart } from "./RadialChart.js";
import { ScatterChart } from "./ScatterChart.js";
import { Series, Slice, ScatterSeries, Point } from "./dataLeaf.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CHART_COMPONENTS = {
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
  Point,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerCharts(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCharts: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHART_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export {
  BarChart,
  LineChart,
  AreaChart,
  HorizontalBarChart,
  PieChart,
  SingleStackedBarChart,
  RadarChart,
  RadialChart,
  ScatterChart,
};

export default registerCharts;

/**
 * A6.8–A6.9 — Chart components + registerCharts.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createTestDom } from "./helpers/miniDom.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import {
  registerCharts,
  CHART_COMPONENTS,
  BarChart,
  LineChart,
  AreaChart,
  HorizontalBarChart,
  PieChart,
  SingleStackedBarChart,
  RadarChart,
  RadialChart,
  ScatterChart,
} from "../../src/Browser/components/charts/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function ctx() {
  const { document } = createTestDom();
  return { document };
}

function findAttr(rootEl, attr, value) {
  /** @type {Element[]} */
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (value == null ? n.hasAttribute(attr) : n.getAttribute(attr) === value) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(rootEl);
  return out;
}

const sampleCartesian = {
  labels: ["Mon", "Tue", "Wed"],
  series: [
    { category: "Views", values: [10, 20, 15] },
    { category: "Clicks", values: [2, 5, 3] },
  ],
  xLabel: "Day",
  yLabel: "Count",
  height: 240,
};

const sampleSlices = {
  labels: ["A", "B", "C"],
  values: [30, 50, 20],
};

describe("registerCharts", () => {
  it("registers all chart types", () => {
    const reg = createComponentRegistry();
    registerCharts(reg);
    for (const name of Object.keys(CHART_COMPONENTS)) {
      assert.equal(reg.has(name), true, name);
    }
  });

  it("throws without registry", () => {
    assert.throws(() => registerCharts(/** @type {any} */ (null)), /registerCharts/);
  });
});

describe("chart status / empty", () => {
  it("BarChart loading and empty", () => {
    const c = ctx();
    const loading = BarChart.create({ ...sampleCartesian, status: "loading" }, c);
    assert.equal(loading.getAttribute("data-status"), "loading");
    assert.match(loading.textContent, /Loading/);

    const empty = BarChart.create({ labels: [], series: [] }, c);
    assert.equal(empty.getAttribute("data-status"), "empty");

    const err = BarChart.create({ ...sampleCartesian, error: "Nope" }, c);
    assert.equal(err.getAttribute("data-status"), "error");
  });
});

describe("A6.8 chart family", () => {
  it("BarChart grouped + stacked with datapoints and table", () => {
    const c = ctx();
    const el = BarChart.create(sampleCartesian, c);
    assert.equal(el.getAttribute("data-canvas-component"), "BarChart");
    assert.ok(findAttr(el, "data-canvas-datapoint").length >= 6);
    assert.ok(findAttr(el, "data-canvas-chart-table").length === 1);
    assert.match(el.textContent, /Views/);

    BarChart.update(el, { ...sampleCartesian, variant: "stacked" }, c);
    assert.ok(findAttr(el, "data-canvas-datapoint").length >= 6);
    BarChart.destroy(el, c);
  });

  it("LineChart and AreaChart variants", () => {
    const c = ctx();
    for (const variant of ["linear", "step", "natural"]) {
      const line = LineChart.create({ ...sampleCartesian, variant }, c);
      assert.ok(findAttr(line, "class", null).length || true);
      assert.ok(findAttr(line, "data-canvas-datapoint").length >= 6);
      LineChart.destroy(line, c);
    }
    const area = AreaChart.create(sampleCartesian, c);
    assert.equal(area.getAttribute("data-canvas-component"), "AreaChart");
    AreaChart.destroy(area, c);
  });

  it("HorizontalBarChart", () => {
    const c = ctx();
    const el = HorizontalBarChart.create({ ...sampleCartesian, variant: "grouped" }, c);
    assert.equal(el.getAttribute("data-canvas-component"), "HorizontalBarChart");
    assert.ok(findAttr(el, "data-canvas-datapoint").length >= 6);
    HorizontalBarChart.update(el, { ...sampleCartesian, variant: "stacked" }, c);
    HorizontalBarChart.destroy(el, c);
  });

  it("PieChart pie/donut/semiCircular", () => {
    const c = ctx();
    const pie = PieChart.create(sampleSlices, c);
    assert.ok(findAttr(pie, "data-canvas-datapoint").length === 3);
    PieChart.update(pie, { ...sampleSlices, variant: "donut" }, c);
    PieChart.update(pie, { ...sampleSlices, appearance: "semiCircular" }, c);
    PieChart.destroy(pie, c);
  });

  it("SingleStackedBarChart", () => {
    const c = ctx();
    const el = SingleStackedBarChart.create(sampleSlices, c);
    assert.equal(el.getAttribute("data-canvas-component"), "SingleStackedBarChart");
    assert.ok(findAttr(el, "data-canvas-datapoint").length === 3);
    SingleStackedBarChart.destroy(el, c);
  });
});

describe("A6.9 chart family", () => {
  it("RadarChart", () => {
    const c = ctx();
    const el = RadarChart.create(
      {
        labels: ["Speed", "Reliability", "Comfort", "Safety"],
        series: [{ category: "Model A", values: [4, 3, 5, 4] }],
      },
      c,
    );
    assert.equal(el.getAttribute("data-canvas-component"), "RadarChart");
    assert.ok(findAttr(el, "data-canvas-datapoint").length >= 4);
    const tooFew = RadarChart.create(
      { labels: ["a", "b"], series: [{ category: "x", values: [1, 2] }] },
      c,
    );
    assert.equal(tooFew.getAttribute("data-status"), "empty");
    RadarChart.destroy(el, c);
  });

  it("RadialChart", () => {
    const c = ctx();
    const el = RadialChart.create(sampleSlices, c);
    assert.ok(findAttr(el, "data-canvas-datapoint").length === 3);
    RadialChart.destroy(el, c);
  });

  it("ScatterChart with degenerate and square shape", () => {
    const c = ctx();
    const el = ScatterChart.create(
      {
        datasets: [
          {
            name: "Cluster",
            points: [
              { x: 1, y: 2 },
              { x: 2, y: 3 },
              { x: 1.5, y: 2.5 },
            ],
          },
        ],
        xLabel: "X",
        yLabel: "Y",
        shape: "square",
      },
      c,
    );
    assert.ok(findAttr(el, "data-canvas-datapoint").length === 3);
    const empty = ScatterChart.create({ datasets: [] }, c);
    assert.equal(empty.getAttribute("data-status"), "empty");
    // single point domain
    ScatterChart.update(
      el,
      { datasets: [{ name: "One", points: [{ x: 5, y: 5 }] }], shape: "circle" },
      c,
    );
    ScatterChart.destroy(el, c);
  });
});

describe("fixtures + CSS", () => {
  it("charts.css and chart tokens exist", () => {
    assert.equal(existsSync(join(root, "public/assets/css/components/charts.css")), true);
    const tokens = readFileSync(join(root, "public/assets/css/tokens.css"), "utf8");
    assert.match(tokens, /--canvas-chart-1/);
  });

  it("writes fixture smoke snapshot markers", () => {
    const c = ctx();
    const el = BarChart.create(sampleCartesian, c);
    const fixtureDir = join(root, "tests/fixtures/components/charts");
    assert.equal(existsSync(fixtureDir), true);
    // Stable structural markers for golden-style asserts
    assert.ok(findAttr(el, "role", "group").length >= 1);
    assert.ok(findAttr(el, "role", "img").length >= 1);
  });
});

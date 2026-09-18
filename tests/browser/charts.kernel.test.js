/**
 * A6.7 — Chart kernel: deterministic geometry, scales, normalize, palette, measure.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  linearScale,
  bandScale,
  niceDomain,
  niceTicks,
  formatTick,
  polarToCartesian,
  donutArcPath,
  pieSlices,
  barRects,
  horizontalBarRects,
  seriesPath,
  radarGeometry,
  radialBars,
  scatterPositions,
  stackedBarSegments,
  resolvePalette,
  seriesMark,
  dashForMark,
  CHART_PALETTE_FALLBACKS,
  observeSize,
  resolveChartSize,
  normalizeCartesian,
  normalizeSlices,
  normalizeScatter,
  collectValues,
  unwrap,
  asArray,
  cartesianTableModel,
  slicesTableModel,
  scatterTableModel,
  renderLegend,
  renderDataTable,
  markDatapoint,
  attachDatapointKeyboard,
  createTooltip,
  collectDatapoints,
  svgEl,
  requireDocument,
  resolveStatus,
  applySurfaceStatus,
  prefersReducedMotion,
  SURFACE_STATUS,
} from "../../src/Browser/components/charts/kernel/index.js";
import { createTestDom } from "./helpers/miniDom.js";

describe("scales", () => {
  it("linearScale maps domain to range", () => {
    const s = linearScale(0, 100, [0, 200]);
    assert.equal(s(0), 0);
    assert.equal(s(50), 100);
    assert.equal(s(100), 200);
  });

  it("linearScale handles zero-span and non-finite", () => {
    const s = linearScale(5, 5, [10, 20]);
    assert.equal(s(5), 15);
    // zero-span scale returns midpoint for any input (incl. NaN)
    assert.equal(s(NaN), 15);
    const s2 = linearScale(0, 10, [0, 100]);
    assert.equal(s2(NaN), 0);
  });

  it("bandScale exposes bandwidth and positions", () => {
    const s = bandScale(["a", "b", "c"], [0, 300], { paddingInner: 0.2, paddingOuter: 0.1 });
    assert.ok(s.bandwidth > 0);
    assert.ok(s(1) > s(0));
  });

  it("niceDomain pads and includes zero", () => {
    assert.deepEqual(niceDomain([]), [0, 1]);
    assert.equal(niceDomain([3, 7])[0], 0);
    const allNeg = niceDomain([-5, -1]);
    assert.ok(allNeg[1] >= 0);
    assert.ok(allNeg[0] < 0);
    const flat = niceDomain([0, 0]);
    assert.deepEqual(flat, [0, 1]);
  });

  it("niceTicks and formatTick are deterministic", () => {
    const ticks = niceTicks(0, 100, 5);
    assert.ok(ticks.length >= 2);
    assert.equal(formatTick(1500), "1.5k");
    assert.equal(formatTick(2_000_000), "2.0M");
    assert.equal(formatTick(4), "4");
    assert.equal(formatTick(NaN), "");
  });
});

describe("geometry", () => {
  it("polarToCartesian and donutArcPath", () => {
    const p = polarToCartesian(0, 0, 10, 0);
    assert.equal(p.x, 10);
    assert.ok(Math.abs(p.y) < 1e-10);
    const pie = donutArcPath(50, 50, 40, 0, 0, Math.PI / 2);
    assert.match(pie, /^M /);
    const donut = donutArcPath(50, 50, 40, 20, 0, Math.PI);
    assert.match(donut, /A 40/);
  });

  it("pieSlices percentages sum ~100", () => {
    const slices = pieSlices(
      [
        { label: "A", value: 1 },
        { label: "B", value: 1 },
        { label: "C", value: 2 },
      ],
      { cx: 50, cy: 50, rOuter: 40, rInner: 10 },
    );
    assert.equal(slices.length, 3);
    const sum = slices.reduce((a, s) => a + s.percent, 0);
    assert.ok(Math.abs(sum - 100) < 1e-6);
    assert.equal(pieSlices([], { cx: 0, cy: 0, rOuter: 10 }).length, 0);
  });

  it("barRects grouped and stacked", () => {
    const data = {
      labels: ["a", "b"],
      series: [
        { name: "s1", values: [10, 20] },
        { name: "s2", values: [5, 15] },
      ],
      variant: "grouped",
    };
    const plot = { x0: 0, x1: 200, y0: 0, y1: 100, yDomain: /** @type {[number,number]} */ ([0, 40]) };
    const g = barRects(data, plot);
    assert.equal(g.length, 4);
    const st = barRects({ ...data, variant: "stacked" }, plot);
    assert.equal(st.length, 4);
    assert.ok(st.every((r) => r.width > 0));
  });

  it("horizontalBarRects grouped and stacked", () => {
    const data = {
      labels: ["a", "b"],
      series: [{ name: "s1", values: [3, -2] }],
      variant: "grouped",
    };
    const plot = { x0: 0, x1: 100, y0: 0, y1: 80, xDomain: /** @type {[number,number]} */ ([-5, 5]) };
    assert.equal(horizontalBarRects(data, plot).length, 2);
    assert.equal(horizontalBarRects({ ...data, variant: "stacked" }, plot).length, 2);
  });

  it("seriesPath linear / step / natural", () => {
    const plot = {
      x0: 0,
      x1: 100,
      y0: 0,
      y1: 50,
      yDomain: /** @type {[number,number]} */ ([0, 10]),
      labels: ["a", "b", "c"],
      variant: "linear",
    };
    const lin = seriesPath([1, 5, 3], plot);
    assert.match(lin.line, /^M /);
    assert.match(lin.area, /Z$/);
    assert.equal(lin.points.length, 3);
    const step = seriesPath([1, 5, 3], { ...plot, variant: "step" });
    assert.match(step.line, /L /);
    const nat = seriesPath([1, 5, 3, 4], { ...plot, labels: ["a", "b", "c", "d"], variant: "natural" });
    assert.match(nat.line, /C /);
  });

  it("radarGeometry / radialBars / scatter / stacked", () => {
    const radar = radarGeometry([1, 2, 3, 4], { cx: 50, cy: 50, r: 40, max: 4 });
    assert.equal(radar.points.length, 4);
    assert.match(radar.polygon, /Z$/);
    assert.equal(radar.rings.length, 4);

    const rad = radialBars(
      [
        { label: "a", value: 2 },
        { label: "b", value: 4 },
      ],
      { cx: 50, cy: 50, rOuter: 40, rInner: 10 },
    );
    assert.equal(rad.length, 2);
    assert.ok(rad[1].percent > rad[0].percent);

    const sc = scatterPositions(
      [{ name: "A", points: [{ x: 1, y: 2 }, { x: NaN, y: 1 }] }],
      {
        x0: 0,
        x1: 100,
        y0: 0,
        y1: 50,
        xDomain: [0, 10],
        yDomain: [0, 10],
      },
    );
    assert.equal(sc.length, 1);

    const segs = stackedBarSegments(
      [
        { label: "a", value: 25 },
        { label: "b", value: 75 },
      ],
      { x0: 0, x1: 100, y: 10, height: 8 },
    );
    assert.equal(segs.length, 2);
    assert.ok(Math.abs(segs[0].width + segs[1].width - 100) < 1e-9);
  });
});

describe("normalize + palette + table", () => {
  it("normalizeCartesian handles Series elements and tabular rows", () => {
    const a = normalizeCartesian({
      labels: ["Mon", "Tue"],
      series: [
        { type: "element", props: { category: "Views", values: [1, 2] } },
        { category: "Users", values: [3, 4] },
      ],
    });
    assert.equal(a.series.length, 2);
    assert.equal(a.empty, false);

    const tab = normalizeCartesian({
      labels: ["day", "views", "users"],
      series: [
        ["Mon", 10, 5],
        ["Tue", 20, 8],
      ],
    });
    assert.deepEqual(tab.labels, ["Mon", "Tue"]);
    assert.equal(tab.series[0].name, "views");
  });

  it("normalizeSlices and scatter", () => {
    const s = normalizeSlices({ labels: ["a", "b"], values: [1, 2] });
    assert.equal(s.items.length, 2);
    const legacy = normalizeSlices({
      labels: [{ type: "element", props: { category: "x", value: 9 } }],
    });
    assert.equal(legacy.items[0].value, 9);

    const sc = normalizeScatter({
      datasets: [
        {
          type: "element",
          props: {
            name: "A",
            points: [{ x: 1, y: 2, z: 3 }, { type: "element", props: { x: 4, y: 5 } }],
          },
        },
      ],
    });
    assert.equal(sc.datasets[0].points.length, 2);
  });

  it("collectValues stacked", () => {
    const vals = collectValues(
      [
        { name: "a", values: [1, 2] },
        { name: "b", values: [3, 4] },
      ],
      "stacked",
    );
    assert.ok(vals.includes(4));
  });

  it("palette + marks", () => {
    const p = resolvePalette(3);
    assert.match(p[0], /--canvas-chart-1/);
    assert.deepEqual(resolvePalette(2, ["#fff", "#000"]), ["#fff", "#000"]);
    assert.equal(seriesMark(0), "solid");
    assert.equal(dashForMark("dashed"), "6 4");
    assert.equal(dashForMark("solid"), null);
    assert.ok(CHART_PALETTE_FALLBACKS.length >= 8);
  });

  it("table models", () => {
    const c = cartesianTableModel(["a"], [{ name: "s", values: [1] }]);
    assert.equal(c.rows[0][1], 1);
    assert.equal(slicesTableModel([{ label: "a", value: 2 }]).rows[0][0], "a");
    assert.equal(
      scatterTableModel([{ name: "A", points: [{ x: 1, y: 2 }] }]).rows.length,
      1,
    );
  });

  it("unwrap / asArray edge cases", () => {
    assert.equal(unwrap(null), null);
    assert.equal(unwrap(5), null);
    assert.deepEqual(asArray(null), []);
    assert.deepEqual(asArray(1), [1]);
  });
});

describe("measure + a11y helpers", () => {
  it("observeSize stub without ResizeObserver", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    el.clientWidth = 400;
    el.clientHeight = 200;
    /** @type {import("../../src/Browser/components/charts/kernel/measure.js").ChartSize[]} */
    const sizes = [];
    const obs = observeSize(el, (s) => sizes.push(s));
    assert.equal(sizes[0].width, 400);
    assert.deepEqual(obs.getSize(), sizes[0]);
    assert.deepEqual(resolveChartSize({ height: 300 }, sizes[0]), {
      width: 400,
      height: 300,
    });
    obs.disconnect();
  });

  it("observeSize uses ResizeObserver when available", () => {
    const { document } = createTestDom();
    const el = document.createElement("div");
    el.clientWidth = 100;
    el.clientHeight = 80;
    /** @type {Function | null} */
    let cb = null;
    class FakeRO {
      constructor(fn) {
        cb = fn;
      }
      observe() {}
      disconnect() {
        cb = null;
      }
    }
    const prev = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeRO;
    try {
      const sizes = [];
      const obs = observeSize(el, (s) => sizes.push(s), { width: 50, height: 40 });
      assert.equal(typeof cb, "function");
      el.clientWidth = 220;
      cb();
      assert.equal(obs.getSize().width, 220);
      obs.disconnect();
      assert.equal(cb, null);
    } finally {
      globalThis.ResizeObserver = prev;
    }
  });

  it("legend, data table, datapoints keyboard", () => {
    const { document } = createTestDom();
    const legend = renderLegend(document, [{ name: "A", color: "#f00", mark: "dashed" }]);
    assert.equal(legend.getAttribute("role"), "list");
    assert.match(legend.textContent, /A/);

    const table = renderDataTable(document, {
      caption: "T",
      columns: ["C", "V"],
      rows: [["x", 1]],
    });
    assert.match(table.textContent, /T/);

    const host = document.createElement("div");
    const tip = createTooltip(document);
    host.appendChild(tip);
    const a = document.createElement("div");
    const b = document.createElement("div");
    markDatapoint(a, { id: "a", label: "A point" });
    markDatapoint(b, { id: "b", label: "B point" });
    host.appendChild(a);
    host.appendChild(b);
    const kb = attachDatapointKeyboard(host, tip);
    a.dispatchEvent({ type: "focusin", target: a });
    assert.equal(tip.getAttribute("data-active-id"), "a");
    a.dispatchEvent({ type: "keydown", key: "ArrowRight", target: a, preventDefault() {} });
    assert.equal(document.activeElement, b);
    b.dispatchEvent({ type: "focusout", target: b });
    assert.equal(tip.hasAttribute("hidden"), true);
    a.dispatchEvent({ type: "focusin", target: a });
    a.dispatchEvent({ type: "keydown", key: "Home", target: a, preventDefault() {} });
    a.dispatchEvent({ type: "keydown", key: "End", target: a, preventDefault() {} });
    a.dispatchEvent({ type: "keydown", key: "Escape", target: a });
    assert.equal(dashForMark("dotted"), "2 3");
    assert.equal(dashForMark("dashdot"), "8 3 2 3");
    assert.equal(collectDatapoints(host).length, 2);
    kb.destroy();
  });

  it("shared status helpers", () => {
    const { document } = createTestDom();
    assert.throws(() => requireDocument({}), /document required/);
    assert.equal(resolveStatus({ loading: true }), "loading");
    assert.equal(SURFACE_STATUS.EMPTY, "empty");
    const el = document.createElement("div");
    applySurfaceStatus(el, document, { status: "error", error: "boom" });
    assert.match(el.textContent, /boom/);
    assert.equal(prefersReducedMotion(document), false);
  });

  it("svgEl works via createElementNS", () => {
    const { document } = createTestDom();
    const c = svgEl(document, "circle", { cx: 1, cy: 2, r: 3 });
    assert.equal(c.getAttribute("cx"), "1");
    assert.equal(c.namespaceURI, "http://www.w3.org/2000/svg");
  });
});

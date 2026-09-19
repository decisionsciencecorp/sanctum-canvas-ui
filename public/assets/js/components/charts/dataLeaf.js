/**
 * Series, Slice, ScatterSeries, Point — language contracts the model writes
 * inside chart props. They are not boxes on the page. If one is ever mounted
 * as a child, it stays hidden so the reconciler has a real renderer.
 */

import { lifecycle } from "../content/shared.js";

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
    },
  });
}

export const Series = dataLeaf("Series");
export const Slice = dataLeaf("Slice");
export const ScatterSeries = dataLeaf("ScatterSeries");
export const Point = dataLeaf("Point");

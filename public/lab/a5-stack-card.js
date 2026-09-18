/**
 * A5.1 lab — mount Stack + Card fixtures (Playwright target for A5.8).
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { registerFoundation } from "../assets/js/components/registerFoundation.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";

const Text = {
  create(_props, ctx) {
    const el = ctx.document.createElement("span");
    el.setAttribute("data-canvas-component", "Text");
    return el;
  },
  update() {},
  destroy() {},
};

const registry = createComponentRegistry();
registerFoundation(registry);
registry.register("Text", Text);

const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
});

const stackMount = document.getElementById("mount-stack");
const cardMount = document.getElementById("mount-card");
const status = document.getElementById("status");

render(
  stackMount,
  {
    type: "Stack",
    id: "lab-stack",
    props: { direction: "row", gap: "l", align: "center", wrap: true },
    children: [
      { type: "Text", id: "a", children: ["Monday"] },
      { type: "Text", id: "b", children: ["Tuesday"] },
      { type: "Text", id: "c", children: ["Wednesday"] },
    ],
  },
  ctx,
);

render(
  cardMount,
  {
    type: "Card",
    id: "lab-card",
    props: { variant: "card" },
    children: [
      {
        type: "CardContent",
        id: "body",
        children: [
          { type: "Text", id: "line", children: ["Sales this week, with the system they came from."] },
        ],
      },
      {
        type: "CardSources",
        id: "sources",
        props: {
          sources: [
            {
              title: "Example source",
              sourceName: "example.com",
              url: "https://example.com/",
            },
          ],
        },
        children: [
          { type: "CardSourcesHeading", key: "__sources-heading", children: ["Sources"] },
          {
            type: "CardSourceItem",
            key: "src-0",
            props: {
              title: "Example source",
              sourceName: "example.com",
              url: "https://example.com/",
              index: 0,
            },
            children: ["Example source"],
          },
        ],
      },
    ],
  },
  ctx,
);

if (status) status.textContent = "Ready. The source under the card is a link.";

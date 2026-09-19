/**
 * A5.1 lab — mount Stack + Card fixtures (Playwright target for A5.8).
 * Stack is layout-only; children are Callouts so row/gap/wrap are visible.
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { registerFoundation } from "../assets/js/components/registerFoundation.js";
import { registerContent } from "../assets/js/components/content/registerContent.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";

const registry = createComponentRegistry();
registerFoundation(registry);
registerContent(registry);

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
    id: "lab-stack-root",
    props: { direction: "column", gap: "l" },
    children: [
      {
        type: "TextContent",
        id: "lab-stack-row-label",
        props: {
          text: "Row — three panels side by side (narrow the window and they wrap):",
          variant: "clear",
          size: "sm",
        },
      },
      {
        type: "Stack",
        id: "lab-stack-row",
        props: { direction: "row", gap: "l", align: "stretch", wrap: true },
        children: [
          {
            type: "Callout",
            id: "lab-stack-a",
            props: { title: "Monday", description: "First child in the row", variant: "info" },
          },
          {
            type: "Callout",
            id: "lab-stack-b",
            props: { title: "Tuesday", description: "Second child — notice the gap", variant: "success" },
          },
          {
            type: "Callout",
            id: "lab-stack-c",
            props: { title: "Wednesday", description: "Third child", variant: "warning" },
          },
        ],
      },
      {
        type: "TextContent",
        id: "lab-stack-col-label",
        props: {
          text: "Column — same three panels, top to bottom (Stack’s default):",
          variant: "clear",
          size: "sm",
        },
      },
      {
        type: "Stack",
        id: "lab-stack-col",
        props: { direction: "column", gap: "s" },
        children: [
          {
            type: "Callout",
            id: "lab-stack-d",
            props: { title: "Top", description: "First in the column", variant: "info" },
          },
          {
            type: "Callout",
            id: "lab-stack-e",
            props: { title: "Middle", description: "Second in the column", variant: "success" },
          },
          {
            type: "Callout",
            id: "lab-stack-f",
            props: { title: "Bottom", description: "Third in the column", variant: "warning" },
          },
        ],
      },
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
        type: "CardHeader",
        id: "card-h",
        props: { title: "Sales this week", subtitle: "With the system they came from" },
      },
      {
        type: "CardContent",
        id: "body",
        children: [
          {
            type: "TextContent",
            id: "line",
            props: {
              text: "A Card is a titled box. The source under it is a link — that is the only control on this page.",
              variant: "clear",
            },
          },
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

if (status) {
  status.textContent =
    "Ready. Stack only arranges children (row vs column, gap, wrap). The source under the card is a link.";
  status.setAttribute("data-lab-ready", "1");
}

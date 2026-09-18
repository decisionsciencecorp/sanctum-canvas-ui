/**
 * A6.12 lab — mount every A6 family for Playwright screenshots.
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { createStore } from "../assets/js/runtime/store.js";
import { createBindingManager } from "../assets/js/runtime/bindings.js";
import { registerFoundation } from "../assets/js/components/registerFoundation.js";
import { registerForms } from "../assets/js/components/forms/registerForms.js";
import { registerActions } from "../assets/js/components/actions/registerActions.js";
import { registerTable } from "../assets/js/components/table/registerTable.js";
import { registerCharts } from "../assets/js/components/charts/registerCharts.js";
import { registerCards } from "../assets/js/components/cards/index.js";
import { registerTools } from "../assets/js/components/tools/registerTools.js";
import { registerContent } from "../assets/js/components/content/registerContent.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";

/** Same-origin lab image (urlPolicy blocks data: — H4). */
const LAB_IMG = "./lab-image.svg";

const cartesian = {
  labels: ["Mon", "Tue", "Wed", "Thu"],
  series: [
    { category: "Views", values: [12, 18, 14, 22] },
    { category: "Clicks", values: [3, 5, 4, 7] },
  ],
  xLabel: "Day",
  yLabel: "Count",
  height: 200,
};

const slices = {
  labels: ["Alpha", "Beta", "Gamma"],
  values: [40, 35, 25],
};

const registry = createComponentRegistry();
registerFoundation(registry);
registerForms(registry);
registerActions(registry);
registerTable(registry);
registerCharts(registry);
registerCards(registry);
registerTools(registry);
registerContent(registry);

const store = createStore({});
const bindings = createBindingManager(store);

const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
  bindings,
  state: store,
});

function mount(id, vnode) {
  const host = document.getElementById(id);
  if (!host) throw new Error(`missing mount #${id}`);
  render(host, vnode, ctx);
}

mount("mount-forms", {
  type: "Form",
  id: "lab-form",
  props: {
    name: "lab-contact",
    fields: [
      {
        type: "FormControl",
        id: "fc-name",
        props: {
          label: "Full name",
          hint: "As on your badge",
          input: {
            type: "Input",
            props: {
              name: "fullName",
              placeholder: "Ada Lovelace",
              defaultValue: "Ada Lovelace",
              rules: { required: true },
            },
          },
        },
      },
      {
        type: "FormControl",
        id: "fc-email",
        props: {
          label: "Email",
          input: {
            type: "Input",
            props: {
              name: "email",
              type: "email",
              placeholder: "ada@example.com",
              defaultValue: "ada@example.com",
              rules: { required: true, email: true },
            },
          },
        },
      },
      {
        type: "FormControl",
        id: "fc-notes",
        props: {
          label: "Notes",
          input: {
            type: "TextArea",
            props: {
              name: "notes",
              placeholder: "Optional notes",
              defaultValue: "Lab parity notes.",
            },
          },
        },
      },
      {
        type: "FormControl",
        id: "fc-date",
        props: {
          label: "Start date",
          input: {
            type: "DatePicker",
            props: { name: "start", defaultValue: "2026-09-18" },
          },
        },
      },
      {
        type: "FormControl",
        id: "fc-slider",
        props: {
          label: "Priority",
          input: {
            type: "Slider",
            props: { name: "priority", min: 0, max: 100, defaultValue: 60 },
          },
        },
      },
      {
        type: "FormControl",
        id: "fc-select",
        props: {
          label: "Region",
          input: {
            type: "Select",
            props: {
              name: "region",
              defaultValue: "us",
              items: [
                { value: "us", label: "United States" },
                { value: "eu", label: "Europe" },
                { value: "apac", label: "APAC" },
              ],
            },
          },
        },
      },
    ],
    buttons: [
      {
        type: "Buttons",
        id: "form-btns",
        props: {
          direction: "row",
          buttons: [
            { type: "Submit", id: "sub", props: { label: "Save" } },
            { type: "Reset", id: "rst", props: { label: "Reset" } },
          ],
        },
      },
    ],
  },
});

mount("mount-selection", {
  type: "Stack",
  id: "sel-stack",
  props: { direction: "column", gap: "m" },
  children: [
    {
      type: "CheckBoxGroup",
      id: "cb",
      props: {
        name: "features",
        items: [
          { name: "analytics", label: "Analytics", defaultChecked: true },
          { name: "alerts", label: "Alerts" },
        ],
      },
    },
    {
      type: "RadioGroup",
      id: "rg",
      props: {
        name: "tier",
        defaultValue: "pro",
        items: [
          { value: "basic", label: "Basic" },
          { value: "pro", label: "Pro" },
        ],
      },
    },
    {
      type: "SwitchGroup",
      id: "sw",
      props: {
        name: "flags",
        items: [
          { name: "dark", label: "Dark mode", defaultChecked: false },
          { name: "compact", label: "Compact", defaultChecked: true },
        ],
      },
    },
    {
      type: "Chips",
      id: "chips",
      props: {
        name: "tags",
        type: "multiple",
        items: [
          { value: "ops", label: "Ops" },
          { value: "eng", label: "Eng" },
          { value: "design", label: "Design" },
        ],
        defaultValue: ["ops"],
      },
    },
    {
      type: "OptionCards",
      id: "opts",
      props: {
        name: "plan",
        type: "single",
        defaultValue: "starter",
        items: [
          { value: "starter", title: "Starter", subtitle: "Free forever" },
          { value: "team", title: "Team", subtitle: "$20 / seat" },
        ],
      },
    },
  ],
});

mount("mount-buttons", {
  type: "Buttons",
  id: "lab-buttons",
  props: {
    direction: "row",
    buttons: [
      { type: "Button", id: "b-pri", props: { label: "Primary", variant: "primary" } },
      { type: "Button", id: "b-sec", props: { label: "Secondary", variant: "secondary" } },
      { type: "Button", id: "b-ter", props: { label: "Tertiary", variant: "tertiary" } },
      {
        type: "Button",
        id: "b-des",
        props: { label: "Destructive", variant: "primary", destructive: true },
      },
      {
        type: "IconButton",
        id: "b-ico",
        props: { name: "More actions", icon: "⋯", variant: "secondary" },
      },
    ],
  },
});

mount("mount-table", {
  type: "Table",
  id: "lab-table",
  props: {
    columns: [
      { label: "Name", data: ["Ada", "Otto", "Mark"], type: "string", sortable: true },
      {
        label: "Score",
        data: [12, 9, 15],
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        label: "Role",
        data: ["Engineer", "Agent", "Lead"],
        type: "string",
      },
    ],
  },
});

mount("mount-editable-table", {
  type: "EditableTable",
  id: "lab-editable",
  props: {
    name: "people",
    columns: [
      { type: "text", key: "name", header: "Name" },
      { type: "number", key: "age", header: "Age" },
      { type: "date-single", key: "joined", header: "Joined" },
      {
        type: "select",
        key: "role",
        header: "Role",
        options: [
          { value: "eng", label: "Engineer" },
          { value: "ops", label: "Ops" },
        ],
      },
      { type: "url", key: "site", header: "Site" },
    ],
    data: [
      {
        id: "r1",
        values: ["Ada", 36, "2020-01-15", "eng", "https://example.com"],
      },
      {
        id: "r2",
        values: ["Otto", 1, "2024-06-01", "ops", "https://example.org"],
      },
    ],
  },
});

mount("mount-charts", {
  type: "Stack",
  id: "charts-stack",
  props: { direction: "column", gap: "l" },
  children: [
    {
      type: "BarChart",
      id: "c-bar",
      props: { ...cartesian, title: "BarChart" },
    },
    {
      type: "LineChart",
      id: "c-line",
      props: { ...cartesian, title: "LineChart", variant: "linear" },
    },
    {
      type: "AreaChart",
      id: "c-area",
      props: { ...cartesian, title: "AreaChart" },
    },
    {
      type: "HorizontalBarChart",
      id: "c-hbar",
      props: { ...cartesian, title: "HorizontalBarChart" },
    },
    {
      type: "PieChart",
      id: "c-pie",
      props: { ...slices, title: "PieChart" },
    },
    {
      type: "SingleStackedBarChart",
      id: "c-ssb",
      props: { ...slices, title: "SingleStackedBarChart" },
    },
    {
      type: "RadarChart",
      id: "c-radar",
      props: {
        title: "RadarChart",
        labels: ["Speed", "Reliability", "UX", "Cost"],
        series: [{ category: "Model A", values: [4, 3, 5, 4] }],
        height: 220,
      },
    },
    {
      type: "RadialChart",
      id: "c-radial",
      props: { ...slices, title: "RadialChart", height: 180 },
    },
    {
      type: "ScatterChart",
      id: "c-scatter",
      props: {
        title: "ScatterChart",
        datasets: [
          {
            name: "Cohort",
            points: [
              { x: 1, y: 2 },
              { x: 2, y: 4 },
              { x: 3, y: 3 },
              { x: 4, y: 6 },
            ],
          },
        ],
        xLabel: "X",
        yLabel: "Y",
        height: 200,
      },
    },
  ],
});

mount("mount-card-blocks", {
  type: "Stack",
  id: "cards-stack",
  props: { direction: "column", gap: "l" },
  children: [
    {
      type: "SnippetCardBlock",
      id: "snippet",
      props: {
        layout: "grid",
        items: [
          {
            id: "a",
            lhs: { type: "IconText", props: { icon: "★", title: "Alpha" } },
            rhs: { type: "BoldText", props: { text: "1" } },
          },
          {
            id: "b",
            lhs: { type: "IconText", props: { icon: "⚡", title: "Beta" } },
            rhs: { type: "BoldText", props: { text: "2" } },
          },
        ],
      },
    },
    {
      type: "OverviewCardBlock",
      id: "overview",
      props: {
        layout: "grid",
        items: [
          {
            top: { type: "Text", props: { text: "Revenue" } },
            bottom: {
              type: "MetricIndicatorInline",
              props: {
                value: "$12k",
                trend: { direction: "up", value: 4 },
              },
            },
          },
          {
            top: { type: "Text", props: { text: "Users" } },
            bottom: {
              type: "MetricIndicatorInline",
              props: {
                value: "820",
                trend: { direction: "down", value: 2 },
              },
            },
          },
        ],
      },
    },
    {
      type: "ContextCardBlock",
      id: "context",
      props: {
        items: [
          {
            title: "Context",
            body: "Operator-facing summary for parity.",
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Lab texture",
          },
          {
            title: "Follow-up",
            body: "Second card satisfies minItems=2.",
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Lab texture 2",
          },
        ],
      },
    },
    {
      type: "CompositeCardBlock",
      id: "composite",
      props: {
        items: [
          {
            header: { type: "IconText", props: { icon: "📦", title: "Kit" } },
            body: [
              { type: "Text", props: { text: "Includes tools" } },
              { type: "TagBlock", props: { tags: [{ text: "new" }] } },
            ],
            footer: {
              price: { type: "BoldText", props: { text: "$40" } },
            },
          },
          {
            header: { type: "IconText", props: { icon: "🧰", title: "Pro" } },
            body: [
              { type: "Text", props: { text: "Includes more" } },
              { type: "TagBlock", props: { tags: [{ text: "pro" }] } },
            ],
            footer: {
              price: { type: "BoldText", props: { text: "$90" } },
            },
          },
        ],
      },
    },
    {
      type: "VisualCardBlock",
      id: "visual",
      props: {
        items: [
          {
            body: { type: "BoldText", props: { text: "Trail" } },
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Trail",
          },
          {
            body: { type: "BoldText", props: { text: "Lake" } },
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Lake",
          },
        ],
      },
    },
  ],
});

mount("mount-image-gallery", {
  type: "ImageGallery",
  id: "lab-gallery",
  props: {
    images: [
      { src: LAB_IMG, alt: "One" },
      { src: LAB_IMG, alt: "Two" },
      { src: LAB_IMG, alt: "Three" },
      { src: LAB_IMG, alt: "Four" },
      { src: LAB_IMG, alt: "Five" },
    ],
  },
});

mount("mount-tool-activity", {
  type: "Stack",
  id: "tools-stack",
  props: { direction: "column", gap: "m" },
  children: [
    {
      type: "ToolActivity",
      id: "ta-stream",
      props: {
        status: "streaming",
        toolName: "search",
        id: "tc-1",
        rawArgs: '{"q":"hel',
        isPartial: true,
      },
    },
    {
      type: "ToolActivity",
      id: "ta-exec",
      props: {
        status: "executing",
        toolName: "search",
        id: "tc-1",
        rawArgs: '{"q":"hello"}',
        input: { q: "hello" },
      },
    },
    {
      type: "ToolActivity",
      id: "ta-done",
      props: {
        status: "complete",
        toolName: "search",
        id: "tc-1",
        input: { q: "hello" },
        result: '{"hits":2}',
      },
    },
    {
      type: "RunStatus",
      id: "run-ok",
      props: { status: "finish", message: "Run finished" },
    },
    {
      type: "RunStatus",
      id: "run-err",
      props: { status: "error", message: "Run failed: timeout" },
    },
  ],
});

const status = document.getElementById("status");
if (status) {
  status.textContent = "Ready";
  status.setAttribute("data-lab-ready", "1");
}

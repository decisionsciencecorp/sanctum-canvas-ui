/**
 * A9.4 / A9.5 — Guided walkthrough story (on rails).
 *
 * Scenario: an ops lead asks the assistant how Empanada Empire did this week.
 * Each step returns the *whole* canvas vnode for that point in the story; the
 * reconciler keeps earlier DOM and appends the new component, so the screen
 * grows the way a real streamed reply grows.
 *
 * Numbers are made up but plausible. Nothing here calls a model.
 */

/** Same-origin lab image (urlPolicy blocks data: URLs). */
const IMG = "/lab/lab-image.svg";

const DAYS = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
const SALES = [2140, 3480, 3910, 2860, 1720, 1890, 2420];
const LAST_WEEK = [1980, 3050, 3410, 2600, 1650, 1740, 2010];

const HEADLINE =
  "Solid week. Sales came in at $18,420, up 12% on last week. Friday and Saturday dinner carried it; Monday was the soft spot. One thing needs attention: beef empanada dough runs out Tuesday at the current pace.";

const FOLLOWUP_REPLY =
  "August finished at $71,300 across four weeks. This week is tracking about 8% above the August weekly average, mostly from the weekend dinner lift.";

/* ---------- reusable pieces ---------- */

function header() {
  return {
    type: "InlineHeader",
    id: "wt-header",
    props: {
      heading: "This week at Empanada Empire",
      description: "Thu Sep 11 – Wed Sep 17",
    },
  };
}

function summary(state) {
  return {
    type: "TextContent",
    id: "wt-summary",
    props: { text: state.headline, variant: "clear", size: "md" },
  };
}

function kpis() {
  return {
    type: "OverviewCardBlock",
    id: "wt-kpis",
    props: {
      layout: "grid",
      items: [
        {
          top: { type: "Text", props: { text: "Sales" } },
          bottom: {
            type: "MetricIndicatorInline",
            props: { value: "$18,420", trend: { direction: "up", value: 12 } },
          },
        },
        {
          top: { type: "Text", props: { text: "Orders" } },
          bottom: {
            type: "MetricIndicatorInline",
            props: { value: "1,236", trend: { direction: "up", value: 8 } },
          },
        },
        {
          top: { type: "Text", props: { text: "Average ticket" } },
          bottom: {
            type: "MetricIndicatorInline",
            props: { value: "$14.90", trend: { direction: "up", value: 3 } },
          },
        },
        {
          top: { type: "Text", props: { text: "Refunds" } },
          bottom: {
            type: "MetricIndicatorInline",
            props: { value: "6", trend: { direction: "down", value: 40 } },
          },
        },
      ],
    },
  };
}

function charts() {
  return {
    type: "Tabs",
    id: "wt-charts",
    props: {
      variant: "card",
      items: [
        {
          value: "by-day",
          trigger: "Sales by day",
          content: [
            {
              type: "BarChart",
              id: "wt-bar",
              props: {
                title: "Sales by day ($)",
                labels: DAYS,
                series: [{ category: "This week", values: SALES }],
                xLabel: "Day",
                yLabel: "Dollars",
                height: 220,
              },
            },
          ],
        },
        {
          value: "vs-last",
          trigger: "Versus last week",
          content: [
            {
              type: "LineChart",
              id: "wt-line",
              props: {
                title: "This week vs last week ($)",
                labels: DAYS,
                series: [
                  { category: "This week", values: SALES },
                  { category: "Last week", values: LAST_WEEK },
                ],
                variant: "linear",
                xLabel: "Day",
                yLabel: "Dollars",
                height: 220,
              },
            },
          ],
        },
        {
          value: "channel",
          trigger: "Channel mix",
          content: [
            {
              type: "PieChart",
              id: "wt-pie",
              props: {
                title: "Where orders came from",
                labels: ["Walk-in", "Online pickup", "Delivery apps", "Catering"],
                values: [46, 27, 19, 8],
              },
            },
          ],
        },
      ],
    },
  };
}

function topSellers() {
  return {
    type: "Table",
    id: "wt-top",
    props: {
      columns: [
        {
          label: "Item",
          type: "string",
          data: ["Beef empanada", "Chicken empanada", "Spinach & cheese", "Guava pastry", "Café con leche"],
          sortable: true,
        },
        {
          label: "Sold",
          type: "number",
          align: "right",
          data: [412, 366, 241, 188, 302],
          sortable: true,
        },
        {
          label: "Revenue",
          type: "string",
          align: "right",
          data: ["$1,854", "$1,647", "$1,085", "$564", "$1,057"],
        },
      ],
    },
  };
}

function alertBlock() {
  return {
    type: "Stack",
    id: "wt-alert",
    props: { direction: "column", gap: "s" },
    children: [
      {
        type: "Callout",
        id: "wt-callout",
        props: {
          title: "Beef dough runs out Tuesday",
          description:
            "You have 14 trays left and are using about 6 a day. Your supplier needs two days' notice, so today is the last comfortable day to reorder.",
          variant: "warning",
        },
      },
      {
        type: "TagBlock",
        id: "wt-tags",
        props: {
          tags: [
            { text: "Inventory", variant: "neutral" },
            { text: "Beef dough", variant: "info" },
            { text: "Act today", variant: "warning" },
          ],
        },
      },
    ],
  };
}

function sourcesCard() {
  return {
    type: "Card",
    id: "wt-sources",
    props: { variant: "card" },
    children: [
      {
        type: "CardHeader",
        id: "wt-sources-h",
        props: { title: "Where these numbers came from", subtitle: "Two systems, read this morning" },
      },
      {
        type: "CardSources",
        id: "wt-sources-list",
        props: {
          sources: [
            { title: "Square sales export, Sep 11–17", sourceName: "Square", url: "https://squareup.com/" },
            { title: "Kitchen POS inventory count", sourceName: "pos.empanadaempire.us", url: "https://pos.empanadaempire.us/" },
          ],
        },
      },
    ],
  };
}

function reorderForm(state) {
  return {
    type: "Card",
    id: "wt-reorder-card",
    props: { variant: "card" },
    children: [
      {
        type: "CardHeader",
        id: "wt-reorder-h",
        props: { title: "Reorder beef dough", subtitle: "I filled in what I'd suggest. Change anything, then place it." },
      },
      {
        type: "CardContent",
        id: "wt-reorder-body",
        children: [
          {
            type: "Form",
            id: "wt-form",
            props: {
              name: "reorder-dough",
              action: { steps: [{ type: "run", name: "reorder_supplies", args: { sku: "beef-dough-tray" } }] },
              fields: [
                {
                  type: "FormControl",
                  id: "wt-fc-qty",
                  props: {
                    label: "Trays",
                    hint: "One tray is about 40 empanadas",
                    input: {
                      type: "Input",
                      props: { name: "trays", type: "number", defaultValue: "30", rules: { required: true } },
                    },
                  },
                },
                {
                  type: "FormControl",
                  id: "wt-fc-supplier",
                  props: {
                    label: "Supplier",
                    input: {
                      type: "Select",
                      props: {
                        name: "supplier",
                        defaultValue: "lonestar",
                        items: [
                          { value: "lonestar", label: "Lone Star Foods (2-day)" },
                          { value: "dfwwholesale", label: "DFW Wholesale (3-day)" },
                          { value: "local", label: "Local bakery (next day, +15%)" },
                        ],
                      },
                    },
                  },
                },
                {
                  type: "FormControl",
                  id: "wt-fc-date",
                  props: {
                    label: "Deliver by",
                    input: { type: "DatePicker", props: { name: "deliverBy", defaultValue: "2026-09-22" } },
                  },
                },
                {
                  type: "FormControl",
                  id: "wt-fc-urgency",
                  props: {
                    label: "Urgency",
                    hint: "Higher asks the supplier to prioritise the order",
                    input: { type: "Slider", props: { name: "urgency", min: 0, max: 100, defaultValue: 70 } },
                  },
                },
              ],
              buttons: [
                {
                  type: "Buttons",
                  id: "wt-form-btns",
                  props: {
                    direction: "row",
                    buttons: [
                      { type: "Submit", id: "wt-submit", props: { label: "Place reorder" } },
                      {
                        type: "Button",
                        id: "wt-not-now",
                        props: {
                          label: "Not now",
                          variant: "secondary",
                          action: { steps: [{ type: "run", name: "dismiss_reorder" }] },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function toolActivity(state) {
  const t = state.tool;
  const children = [];
  if (t.status === "streaming") {
    children.push({
      type: "ToolActivity",
      id: "wt-tool",
      props: { status: "streaming", toolName: "reorder_supplies", id: "call-1", rawArgs: t.rawArgs, isPartial: true },
    });
  } else if (t.status === "executing") {
    children.push({
      type: "ToolActivity",
      id: "wt-tool",
      props: { status: "executing", toolName: "reorder_supplies", id: "call-1", rawArgs: t.rawArgs, input: t.input },
    });
  } else if (t.status === "complete") {
    children.push({
      type: "ToolActivity",
      id: "wt-tool",
      props: { status: "complete", toolName: "reorder_supplies", id: "call-1", input: t.input, result: t.result },
    });
    children.push({
      type: "RunStatus",
      id: "wt-run",
      props: { status: "finish", message: "Reorder placed — confirmation #LS-48211" },
    });
  } else if (t.status === "dismissed") {
    children.push({
      type: "RunStatus",
      id: "wt-run",
      props: { status: "finish", message: "Okay — I'll remind you tomorrow morning instead." },
    });
  }
  return { type: "Stack", id: "wt-tool-stack", props: { direction: "column", gap: "s" }, children };
}

function planSteps() {
  return {
    type: "Steps",
    id: "wt-steps",
    props: {
      items: [
        { title: "Supplier confirms", details: "Lone Star usually replies within the hour." },
        { title: "Update the prep sheet", details: "30 trays landing Monday; hold 4 for Sunday brunch." },
        { title: "Recheck Thursday", details: "I'll flag it again if usage runs hotter than 6 trays a day." },
      ],
    },
  };
}

function detailsAccordion() {
  return {
    type: "Accordion",
    id: "wt-accordion",
    props: {
      variant: "card",
      items: [
        {
          value: "order",
          trigger: "Order details",
          content: ["30 trays beef dough · Lone Star Foods · deliver by Mon Sep 22 · urgency 70 / 100 · est. $840."],
        },
        {
          value: "why",
          trigger: "Why 30 trays",
          content: ["Two weeks of cover at 6 trays a day, rounded to the supplier's case size of 10."],
        },
        {
          value: "window",
          trigger: "Delivery window",
          content: ["Lone Star delivers Monday 6–9 am. The back door is unlocked from 5:30."],
        },
      ],
    },
  };
}

function followUps() {
  return {
    type: "FollowUpBlock",
    id: "wt-followups",
    props: {
      items: [
        { text: "How does this compare with August?" },
        { text: "Which shifts were short-staffed?" },
        { text: "Draft a note to the kitchen about the dough" },
      ],
    },
  };
}

function followUpReply(state) {
  if (!state.followUp) return null;
  return {
    type: "Stack",
    id: "wt-followup-reply",
    props: { direction: "column", gap: "s" },
    children: [
      { type: "TextContent", id: "wt-fu-text", props: { text: state.followUp.reply, variant: "sunk" } },
      {
        type: "SingleStackedBarChart",
        id: "wt-fu-chart",
        props: {
          title: "August weeks vs this week ($)",
          labels: ["Aug wk1", "Aug wk2", "Aug wk3", "Aug wk4", "This week"],
          values: [17100, 18250, 17600, 18350, 18420],
        },
      },
    ],
  };
}

function kitchenNoteModal(state, api) {
  return {
    type: "Modal",
    id: "wt-modal",
    props: {
      title: "Send this note to the kitchen?",
      size: "md",
      open: {
        get: () => state.modalOpen,
        set: (v) => {
          state.modalOpen = !!v;
          api.rerender();
        },
      },
      children: [
        {
          type: "TextContent",
          id: "wt-modal-text",
          props: {
            text:
              "Heads up team — beef dough is low. 30 trays arrive Monday morning. Until then, push chicken and spinach on the specials board. — Ops",
            variant: "sunk",
          },
        },
        {
          type: "Buttons",
          id: "wt-modal-btns",
          props: {
            direction: "row",
            buttons: [
              {
                type: "Button",
                id: "wt-modal-send",
                props: { label: "Send it", variant: "primary", action: { steps: [{ type: "run", name: "send_kitchen_note" }] } },
              },
              {
                type: "Button",
                id: "wt-modal-cancel",
                props: { label: "Cancel", variant: "secondary", action: { steps: [{ type: "run", name: "cancel_kitchen_note" }] } },
              },
            ],
          },
        },
      ],
    },
  };
}

function noteResult(state) {
  if (!state.noteResult) return null;
  return {
    type: "Callout",
    id: "wt-note-result",
    props: {
      title: state.noteResult === "sent" ? "Note sent to the kitchen group" : "Note not sent",
      description:
        state.noteResult === "sent"
          ? "Delivered to 6 people on the kitchen channel at " + state.noteTime + "."
          : "Nothing was sent. You can ask me again later.",
      variant: state.noteResult === "sent" ? "success" : "info",
    },
  };
}

function specialsCarousel() {
  return {
    type: "Carousel",
    id: "wt-carousel",
    props: {
      variant: "card",
      children: [
        [
          { type: "Image", id: "wt-c1-img", props: { src: IMG, alt: "Friday special", aspectRatio: "16:9", scale: "fill" } },
          { type: "TextContent", id: "wt-c1-t", props: { text: "Friday: chimichurri beef — sold out by 8 pm." } },
        ],
        [
          { type: "Image", id: "wt-c2-img", props: { src: IMG, alt: "Saturday special", aspectRatio: "16:9", scale: "fill" } },
          { type: "TextContent", id: "wt-c2-t", props: { text: "Saturday: chicken tinga — best margin of the week." } },
        ],
        [
          { type: "Image", id: "wt-c3-img", props: { src: IMG, alt: "Sunday special", aspectRatio: "16:9", scale: "fill" } },
          { type: "TextContent", id: "wt-c3-t", props: { text: "Sunday: guava & cheese brunch box." } },
        ],
      ],
    },
  };
}

function programCode(program) {
  return {
    type: "CodeBlock",
    id: "wt-code",
    props: { language: "text", codeString: program },
  };
}

function recap() {
  return {
    type: "ListBlock",
    id: "wt-recap",
    props: {
      variant: "number",
      items: [
        { title: "Text and headers", subtitle: "InlineHeader, TextContent" },
        { title: "Numbers", subtitle: "OverviewCardBlock, MetricIndicatorInline" },
        { title: "Charts inside tabs", subtitle: "Tabs, BarChart, LineChart, PieChart, SingleStackedBarChart" },
        { title: "Data", subtitle: "Table, Callout, TagBlock, Card, CardSources" },
        { title: "Input that does something", subtitle: "Form, Input, Select, DatePicker, Slider, Submit, Button" },
        { title: "Work in flight", subtitle: "ToolActivity, RunStatus" },
        { title: "Structure", subtitle: "Steps, Accordion, Carousel, Image, Modal" },
        { title: "Keeping the conversation going", subtitle: "FollowUpBlock" },
      ],
    },
  };
}

/* ---------- Lang snippets shown in the narration panel (illustrative) ---------- */

const PROGRAM = {
  header: 'header = InlineHeader("This week at Empanada Empire", "Thu Sep 11 – Wed Sep 17")',
  summary: 'summary = TextContent("Solid week. Sales came in at $18,420, up 12% …")',
  kpis: 'kpis = OverviewCardBlock([\n  { top: Text("Sales"), bottom: MetricIndicatorInline("$18,420", { direction: "up", value: 12 }) },\n  …\n])',
  charts: 'charts = Tabs([\n  { trigger: "Sales by day", content: BarChart(days, [{ category: "This week", values: sales }]) },\n  { trigger: "Versus last week", content: LineChart(days, [thisWeek, lastWeek]) },\n  { trigger: "Channel mix", content: PieChart(channels, share) }\n])',
  table: 'top = Table([\n  { label: "Item", data: items },\n  { label: "Sold", data: sold, type: "number" },\n  { label: "Revenue", data: revenue }\n])',
  alert: 'alert = Callout("Beef dough runs out Tuesday", "You have 14 trays left …", "warning")\ntags = TagBlock([{ text: "Inventory" }, { text: "Beef dough" }, { text: "Act today", variant: "warning" }])',
  sources: 'sources = Card([CardHeader("Where these numbers came from"), CardSources(sourceList)])',
  form: 'reorder = Form("reorder-dough",\n  [ FormControl("Trays", Input("trays", { type: "number", value: "30" })),\n    FormControl("Supplier", Select("supplier", suppliers)),\n    FormControl("Deliver by", DatePicker("deliverBy")),\n    FormControl("Urgency", Slider("urgency", 0, 100)) ],\n  Action([ Run("reorder_supplies", { sku: "beef-dough-tray" }) ]))',
  tool: '// host emits TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END → TOOL_CALL_RESULT\n// canvas shows ToolActivity for each phase, then RunStatus("finish", …)',
  steps: 'plan = Steps([\n  { title: "Supplier confirms", details: "…" },\n  { title: "Update the prep sheet", details: "…" },\n  { title: "Recheck Thursday", details: "…" }\n])',
  accordion: 'details = Accordion([\n  { trigger: "Order details", content: "30 trays · Lone Star · Mon Sep 22 …" },\n  { trigger: "Why 30 trays", content: "…" },\n  { trigger: "Delivery window", content: "…" }\n])',
  followups: 'next = FollowUpBlock([\n  "How does this compare with August?",\n  "Which shifts were short-staffed?",\n  "Draft a note to the kitchen about the dough"\n])',
  followupReply: 'august = TextContent("August finished at $71,300 …")\ntrend = SingleStackedBarChart(weeks, totals)',
  modal: 'confirm = Modal("Send this note to the kitchen?", $noteOpen, [\n  TextContent(noteBody),\n  Buttons([ Button("Send it", Action([Run("send_kitchen_note")])), Button("Cancel", …) ])\n])',
  carousel: 'specials = Carousel([\n  [Image(fridayPhoto), TextContent("Friday: chimichurri beef …")],\n  [Image(saturdayPhoto), TextContent("Saturday: chicken tinga …")],\n  [Image(sundayPhoto), TextContent("Sunday: guava & cheese …")]\n])',
  root: "root = Stack([header, summary, kpis, charts, top, alert, sources, reorder, plan, details, next, specials])",
};

/* ---------- canvas composition per step ---------- */

/**
 * Build the whole canvas vnode from state. Each key in `state.show` gates a block,
 * so a step only needs to flip a flag and (optionally) run an effect.
 */
export function composeCanvas(state, api) {
  const s = state.show;
  const children = [];
  if (s.header) children.push(header());
  if (s.summary) children.push(summary(state));
  if (s.kpis) children.push(kpis());
  if (s.charts) children.push(charts());
  if (s.table) children.push(topSellers());
  if (s.alert) children.push(alertBlock());
  if (s.sources) children.push(sourcesCard());
  if (s.form && !state.formDone) children.push(reorderForm(state));
  if (s.tool && state.tool.status !== "idle") children.push(toolActivity(state));
  if (s.steps) children.push(planSteps());
  if (s.accordion) children.push(detailsAccordion());
  if (s.followups) children.push(followUps());
  if (s.followupReply) {
    const r = followUpReply(state);
    if (r) children.push(r);
  }
  if (s.noteResult) {
    const n = noteResult(state);
    if (n) children.push(n);
  }
  if (s.carousel) children.push(specialsCarousel());
  if (s.code) children.push(programCode(state.program));
  if (s.recap) children.push(recap());
  if (s.modal) children.push(kitchenNoteModal(state, api));

  return { type: "Stack", id: "wt-root", props: { direction: "column", gap: "l" }, children };
}

export function initialState() {
  return {
    show: {},
    headline: "",
    tool: { status: "idle", rawArgs: "", input: null, result: "" },
    formDone: false,
    followUp: null,
    modalOpen: false,
    noteResult: null,
    noteTime: "",
    program: "",
  };
}

/* ---------- helpers for effects ---------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function typewriter(state, api, text, { chunk = 6, delay = 22 } = {}) {
  state.headline = "";
  api.setStreaming(true);
  for (let i = 0; i < text.length && !api.cancelled(); i += chunk) {
    state.headline = text.slice(0, i + chunk);
    api.rerender();
    await sleep(delay);
  }
  state.headline = text;
  api.setStreaming(false);
  api.rerender();
}

async function runToolCall(state, api, { skipDelays = false } = {}) {
  const wait = (ms) => (skipDelays ? Promise.resolve() : sleep(ms));
  const argsFull = JSON.stringify({ sku: "beef-dough-tray", trays: 30, supplier: "lonestar", deliverBy: "2026-09-22", urgency: 70 });
  state.formDone = true;
  state.tool = { status: "streaming", rawArgs: argsFull.slice(0, 22), input: null, result: "" };
  api.rerender();
  api.chat("assistant", "Placing the reorder with Lone Star Foods…");
  await wait(600);
  state.tool = { status: "streaming", rawArgs: argsFull.slice(0, 58), input: null, result: "" };
  api.rerender();
  await wait(500);
  state.tool = { status: "executing", rawArgs: argsFull, input: JSON.parse(argsFull), result: "" };
  api.rerender();
  await wait(900);
  state.tool = {
    status: "complete",
    rawArgs: argsFull,
    input: JSON.parse(argsFull),
    result: JSON.stringify({ ok: true, confirmation: "LS-48211", eta: "2026-09-22T06:30-05:00", total_usd: 840 }),
  };
  api.rerender();
}

/* ---------- the steps ---------- */

/**
 * @typedef {object} Step
 * @property {string} id
 * @property {string} actor — who is doing something at this point
 * @property {string} title
 * @property {string[]} says — plain sentences for the narration panel
 * @property {string[]} components — component names on screen for this step
 * @property {string} [why]
 * @property {string} [program]
 * @property {(state: object, api: object) => void} apply — sync flag flip (also used for Back / deep links)
 * @property {(state: object, api: object) => Promise<void>} [effect] — animation / simulated work
 * @property {{ selector: string, hint: string }} [waitFor] — user interaction that advances the story
 */

/** @type {Step[]} */
export const STEPS = [
  {
    id: "welcome",
    actor: "Guide",
    title: "What you are about to watch",
    says: [
      "This is a scripted conversation between an operations lead and the Sanctum assistant. It runs on rails: the questions and the answers are fixed, so you can concentrate on what the screen does.",
      "The right-hand side is the canvas — the same component the real app mounts. The strip above it is the chat. This left column tells you what is happening at each step.",
      "Press Next, use the right arrow key, or press Auto-play and let it run.",
    ],
    components: [],
    apply(state) {
      state.show = {};
    },
  },
  {
    id: "ask",
    actor: "You",
    title: "You ask a question",
    says: [
      "The ops lead types a normal question. Nothing special about the wording.",
      "Behind the scenes the host sends that text to the model along with a short description of every component the canvas can draw. The model answers with a tiny program instead of prose.",
    ],
    components: [],
    program: "// prompt → model\n\"How did Empanada Empire do this week?\"",
    apply(state, api) {
      state.show = {};
      api.chat("user", "How did Empanada Empire do this week?");
    },
  },
  {
    id: "headline",
    actor: "Assistant",
    title: "The answer starts streaming",
    says: [
      "The first two statements arrive: a header and a paragraph. The paragraph is drawn while the tokens are still coming in — watch it type.",
      "The parser accepts partial programs, so the canvas never waits for the full reply.",
    ],
    components: ["InlineHeader", "TextContent"],
    why: "People read the first sentence long before the charts arrive. Streaming text makes the wait feel short.",
    program: PROGRAM.header + "\n" + PROGRAM.summary,
    apply(state, api) {
      state.show = { header: true, summary: true };
      state.headline = HEADLINE;
      api.chat("assistant", "Here's the week. Scroll the canvas as it fills in.");
    },
    async effect(state, api) {
      await typewriter(state, api, HEADLINE);
    },
  },
  {
    id: "kpis",
    actor: "Assistant",
    title: "Key numbers",
    says: [
      "Four metrics in a grid: sales, orders, average ticket, refunds. Each one carries a trend arrow against last week.",
    ],
    components: ["OverviewCardBlock", "MetricIndicatorInline", "Text"],
    why: "Numbers with a direction answer 'is it better or worse?' without a chart.",
    program: PROGRAM.kpis,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true };
    },
  },
  {
    id: "charts",
    actor: "Assistant",
    title: "Charts, tucked into tabs",
    says: [
      "Three charts would be a wall. The model puts them behind tabs: sales by day, this week against last week, and where the orders came from.",
      "Click the tabs. They are real, keyboard-navigable tabs, and the charts are SVG drawn by the runtime — no chart library.",
    ],
    components: ["Tabs", "BarChart", "LineChart", "PieChart"],
    program: PROGRAM.charts,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true };
    },
  },
  {
    id: "table",
    actor: "Assistant",
    title: "Top sellers as a table",
    says: [
      "Five best-selling items with units and revenue. Click a column header to sort.",
    ],
    components: ["Table"],
    program: PROGRAM.table,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true };
    },
  },
  {
    id: "alert",
    actor: "Assistant",
    title: "The thing that needs attention",
    says: [
      "A warning callout with the specific problem and the deadline, then a row of tags so it can be filtered or scanned.",
    ],
    components: ["Callout", "TagBlock"],
    why: "The assistant is allowed to be direct. A yellow callout is harder to miss than a sentence in a paragraph.",
    program: PROGRAM.alert,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true };
    },
  },
  {
    id: "sources",
    actor: "Assistant",
    title: "Where the numbers came from",
    says: [
      "A card that lists the two systems the assistant read. Links go through the URL policy, so only allowed destinations render as links.",
    ],
    components: ["Card", "CardHeader", "CardSources"],
    program: PROGRAM.sources,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true };
    },
  },
  {
    id: "form",
    actor: "Assistant",
    title: "An offer to act: a pre-filled form",
    says: [
      "The assistant doesn't just report the dough problem — it drafts the reorder. A number field, a supplier drop-down, a date, and an urgency slider, all pre-filled with a sensible suggestion.",
      "Every field is two-way bound to the reactive store. Change the tray count and the value the tool will receive changes with it.",
    ],
    components: ["Form", "FormControl", "Input", "Select", "DatePicker", "Slider", "Buttons", "Submit", "Button"],
    program: PROGRAM.form,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true };
      state.formDone = false;
      state.tool = { status: "idle", rawArgs: "", input: null, result: "" };
    },
  },
  {
    id: "tool",
    actor: "You → Tool",
    title: "Press “Place reorder” and watch the tool run",
    says: [
      "Click Place reorder on the canvas (Auto-play clicks it for you). The form validates, then its action plan runs: one step, run reorder_supplies.",
      "The canvas shows the call in three phases — arguments streaming in, executing, complete — then a run-status line with the confirmation number. In production the tool executes on the PHP side behind a fixed registry; the browser only ever sees the neutral activity rows.",
    ],
    components: ["ToolActivity", "RunStatus"],
    why: "Users need to see that something is happening and that it finished. Tool rows are deliberately plain so they look the same for every tool.",
    program: PROGRAM.tool,
    waitFor: { selector: '#sanctum-canvas-root [data-canvas-component="Submit"], #sanctum-canvas-root button[type="submit"]', hint: "Press Place reorder on the canvas to continue." },
    apply(state, api) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true };
      // Back / deep-link: land on the finished state.
      if (state.tool.status === "idle") {
        api.chat("assistant", "Placing the reorder with Lone Star Foods…");
        state.formDone = true;
        const argsFull = JSON.stringify({ sku: "beef-dough-tray", trays: 30, supplier: "lonestar", deliverBy: "2026-09-22", urgency: 70 });
        state.tool = {
          status: "complete",
          rawArgs: argsFull,
          input: JSON.parse(argsFull),
          result: JSON.stringify({ ok: true, confirmation: "LS-48211", eta: "2026-09-22T06:30-05:00", total_usd: 840 }),
        };
      }
    },
    onAction: async (state, api, plan) => {
      const step = plan?.steps?.[0];
      if (step?.name === "reorder_supplies") {
        await runToolCall(state, api);
        return true;
      }
      if (step?.name === "dismiss_reorder") {
        state.formDone = true;
        state.tool = { status: "dismissed", rawArgs: "", input: null, result: "" };
        api.rerender();
        api.chat("assistant", "No problem. I'll bring it up tomorrow.");
        return true;
      }
      return false;
    },
    // Auto-play: prepare state as if the form had been submitted, then run the effect.
    prepareForAuto(state) {
      state.formDone = false;
      state.tool = { status: "idle", rawArgs: "", input: null, result: "" };
    },
    async effect(state, api) {
      if (state.tool.status === "complete" || state.tool.status === "dismissed") return;
      await runToolCall(state, api);
    },
  },
  {
    id: "steps",
    actor: "Assistant",
    title: "What happens next, as steps",
    says: ["A three-step plan. Steps stream one at a time in a real reply, so a long plan reads top-down as it arrives."],
    components: ["Steps"],
    program: PROGRAM.steps,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true };
    },
  },
  {
    id: "accordion",
    actor: "Assistant",
    title: "Details, folded away",
    says: ["Order details, the reasoning behind the quantity, and the delivery window — in an accordion so they don't crowd the summary. Open one."],
    components: ["Accordion"],
    program: PROGRAM.accordion,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true };
    },
  },
  {
    id: "followups",
    actor: "Assistant → You",
    title: "Suggested follow-up questions",
    says: [
      "The assistant offers three things you might ask next. Clicking one sends it back into the conversation exactly as if you had typed it.",
      "Click the first one, “How does this compare with August?” (Auto-play does this for you.)",
    ],
    components: ["FollowUpBlock"],
    program: PROGRAM.followups,
    waitFor: { selector: '#sanctum-canvas-root [data-canvas-component="FollowUpItem"]', hint: "Click a follow-up chip on the canvas to continue." },
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true };
    },
    onContinue: async (state, api, message) => {
      api.chat("user", message);
      state.followUp = { question: message, reply: FOLLOWUP_REPLY };
      state.show.followupReply = true;
      api.rerender();
      api.chat("assistant", "Pulling August from Square…");
      return true;
    },
    prepareForAuto(state) {
      state.followUp = null;
      state.show.followupReply = false;
    },
    async effect(state, api) {
      if (state.followUp) return;
      await sleep(400);
      await this.onContinue(state, api, "How does this compare with August?");
    },
  },
  {
    id: "followup-reply",
    actor: "Assistant",
    title: "The follow-up is answered in place",
    says: [
      "The reply lands under the chips: a sentence and a stacked bar comparing the four August weeks with this one. Same canvas, same conversation — nothing reloaded.",
    ],
    components: ["TextContent", "SingleStackedBarChart"],
    program: PROGRAM.followupReply,
    apply(state, api) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true, followupReply: true };
      if (!state.followUp) {
        state.followUp = { question: "How does this compare with August?", reply: FOLLOWUP_REPLY };
        api.chat("user", state.followUp.question);
        api.chat("assistant", "Pulling August from Square…");
      }
    },
  },
  {
    id: "modal",
    actor: "Assistant → You",
    title: "A confirmation dialog before anything is sent",
    says: [
      "You asked for a note to the kitchen. Before the assistant sends a message to six people, it shows the text in a modal and asks. Focus is trapped inside the dialog; Escape cancels.",
      "Choose Send it or Cancel (Auto-play chooses Send it).",
    ],
    components: ["Modal", "TextContent", "Buttons", "Button"],
    why: "Anything that leaves the room — messages, orders, payments — gets a confirmation step. The model proposes, the human disposes.",
    program: PROGRAM.modal,
    waitFor: { selector: '#sanctum-canvas-root [data-canvas-component="Modal"] button', hint: "Choose Send it or Cancel in the dialog to continue." },
    apply(state, api) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true, followupReply: true, modal: true, noteResult: true };
      if (!state.noteResult) {
        api.chat("user", "Draft a note to the kitchen about the dough");
        state.modalOpen = true;
      }
    },
    onAction: async (state, api, plan) => {
      const step = plan?.steps?.[0];
      if (step?.name === "send_kitchen_note") {
        state.modalOpen = false;
        state.noteResult = "sent";
        state.noteTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        api.rerender();
        api.chat("assistant", "Sent. The kitchen has the note.");
        return true;
      }
      if (step?.name === "cancel_kitchen_note") {
        state.modalOpen = false;
        state.noteResult = "cancelled";
        api.rerender();
        return true;
      }
      return false;
    },
    prepareForAuto(state) {
      state.noteResult = null;
      state.modalOpen = false;
    },
    async effect(state, api) {
      if (state.noteResult) return;
      await sleep(1400);
      if (api.cancelled()) return;
      await this.onAction(state, api, { steps: [{ type: "run", name: "send_kitchen_note" }] });
    },
  },
  {
    id: "carousel",
    actor: "Assistant",
    title: "Pictures, when they help",
    says: ["The week's specials as a swipeable carousel. Images go through the same URL policy as links, so the model cannot pull in arbitrary remote pictures."],
    components: ["Carousel", "Image", "TextContent"],
    program: PROGRAM.carousel,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true, followupReply: true, noteResult: true, carousel: true };
      state.modalOpen = false;
      if (!state.noteResult) {
        state.noteResult = "sent";
        state.noteTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
    },
  },
  {
    id: "program",
    actor: "Guide",
    title: "The program behind the screen",
    says: [
      "Everything you just watched came from a program about this long. The model writes it; the canvas parses, validates it against the component library, and renders it. Unknown components and unsafe URLs are rejected before they reach the DOM.",
    ],
    components: ["CodeBlock"],
    program: PROGRAM.root,
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true, followupReply: true, noteResult: true, carousel: true, code: true };
      state.program = [
        PROGRAM.header, PROGRAM.summary, PROGRAM.kpis, PROGRAM.charts, PROGRAM.table, PROGRAM.alert,
        PROGRAM.sources, PROGRAM.form, PROGRAM.steps, PROGRAM.accordion, PROGRAM.followups, PROGRAM.carousel, PROGRAM.root,
      ].join("\n\n");
    },
  },
  {
    id: "done",
    actor: "Guide",
    title: "That's the whole surface",
    says: [
      "Every component family appeared at least once, in the order a real answer would use it. The list on the canvas names them.",
      "To poke at individual components, use the galleries from the home page. To see the raw event stream that produces a screen like this, open the stream lab.",
    ],
    components: ["ListBlock"],
    apply(state) {
      state.show = { header: true, summary: true, kpis: true, charts: true, table: true, alert: true, sources: true, form: true, tool: true, steps: true, accordion: true, followups: true, followupReply: true, noteResult: true, carousel: true, code: true, recap: true };
    },
  },
];

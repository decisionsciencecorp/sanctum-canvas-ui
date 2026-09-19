/**
 * Live sample vnodes for every catalog component name.
 * Lab only — not imported by the runtime. Each entry either paints itself
 * or is shown inside the parent a human would actually see.
 */
const LAB_IMG = "./lab-image.svg";

const cartesian = {
  labels: ["Mon", "Tue", "Wed", "Thu"],
  series: [
    { category: "Views", values: [12, 18, 14, 22] },
    { category: "Clicks", values: [3, 5, 4, 7] },
  ],
  xLabel: "Day",
  yLabel: "Count",
  height: 180,
};

const slices = {
  labels: ["Alpha", "Beta", "Gamma"],
  values: [40, 35, 25],
};

/**
 * @typedef {{ vnode: object, note?: string }} Demo
 */

/** @type {Record<string, () => Demo>} */
const DEMOS = {
  Stack: () => ({
    vnode: {
      type: "Stack",
      id: "d-stack-root",
      props: { direction: "column", gap: "l" },
      children: [
        {
          type: "TextContent",
          id: "d-stack-row-label",
          props: {
            text: "Row — children sit side by side with a gap (wrap if the row is narrow):",
            variant: "clear",
            size: "sm",
          },
        },
        {
          type: "Stack",
          id: "d-stack-row",
          props: { direction: "row", gap: "m", wrap: true, align: "stretch" },
          children: [
            {
              type: "Callout",
              id: "d-stack-a",
              props: { title: "A", description: "First child", variant: "info" },
            },
            {
              type: "Callout",
              id: "d-stack-b",
              props: { title: "B", description: "Second child", variant: "success" },
            },
            {
              type: "Callout",
              id: "d-stack-c",
              props: { title: "C", description: "Third child", variant: "warning" },
            },
          ],
        },
        {
          type: "TextContent",
          id: "d-stack-col-label",
          props: {
            text: "Column — children stack top to bottom (the default):",
            variant: "clear",
            size: "sm",
          },
        },
        {
          type: "Stack",
          id: "d-stack-col",
          props: { direction: "column", gap: "s" },
          children: [
            { type: "Tag", id: "d-stack-t1", props: { text: "Top", variant: "info" } },
            { type: "Tag", id: "d-stack-t2", props: { text: "Middle", variant: "success" } },
            { type: "Tag", id: "d-stack-t3", props: { text: "Bottom", variant: "warning" } },
          ],
        },
      ],
    },
    note: "Stack has no look of its own — it only arranges children (row/column, gap, wrap, align). Plain text children make that hard to see; the samples below use Callouts and Tags so the layout is obvious.",
  }),

  Card: () => ({
    vnode: {
      type: "Card",
      id: "d-card",
      props: {
        variant: "card",
        sources: [
          { title: "Example source", sourceName: "example.com", url: "https://example.com/" },
        ],
      },
      children: [
        { type: "CardHeader", id: "d-ch", props: { title: "Card title", subtitle: "With a sources strip" } },
        {
          type: "TextContent",
          id: "d-cc",
          props: { text: "Card body. Sources appear below when the chat catalog is in use.", variant: "clear" },
        },
      ],
    },
  }),

  CardHeader: () => ({
    vnode: {
      type: "Card",
      id: "d-cardheader-wrap",
      props: { variant: "card" },
      children: [
        { type: "CardHeader", id: "d-cardheader", props: { title: "CardHeader", subtitle: "Title + optional subtitle" } },
      ],
    },
    note: "Shown on a Card — that is where headers belong.",
  }),

  TextContent: () => ({
    vnode: {
      type: "TextContent",
      id: "d-tc",
      props: { text: "TextContent sunk block — the usual paragraph.", variant: "sunk", size: "md" },
    },
  }),

  MarkDownRenderer: () => ({
    vnode: {
      type: "MarkDownRenderer",
      id: "d-md",
      props: {
        textMarkdown:
          "**Markdown block.** Bold, _italic_, `code`, a [link](https://example.com), and a list:\n\n- first\n- second",
        variant: "card",
      },
    },
  }),

  Callout: () => ({
    vnode: {
      type: "Callout",
      id: "d-callout",
      props: { title: "Callout", description: "Status notice for operators.", variant: "info" },
    },
  }),

  TextCallout: () => ({
    vnode: {
      type: "TextCallout",
      id: "d-tco",
      props: { title: "TextCallout", description: "Highlight callout for operators.", variant: "info" },
    },
  }),

  Image: () => ({
    vnode: {
      type: "Image",
      id: "d-img",
      props: { src: LAB_IMG, alt: "Lab placeholder", aspectRatio: "16:9", scale: "fill" },
    },
  }),

  ImageBlock: () => ({
    vnode: {
      type: "ImageBlock",
      id: "d-imgb",
      props: { src: LAB_IMG, alt: "Lab image block" },
    },
  }),

  ImageGallery: () => ({
    vnode: {
      type: "ImageGallery",
      id: "d-gallery",
      props: {
        images: [
          { src: LAB_IMG, alt: "One" },
          { src: LAB_IMG, alt: "Two" },
          { src: LAB_IMG, alt: "Three" },
          { src: LAB_IMG, alt: "Four" },
        ],
      },
    },
  }),

  CodeBlock: () => ({
    vnode: {
      type: "CodeBlock",
      id: "d-code",
      props: { language: "javascript", codeString: "const ready = true;\nconsole.log(ready);" },
    },
  }),

  InlineHeader: () => ({
    vnode: {
      type: "InlineHeader",
      id: "d-ih",
      props: { heading: "Inline header", description: "Secondary line under the heading" },
    },
  }),

  Separator: () => ({
    vnode: {
      type: "Stack",
      id: "d-sep-wrap",
      props: { direction: "column", gap: "s" },
      children: [
        { type: "Text", id: "d-sep-a", props: { text: "Above the rule" } },
        { type: "Separator", id: "d-sep", props: {} },
        { type: "Text", id: "d-sep-b", props: { text: "Below the rule" } },
      ],
    },
  }),

  Table: () => ({
    vnode: {
      type: "Table",
      id: "d-table",
      props: {
        columns: [
          { label: "Name", data: ["Ada", "Otto", "Mark"], type: "string", sortable: true },
          { label: "Score", data: [12, 9, 15], type: "number", align: "right", sortable: true },
          { label: "Role", data: ["Engineer", "Agent", "Lead"], type: "string" },
        ],
      },
    },
  }),

  Col: () => ({
    vnode: {
      type: "Table",
      id: "d-col-wrap",
      props: {
        columns: [
          { label: "Col A", data: ["One", "Two"], type: "string" },
          { label: "Col B", data: [1, 2], type: "number", align: "right" },
        ],
      },
    },
    note: "Col is a table column contract. Shown as a Table that uses two columns.",
  }),

  EditableTable: () => ({
    vnode: {
      type: "EditableTable",
      id: "d-editable",
      props: {
        name: "people",
        columns: [
          { type: "text", key: "name", header: "Name" },
          { type: "number", key: "age", header: "Age" },
          {
            type: "select",
            key: "role",
            header: "Role",
            options: [
              { value: "eng", label: "Engineer" },
              { value: "ops", label: "Ops" },
            ],
          },
        ],
        data: [
          { id: "r1", values: ["Ada", 36, "eng"] },
          { id: "r2", values: ["Otto", 1, "ops"] },
        ],
      },
    },
  }),

  BarChart: () => ({
    vnode: { type: "BarChart", id: "d-bar", props: { ...cartesian, title: "BarChart" } },
  }),
  LineChart: () => ({
    vnode: { type: "LineChart", id: "d-line", props: { ...cartesian, title: "LineChart", variant: "linear" } },
  }),
  AreaChart: () => ({
    vnode: { type: "AreaChart", id: "d-area", props: { ...cartesian, title: "AreaChart" } },
  }),
  HorizontalBarChart: () => ({
    vnode: { type: "HorizontalBarChart", id: "d-hbar", props: { ...cartesian, title: "HorizontalBarChart" } },
  }),
  RadarChart: () => ({
    vnode: {
      type: "RadarChart",
      id: "d-radar",
      props: {
        title: "RadarChart",
        labels: ["Speed", "Reliability", "UX", "Cost"],
        series: [{ category: "Model A", values: [4, 3, 5, 4] }],
        height: 200,
      },
    },
  }),
  PieChart: () => ({
    vnode: { type: "PieChart", id: "d-pie", props: { ...slices, title: "PieChart" } },
  }),
  RadialChart: () => ({
    vnode: { type: "RadialChart", id: "d-radial", props: { ...slices, title: "RadialChart", height: 160 } },
  }),
  SingleStackedBarChart: () => ({
    vnode: { type: "SingleStackedBarChart", id: "d-ssb", props: { ...slices, title: "SingleStackedBarChart" } },
  }),
  ScatterChart: () => ({
    vnode: {
      type: "ScatterChart",
      id: "d-scatter",
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
        height: 180,
      },
    },
  }),

  Series: () => ({
    vnode: {
      type: "BarChart",
      id: "d-series-wrap",
      props: {
        title: "BarChart (Series is the language for these rows)",
        labels: ["A", "B", "C"],
        series: [
          { category: "One", values: [4, 7, 5] },
          { category: "Two", values: [2, 3, 6] },
        ],
        height: 160,
      },
    },
    note: "Series is chart data, not a box on the page. Shown inside a BarChart.",
  }),

  Slice: () => ({
    vnode: {
      type: "PieChart",
      id: "d-slice-wrap",
      props: {
        title: "PieChart using Slice",
        labels: ["A", "B", "C"],
        values: [40, 35, 25],
        height: 160,
      },
    },
    note: "Slice is pie/radial data. Shown inside a PieChart.",
  }),

  ScatterSeries: () => ({
    vnode: DEMOS.ScatterChart().vnode,
    note: "ScatterSeries is scatter data. Shown inside a ScatterChart.",
  }),

  Point: () => ({
    vnode: DEMOS.ScatterChart().vnode,
    note: "Point is a single (x, y) in a ScatterSeries. Shown inside a ScatterChart.",
  }),

  Form: () => ({
    vnode: {
      type: "Form",
      id: "d-form",
      props: {
        name: "catalog-contact",
        fields: [
          {
            type: "FormControl",
            id: "d-fc-name",
            props: {
              label: "Full name",
              hint: "As on your badge",
              input: {
                type: "Input",
                props: { name: "fullName", placeholder: "Ada Lovelace", defaultValue: "Ada Lovelace" },
              },
            },
          },
          {
            type: "FormControl",
            id: "d-fc-notes",
            props: {
              label: "Notes",
              input: {
                type: "TextArea",
                props: { name: "notes", placeholder: "Optional", defaultValue: "Sample notes." },
              },
            },
          },
        ],
        buttons: [
          {
            type: "Buttons",
            id: "d-form-btns",
            props: {
              direction: "row",
              buttons: [
                { type: "Button", id: "d-sub", props: { label: "Save", variant: "primary" } },
                { type: "Button", id: "d-rst", props: { label: "Reset", variant: "secondary" } },
              ],
            },
          },
        ],
      },
    },
  }),

  FormControl: () => ({
    vnode: {
      type: "FormControl",
      id: "d-fc",
      props: {
        label: "Email",
        hint: "We will not spam you",
        input: {
          type: "Input",
          props: { name: "email", type: "email", placeholder: "ada@example.com", defaultValue: "ada@example.com" },
        },
      },
    },
  }),

  Label: () => ({
    vnode: {
      type: "FormControl",
      id: "d-label-wrap",
      props: {
        label: "This is the Label",
        input: { type: "Input", props: { name: "labeled", placeholder: "…" } },
      },
    },
    note: "Label rides on FormControl. Shown as a labeled input.",
  }),

  Input: () => ({
    vnode: {
      type: "Input",
      id: "d-input",
      props: { name: "solo-input", placeholder: "Type here", defaultValue: "Sample input" },
    },
  }),

  TextArea: () => ({
    vnode: {
      type: "TextArea",
      id: "d-textarea",
      props: { name: "solo-area", placeholder: "Longer text", defaultValue: "A few lines of sample text." },
    },
  }),

  Select: () => ({
    vnode: {
      type: "Select",
      id: "d-select",
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
  }),

  SelectItem: () => ({
    vnode: DEMOS.Select().vnode,
    note: "SelectItem is one option in a Select. Shown as a Select.",
  }),

  DatePicker: () => ({
    vnode: {
      type: "DatePicker",
      id: "d-date",
      props: { name: "start", defaultValue: "2026-09-18" },
    },
  }),

  Slider: () => ({
    vnode: {
      type: "Slider",
      id: "d-slider",
      props: { name: "priority", min: 0, max: 100, defaultValue: 60 },
    },
  }),

  CheckBoxGroup: () => ({
    vnode: {
      type: "CheckBoxGroup",
      id: "d-cb",
      props: {
        name: "features",
        items: [
          { name: "analytics", label: "Analytics", defaultChecked: true },
          { name: "alerts", label: "Alerts" },
        ],
      },
    },
  }),
  CheckBoxItem: () => ({
    vnode: DEMOS.CheckBoxGroup().vnode,
    note: "CheckBoxItem is one row in a CheckBoxGroup.",
  }),

  RadioGroup: () => ({
    vnode: {
      type: "RadioGroup",
      id: "d-rg",
      props: {
        name: "tier",
        defaultValue: "pro",
        items: [
          { value: "basic", label: "Basic" },
          { value: "pro", label: "Pro" },
        ],
      },
    },
  }),
  RadioItem: () => ({
    vnode: DEMOS.RadioGroup().vnode,
    note: "RadioItem is one choice in a RadioGroup.",
  }),

  SwitchGroup: () => ({
    vnode: {
      type: "SwitchGroup",
      id: "d-sw",
      props: {
        name: "flags",
        items: [
          { name: "dark", label: "Dark mode", defaultChecked: false },
          { name: "compact", label: "Compact", defaultChecked: true },
        ],
      },
    },
  }),
  SwitchItem: () => ({
    vnode: DEMOS.SwitchGroup().vnode,
    note: "SwitchItem is one row in a SwitchGroup.",
  }),

  Chips: () => ({
    vnode: {
      type: "Chips",
      id: "d-chips",
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
  }),
  ChipItem: () => ({
    vnode: DEMOS.Chips().vnode,
    note: "ChipItem is one chip in a Chips group.",
  }),

  OptionCards: () => ({
    vnode: {
      type: "OptionCards",
      id: "d-opts",
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
  }),
  OptionCard: () => ({
    vnode: DEMOS.OptionCards().vnode,
    note: "OptionCard is one card in OptionCards.",
  }),

  Button: () => ({
    vnode: {
      type: "Button",
      id: "d-btn",
      props: { label: "Primary button", variant: "primary" },
    },
  }),

  Buttons: () => ({
    vnode: {
      type: "Buttons",
      id: "d-buttons",
      props: {
        direction: "row",
        buttons: [
          { type: "Button", id: "d-b1", props: { label: "Primary", variant: "primary" } },
          { type: "Button", id: "d-b2", props: { label: "Secondary", variant: "secondary" } },
          { type: "Button", id: "d-b3", props: { label: "Tertiary", variant: "tertiary" } },
        ],
      },
    },
  }),

  IconButton: () => ({
    vnode: {
      type: "IconButton",
      id: "d-ico-btn",
      props: { name: "More actions", icon: "⋯", variant: "secondary" },
    },
  }),

  Tabs: () => ({
    vnode: {
      type: "Tabs",
      id: "d-tabs",
      props: {
        variant: "clear",
        items: [
          { value: "one", trigger: "One", content: ["First panel."] },
          { value: "two", trigger: "Two", content: ["Second panel."] },
          { value: "three", trigger: "Three", content: ["Third panel."] },
        ],
      },
    },
  }),
  TabItem: () => ({
    vnode: DEMOS.Tabs().vnode,
    note: "TabItem is one tab. Shown as a Tabs control.",
  }),

  Accordion: () => ({
    vnode: {
      type: "Accordion",
      id: "d-acc",
      props: {
        variant: "card",
        items: [
          { value: "one", trigger: "Section one", content: ["Accordion panel one."] },
          { value: "two", trigger: "Section two", content: ["Accordion panel two."] },
        ],
      },
    },
  }),
  AccordionItem: () => ({
    vnode: DEMOS.Accordion().vnode,
    note: "AccordionItem is one section. Shown as an Accordion.",
  }),

  Steps: () => ({
    vnode: {
      type: "Steps",
      id: "d-steps",
      props: {
        items: [
          { title: "Gather", details: "Collect inputs" },
          { title: "Review", details: "Check the draft" },
          { title: "Ship", details: "Send it" },
        ],
      },
    },
  }),
  StepsItem: () => ({
    vnode: DEMOS.Steps().vnode,
    note: "StepsItem is one step. Shown as a Steps control.",
  }),

  Carousel: () => ({
    vnode: {
      type: "Carousel",
      id: "d-carousel",
      props: {
        variant: "card",
        children: [
          [
            { type: "Text", id: "d-c1a", props: { text: "Slide 1" } },
            { type: "TextContent", id: "d-c1b", props: { text: "First slide body.", variant: "clear" } },
          ],
          [
            { type: "Text", id: "d-c2a", props: { text: "Slide 2" } },
            { type: "TextContent", id: "d-c2b", props: { text: "Second slide body.", variant: "clear" } },
          ],
          [
            { type: "Text", id: "d-c3a", props: { text: "Slide 3" } },
            { type: "TextContent", id: "d-c3b", props: { text: "Third slide body.", variant: "clear" } },
          ],
        ],
      },
    },
  }),

  Modal: () => ({
    vnode: {
      type: "Modal",
      id: "d-modal",
      props: {
        title: "Sample dialog",
        open: false,
        size: "md",
        children: [
          {
            type: "TextContent",
            id: "d-modal-body",
            props: { text: "Modal body. Use Open sample below to show it.", variant: "clear" },
          },
        ],
      },
    },
    note: "Dialog stays closed until you open it — otherwise it covers the page.",
  }),

  TagBlock: () => ({
    vnode: {
      type: "TagBlock",
      id: "d-tagblock",
      props: {
        tags: [
          { text: "Alpha", variant: "neutral" },
          { text: "Beta", variant: "success" },
          { text: "Gamma", variant: "info" },
        ],
      },
    },
  }),

  Tag: () => ({
    vnode: {
      type: "Stack",
      id: "d-tags",
      props: { direction: "row", gap: "s", wrap: true },
      children: [
        { type: "Tag", id: "d-t1", props: { text: "neutral" } },
        { type: "Tag", id: "d-t2", props: { text: "info", variant: "info" } },
        { type: "Tag", id: "d-t3", props: { text: "success", variant: "success" } },
        { type: "Tag", id: "d-t4", props: { text: "warning", variant: "warning" } },
        { type: "Tag", id: "d-t5", props: { text: "danger", variant: "danger" } },
      ],
    },
  }),

  Icon: () => ({
    vnode: {
      type: "Icon",
      id: "d-icon",
      props: { name: "circle-check", category: "status" },
    },
  }),

  EntityList: () => ({
    vnode: {
      type: "EntityList",
      id: "d-ents",
      props: {
        header: { left: "Agent", right: "Lane" },
        rows: [
          { left: "Ada", right: "Infra" },
          { left: "Otto", right: "Build" },
        ],
      },
    },
  }),

  ListBlock: () => ({
    vnode: {
      type: "ListBlock",
      id: "d-list",
      props: {
        variant: "number",
        items: [
          { title: "First item", subtitle: "Detail A" },
          { title: "Second item", subtitle: "Detail B" },
          { title: "Third item" },
        ],
      },
    },
  }),
  ListItem: () => ({
    vnode: DEMOS.ListBlock().vnode,
    note: "ListItem is one row in a ListBlock.",
  }),

  FollowUpBlock: () => ({
    vnode: {
      type: "FollowUpBlock",
      id: "d-followups",
      props: {
        items: [
          { text: "How does this compare with August?" },
          { text: "Which shifts were short-staffed?" },
          { text: "Draft a note to the kitchen" },
        ],
      },
    },
  }),
  FollowUpItem: () => ({
    vnode: DEMOS.FollowUpBlock().vnode,
    note: "FollowUpItem is one chip. Shown as a FollowUpBlock.",
  }),

  SectionBlock: () => ({
    vnode: {
      type: "SectionBlock",
      id: "d-section",
      props: {
        sections: [
          { value: "overview", trigger: "Overview", content: "Overview body." },
          { value: "details", trigger: "Details", content: "Details body." },
        ],
      },
    },
  }),
  SectionItem: () => ({
    vnode: DEMOS.SectionBlock().vnode,
    note: "SectionItem is one section. Shown as a SectionBlock.",
  }),

  Text: () => ({
    vnode: { type: "Text", id: "d-text", props: { text: "Plain Text — short label" } },
  }),
  BoldText: () => ({
    vnode: { type: "BoldText", id: "d-bold", props: { text: "BoldText — emphasized" } },
  }),
  IconText: () => ({
    vnode: {
      type: "IconText",
      id: "d-icontext",
      props: { icon: "package", title: "IconText", subtitle: "icon + title + subtitle" },
    },
  }),
  ImageText: () => ({
    vnode: {
      type: "ImageText",
      id: "d-imagetext",
      props: { src: LAB_IMG, alt: "Thumb", title: "ImageText", subtitle: "thumbnail + title" },
    },
  }),
  ImageTextLarge: () => ({
    vnode: {
      type: "ImageTextLarge",
      id: "d-imagetext-large",
      props: {
        src: LAB_IMG,
        alt: "Banner",
        title: "ImageTextLarge",
        subtitle: "full-width banner above a bold title",
      },
    },
  }),
  MetricIndicatorInline: () => ({
    vnode: {
      type: "MetricIndicatorInline",
      id: "d-metric-inline",
      props: {
        value: "$18,420",
        subtext: "sales this week",
        trend: { direction: "up", value: 12 },
      },
    },
  }),
  MetricIndicatorWithStrikethrough: () => ({
    vnode: {
      type: "MetricIndicatorWithStrikethrough",
      id: "d-metric-strike",
      props: {
        value: "$34",
        previousValue: "$42",
        subtext: "average ticket",
        trend: { direction: "down", value: 19 },
      },
    },
  }),

  SnippetCardBlock: () => ({
    vnode: {
      type: "SnippetCardBlock",
      id: "d-snippet",
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
  }),
  SnippetCardItem: () => ({
    vnode: DEMOS.SnippetCardBlock().vnode,
    note: "SnippetCardItem is one cell. Shown as a SnippetCardBlock.",
  }),

  OverviewCardBlock: () => ({
    vnode: {
      type: "OverviewCardBlock",
      id: "d-overview",
      props: {
        layout: "grid",
        items: [
          {
            top: { type: "Text", props: { text: "Revenue" } },
            bottom: {
              type: "MetricIndicatorInline",
              props: { value: "$12k", trend: { direction: "up", value: 4 } },
            },
          },
          {
            top: { type: "Text", props: { text: "Users" } },
            bottom: {
              type: "MetricIndicatorInline",
              props: { value: "820", trend: { direction: "down", value: 2 } },
            },
          },
        ],
      },
    },
  }),
  OverviewCardItem: () => ({
    vnode: DEMOS.OverviewCardBlock().vnode,
    note: "OverviewCardItem is one metric card. Shown as an OverviewCardBlock.",
  }),

  ContextCardBlock: () => ({
    vnode: {
      type: "ContextCardBlock",
      id: "d-context",
      props: {
        items: [
          {
            title: "Context",
            body: "Operator-facing summary.",
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Lab texture",
          },
          {
            title: "Follow-up",
            body: "Second card (blocks need at least two).",
            bgImageSrc: LAB_IMG,
            bgImageAlt: "Lab texture 2",
          },
        ],
      },
    },
  }),
  ContextCardItem: () => ({
    vnode: DEMOS.ContextCardBlock().vnode,
    note: "ContextCardItem is one card. Shown as a ContextCardBlock.",
  }),

  CompositeCardBlock: () => ({
    vnode: {
      type: "CompositeCardBlock",
      id: "d-composite",
      props: {
        items: [
          {
            header: { type: "IconText", props: { icon: "📦", title: "Kit" } },
            body: [
              { type: "Text", props: { text: "Includes tools" } },
              { type: "TagBlock", props: { tags: [{ text: "new" }] } },
            ],
            footer: { price: { type: "BoldText", props: { text: "$40" } } },
          },
          {
            header: { type: "IconText", props: { icon: "🧰", title: "Pro" } },
            body: [
              { type: "Text", props: { text: "Includes more" } },
              { type: "TagBlock", props: { tags: [{ text: "pro" }] } },
            ],
            footer: { price: { type: "BoldText", props: { text: "$90" } } },
          },
        ],
      },
    },
  }),
  CompositeCardItem: () => ({
    vnode: DEMOS.CompositeCardBlock().vnode,
    note: "CompositeCardItem is one product-style card. Shown as a CompositeCardBlock.",
  }),

  VisualCardBlock: () => ({
    vnode: {
      type: "VisualCardBlock",
      id: "d-visual",
      props: {
        items: [
          { body: { type: "BoldText", props: { text: "Trail" } }, bgImageSrc: LAB_IMG, bgImageAlt: "Trail" },
          { body: { type: "BoldText", props: { text: "Lake" } }, bgImageSrc: LAB_IMG, bgImageAlt: "Lake" },
        ],
      },
    },
  }),
  VisualCardItem: () => ({
    vnode: DEMOS.VisualCardBlock().vnode,
    note: "VisualCardItem is one image card. Shown as a VisualCardBlock.",
  }),
};

/**
 * @param {string} name
 * @returns {Demo | null}
 */
export function demoFor(name) {
  const factory = DEMOS[name];
  if (!factory) return null;
  return factory();
}

/** Every catalog name that has a live sample (for tests / smoke). */
export function demoNames() {
  return Object.keys(DEMOS).sort();
}

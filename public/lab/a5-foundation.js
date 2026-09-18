/**
 * A5.8 lab — mount every foundation family for Playwright screenshots.
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { registerFoundation } from "../assets/js/components/registerFoundation.js";
import { registerContent } from "../assets/js/components/content/registerContent.js";
import { registerContainers } from "../assets/js/components/containers/registerContainers.js";
import { registerSectionSteps } from "../assets/js/components/containers/registerSectionSteps.js";
import { registerCarouselModal } from "../assets/js/components/containers/registerCarouselModal.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";

/** Same-origin lab image (urlPolicy blocks data: — H4). */
const LAB_IMG = "./lab-image.svg";

const Text = {
  create(props = {}, ctx = {}) {
    const el = (ctx.document ?? document).createElement("span");
    el.setAttribute("data-canvas-component", "Text");
    el.setAttribute("class", "lab-stub-text");
    const fromProps = props.text ?? props.content;
    if (fromProps != null && fromProps !== "") {
      el.textContent = String(fromProps);
    }
    return el;
  },
  update(el, props = {}) {
    const fromProps = props.text ?? props.content;
    if (fromProps != null && fromProps !== "") {
      el.textContent = String(fromProps);
    }
  },
  destroy() {},
  // Reconciler appends vnode string children; do not wipe them on empty props.
  ownsChildren: false,
};

const registry = createComponentRegistry();
registerFoundation(registry);
registerContent(registry);
registerContainers(registry);
registerSectionSteps(registry);
registerCarouselModal(registry);
registry.register("Text", Text);

const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
});

function mount(id, vnode) {
  const host = document.getElementById(id);
  if (!host) throw new Error(`missing mount #${id}`);
  render(host, vnode, ctx);
}

mount("mount-stack", {
  type: "Stack",
  id: "lab-stack",
  props: { direction: "row", gap: "l", align: "center", wrap: true },
  children: [
    { type: "Text", id: "sa", children: ["Stack A"] },
    { type: "Text", id: "sb", children: ["Stack B"] },
    { type: "Text", id: "sc", children: ["Stack C"] },
  ],
});

mount("mount-card", {
  type: "Card",
  id: "lab-card",
  props: { variant: "card" },
  children: [
    {
      type: "CardHeader",
      id: "card-h",
      props: { title: "Card title", subtitle: "Card subtitle" },
    },
    {
      type: "CardContent",
      id: "card-body",
      children: [
        {
          type: "TextContent",
          id: "card-line",
          props: { text: "Card body line for visual parity.", variant: "clear" },
        },
      ],
    },
    {
      type: "CardSources",
      id: "card-sources",
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
        {
          type: "CardSourcesHeading",
          key: "__sources-heading",
          children: ["Sources"],
        },
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
});

mount("mount-content", {
  type: "Stack",
  id: "content-stack",
  props: { direction: "column", gap: "m" },
  children: [
    {
      type: "InlineHeader",
      id: "ih",
      props: { heading: "Inline header", description: "Secondary line" },
    },
    {
      type: "TextContent",
      id: "tc",
      props: {
        text: "TextContent sunk block — foundation paragraph.",
        variant: "sunk",
        size: "md",
      },
    },
    {
      type: "TextCallout",
      id: "tco",
      props: {
        title: "TextCallout",
        description: "Highlight callout for operators.",
        variant: "info",
      },
    },
    {
      type: "Callout",
      id: "co",
      props: {
        title: "Callout",
        description: "Status notice for operators.",
        variant: "info",
      },
    },
    { type: "Separator", id: "sep", props: {} },
    {
      type: "TagBlock",
      id: "tags",
      props: {
        tags: [
          { text: "Alpha", variant: "neutral" },
          { text: "Beta", variant: "success" },
          { text: "Gamma", variant: "info" },
        ],
      },
    },
    {
      type: "EntityList",
      id: "ents",
      props: {
        header: { left: "Agent", right: "Lane" },
        rows: [
          { left: "Ada", right: "Infra" },
          { left: "Otto", right: "Build" },
        ],
      },
    },
    {
      type: "MetricIndicator",
      id: "met",
      props: {
        value: "12",
        subtext: "Open tasks",
        previousValue: "9",
        trend: { direction: "up", value: 33 },
      },
    },
  ],
});

mount("mount-lists-code-images", {
  type: "Stack",
  id: "media-stack",
  props: { direction: "column", gap: "l" },
  children: [
    {
      type: "ListBlock",
      id: "list",
      props: {
        variant: "number",
        items: [
          { title: "First item", subtitle: "Detail A" },
          { title: "Second item", subtitle: "Detail B" },
          { title: "Third item" },
        ],
      },
    },
    {
      type: "CodeBlock",
      id: "code",
      props: {
        language: "javascript",
        codeString: "const parity = true;\nconsole.log(parity);",
      },
    },
    {
      type: "Image",
      id: "img",
      props: {
        src: LAB_IMG,
        alt: "Lab placeholder image",
        aspectRatio: "16:9",
        scale: "fill",
      },
    },
    {
      type: "ImageBlock",
      id: "imgb",
      props: {
        src: LAB_IMG,
        alt: "Lab image block",
      },
    },
  ],
});

mount("mount-tabs", {
  type: "Tabs",
  id: "lab-tabs",
  props: {
    variant: "clear",
    items: [
      {
        value: "line",
        trigger: "Line",
        content: ["Line panel body for visual parity."],
      },
      {
        value: "bar",
        trigger: "Bar",
        content: ["Bar panel body."],
      },
      {
        value: "area",
        trigger: "Area",
        content: ["Area panel body."],
      },
    ],
  },
});

mount("mount-accordion", {
  type: "Accordion",
  id: "lab-acc",
  props: {
    variant: "card",
    items: [
      {
        value: "one",
        trigger: "Section one",
        content: ["Accordion panel one content."],
      },
      {
        value: "two",
        trigger: "Section two",
        content: ["Accordion panel two content."],
      },
    ],
  },
});

mount("mount-section", {
  type: "SectionBlock",
  id: "lab-section",
  props: {
    sections: [
      { value: "overview", trigger: "Overview", content: "Overview body." },
      { value: "details", trigger: "Details", content: "Details body." },
    ],
  },
});

mount("mount-steps", {
  type: "Steps",
  id: "lab-steps",
  props: {
    items: [
      { title: "Gather", details: "Collect inputs" },
      { title: "Review", details: "Check parity" },
      { title: "Ship", details: "Close A5" },
    ],
  },
});

mount("mount-carousel", {
  type: "Carousel",
  id: "lab-carousel",
  props: {
    variant: "card",
    children: [
      [
        { type: "Text", id: "c1a", children: ["Slide 1"] },
        { type: "Text", id: "c1b", children: ["Alpha detail"] },
      ],
      [
        { type: "Text", id: "c2a", children: ["Slide 2"] },
        { type: "Text", id: "c2b", children: ["Beta detail"] },
      ],
      [
        { type: "Text", id: "c3a", children: ["Slide 3"] },
        { type: "Text", id: "c3b", children: ["Gamma detail"] },
      ],
    ],
  },
});

/** Modal stays closed so the rest of the gallery can be used. */
let modalOpen = false;

function renderModal() {
  mount("mount-modal", {
    type: "Modal",
    id: "lab-modal",
    props: {
      title: "Lab dialog",
      open: {
        get: () => modalOpen,
        set: (v) => {
          modalOpen = !!v;
          renderModal();
        },
      },
      size: "md",
      children: [
        {
          type: "Text",
          id: "mbody",
          children: ["Modal body content for open-state parity."],
        },
      ],
    },
  });
}

renderModal();

document.getElementById("open-lab-modal")?.addEventListener("click", () => {
  modalOpen = true;
  renderModal();
});

const status = document.getElementById("status");
// Modal may defer showModal until after reconciler insert (microtask).
queueMicrotask(() => {
  if (status) {
    status.textContent = "Mounted A5 foundation families.";
    status.setAttribute("data-lab-ready", "1");
  }
});

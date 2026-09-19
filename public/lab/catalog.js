/**
 * Catalog page — renders the two library.v1.json files the host hands the
 * model. Lab chrome only; nothing here is imported by the runtime.
 */
import { loadLibraryJson } from "../assets/js/lang/contractLoader.js";

const URLS = {
  dashboard: "/assets/libraries/dashboard/library.v1.json",
  chat: "/assets/libraries/chat/library.v1.json",
};

const NOTE = {
  dashboard:
    "Dashboard replies start with a Stack and may lay things out in rows, columns, tabs, and dialogs. This is what the stream lab and the walkthrough use.",
  chat: "Chat replies start with a Card and stack top to bottom. It adds follow-up questions and collapsible sections and drops the free-form layout pieces.",
};

/** Where a human can see each component drawn. Regenerate with tools/build-library-manifests.mjs helpers if pages move. */
const SHOWN_AT = {
  Card: ["a5-stack-card.html", "a5-foundation.html"],
  Stack: ["a5-stack-card.html", "a5-foundation.html"],
  Text: ["a6-library.html#family-card-blocks", "a5-foundation.html"],
  CardHeader: ["a5-foundation.html"],
  TextContent: ["a5-foundation.html"],
  Callout: ["a5-foundation.html"],
  TextCallout: ["a5-foundation.html"],
  Image: ["a5-foundation.html"],
  ImageBlock: ["a5-foundation.html"],
  CodeBlock: ["a5-foundation.html"],
  InlineHeader: ["a5-foundation.html"],
  Tabs: ["a5-foundation.html"],
  Accordion: ["a5-foundation.html"],
  Steps: ["a5-foundation.html"],
  Carousel: ["a5-carousel-modal.html", "a5-foundation.html"],
  Separator: ["a5-foundation.html"],
  TagBlock: ["a5-foundation.html", "a6-library.html#family-card-blocks"],
  EntityList: ["a5-foundation.html"],
  ListBlock: ["a5-foundation.html"],
  Modal: ["a5-carousel-modal.html", "a5-foundation.html"],
  SectionBlock: ["a5-foundation.html"],
  MarkDownRenderer: ["a6-library.html#family-small-parts"],
  ImageGallery: ["a6-library.html#family-image-gallery"],
  Table: ["a6-library.html#family-table"],
  EditableTable: ["a6-library.html#family-editable-table"],
  BarChart: ["a6-library.html#family-charts"],
  LineChart: ["a6-library.html#family-charts"],
  AreaChart: ["a6-library.html#family-charts"],
  RadarChart: ["a6-library.html#family-charts"],
  HorizontalBarChart: ["a6-library.html#family-charts"],
  PieChart: ["a6-library.html#family-charts"],
  RadialChart: ["a6-library.html#family-charts"],
  SingleStackedBarChart: ["a6-library.html#family-charts"],
  ScatterChart: ["a6-library.html#family-charts"],
  Form: ["a6-library.html#family-forms"],
  FormControl: ["a6-library.html#family-forms"],
  Input: ["a6-library.html#family-forms"],
  TextArea: ["a6-library.html#family-forms"],
  Select: ["a6-library.html#family-forms"],
  DatePicker: ["a6-library.html#family-forms"],
  Slider: ["a6-library.html#family-forms"],
  CheckBoxGroup: ["a6-library.html#family-selection"],
  RadioGroup: ["a6-library.html#family-selection"],
  SwitchGroup: ["a6-library.html#family-selection"],
  Chips: ["a6-library.html#family-selection"],
  OptionCards: ["a6-library.html#family-selection"],
  Button: ["a6-library.html#family-buttons"],
  Buttons: ["a6-library.html#family-buttons"],
  IconButton: ["a6-library.html#family-buttons"],
  Tag: ["a6-library.html#family-small-parts"],
  Icon: ["a6-library.html#family-small-parts"],
  BoldText: ["a6-library.html#family-card-blocks"],
  IconText: ["a6-library.html#family-small-parts", "a6-library.html#family-card-blocks"],
  ImageText: ["a6-library.html#family-small-parts"],
  ImageTextLarge: ["a6-library.html#family-small-parts"],
  MetricIndicatorInline: ["a6-library.html#family-small-parts"],
  MetricIndicatorWithStrikethrough: ["a6-library.html#family-small-parts"],
  SnippetCardBlock: ["a6-library.html#family-card-blocks"],
  OverviewCardBlock: ["a6-library.html#family-card-blocks"],
  ContextCardBlock: ["a6-library.html#family-card-blocks"],
  CompositeCardBlock: ["a6-library.html#family-card-blocks"],
  VisualCardBlock: ["a6-library.html#family-card-blocks"],
  FollowUpBlock: ["/walkthrough.php"],
};

const PAGE_LABEL = {
  "a5-stack-card.html": "Stack and Card",
  "a5-foundation.html": "Text, cards, and layout",
  "a5-carousel-modal.html": "Carousel and Modal",
  "a6-library.html": "Forms, tables, charts, and buttons",
  "/walkthrough.php": "Guided walkthrough",
};

const $ = (sel) => document.querySelector(sel);
const groupsEl = $("#groups");
const statusEl = $("#status");
const filterEl = $("#filter");
const noteEl = $("#variant-note");

/** @type {Record<string, any>} */
const libraries = {};
let current = "dashboard";

function typeStr(schema) {
  if (!schema || typeof schema !== "object") return "any";
  if (typeof schema.$ref === "string") return schema.$ref.split("/").pop();
  if (Array.isArray(schema.anyOf)) {
    const parts = [...new Set(schema.anyOf.map(typeStr))];
    return parts.join(" | ");
  }
  if (Array.isArray(schema.enum)) return schema.enum.map((v) => `"${v}"`).join(" | ");
  if (schema.type === "array") {
    const inner = schema.items ? typeStr(schema.items) : "any";
    return (inner.includes(" | ") ? `(${inner})` : inner) + "[]";
  }
  return typeof schema.type === "string" ? schema.type : "any";
}

/** Signature: Name(a: string, b?: "x" | "y" = "x") */
function signature(comp) {
  const el = document.createElement("pre");
  el.className = "cat-comp__sig";
  el.append(`${comp.name}(`);
  comp.propertyOrder.forEach((key, i) => {
    const spec = comp.properties[key] || {};
    const required = comp.required.includes(key);
    const span = document.createElement("span");
    if (!required) span.className = "opt";
    let text = `${key}${required ? "" : "?"}: ${typeStr(spec)}`;
    if ("default" in spec) text += ` = ${JSON.stringify(spec.default)}`;
    span.textContent = text;
    if (i > 0) el.append(", ");
    if (comp.propertyOrder.length > 3) el.append(i === 0 ? "\n  " : "\n  ");
    el.append(span);
  });
  if (comp.propertyOrder.length > 3) el.append("\n");
  el.append(")");
  return el;
}

/** Which components mention `name` in a $ref anywhere in their props. */
function parentsOf(lib, name) {
  const out = [];
  const needle = `"$ref":"${name}"`;
  for (const comp of Object.values(lib.components)) {
    if (comp.name === name) continue;
    if (JSON.stringify(comp.properties).includes(needle)) out.push(comp.name);
  }
  return out;
}

function linkList(names) {
  const frag = document.createDocumentFragment();
  names.forEach((n, i) => {
    if (i > 0) frag.append(", ");
    const a = document.createElement("a");
    a.href = `#comp-${n}`;
    a.textContent = n;
    frag.append(a);
  });
  return frag;
}

function pageLinks(name) {
  const pages = SHOWN_AT[name];
  if (!pages || !pages.length) return null;
  const p = document.createElement("p");
  p.className = "cat-comp__where";
  p.append("See it drawn: ");
  pages.forEach((href, i) => {
    if (i > 0) p.append(" · ");
    const a = document.createElement("a");
    a.href = href.startsWith("/") ? href : `./${href}`;
    const base = href.split("#")[0];
    a.textContent = PAGE_LABEL[base] || base;
    p.append(a);
  });
  return p;
}

function renderComponent(lib, comp) {
  const wrap = document.createElement("article");
  wrap.className = "cat-comp";
  wrap.id = `comp-${comp.name}`;
  wrap.dataset.name = comp.name.toLowerCase();
  wrap.dataset.text = `${comp.name} ${comp.prompt?.description || ""} ${comp.propertyOrder.join(" ")}`.toLowerCase();

  const head = document.createElement("div");
  head.className = "cat-comp__head";
  const name = document.createElement("span");
  name.className = "cat-comp__name";
  name.textContent = comp.name;
  head.append(name);
  if (comp.name === lib.root) {
    const b = document.createElement("span");
    b.className = "cat-comp__badge cat-comp__badge--root";
    b.textContent = "every reply starts here";
    head.append(b);
  }
  if (comp.reactiveProps?.length) {
    const b = document.createElement("span");
    b.className = "cat-comp__badge";
    b.textContent = `live: ${comp.reactiveProps.join(", ")}`;
    b.title = "These fields can be bound to state and change after the reply is drawn.";
    head.append(b);
  }
  const caps = (comp.securityCapabilities || []).filter((c) => c !== "none");
  for (const c of caps) {
    const b = document.createElement("span");
    b.className = "cat-comp__badge";
    b.textContent = c === "links" ? "checks URLs" : c === "images" ? "checks images" : c === "markdown" ? "safe markdown" : c === "actions" ? "can run actions" : c;
    head.append(b);
  }
  wrap.append(head);

  const desc = document.createElement("p");
  desc.className = "cat-comp__desc";
  desc.textContent = comp.prompt?.description || "";
  wrap.append(desc);

  wrap.append(signature(comp));

  if (Array.isArray(comp.allowedChildren) && comp.allowedChildren.length) {
    const p = document.createElement("p");
    p.className = "cat-comp__kids";
    if (comp.allowedChildren.length === 1 && comp.allowedChildren[0] === "*") {
      p.textContent = "Can hold: any component in this catalog.";
    } else {
      p.append(`Can hold (${comp.allowedChildren.length}): `);
      p.append(linkList(comp.allowedChildren));
    }
    wrap.append(p);
  }

  const parents = parentsOf(lib, comp.name);
  if (parents.length) {
    const p = document.createElement("p");
    p.className = "cat-comp__kids";
    p.append("Goes inside: ");
    p.append(linkList(parents));
    wrap.append(p);
  }

  const where = pageLinks(comp.name);
  if (where) wrap.append(where);
  return wrap;
}

function renderLibrary(lib) {
  groupsEl.replaceChildren();
  const seen = new Set();
  const groups = Array.isArray(lib.componentGroups) ? lib.componentGroups : [];
  const ordered = [...groups];
  const leftovers = Object.keys(lib.components).filter((n) => !groups.some((g) => g.components.includes(n)));
  if (leftovers.length) ordered.push({ name: "Other", components: leftovers });

  for (const group of ordered) {
    const names = group.components.filter((n) => lib.components[n] && !seen.has(n));
    if (!names.length) continue;
    const section = document.createElement("section");
    section.className = "cat-group";
    section.dataset.group = group.name;
    const h = document.createElement("h2");
    h.textContent = group.name;
    const count = document.createElement("span");
    count.className = "cat-group__count";
    count.textContent = `${names.length}`;
    h.append(" ", count);
    section.append(h);
    for (const n of names) {
      seen.add(n);
      section.append(renderComponent(lib, lib.components[n]));
    }
    groupsEl.append(section);
  }
  applyFilter();
}

function applyFilter() {
  const q = (filterEl.value || "").trim().toLowerCase();
  let visible = 0;
  for (const group of groupsEl.querySelectorAll(".cat-group")) {
    let any = false;
    for (const comp of group.querySelectorAll(".cat-comp")) {
      const hit = !q || comp.dataset.text.includes(q);
      comp.classList.toggle("is-hidden", !hit);
      if (hit) {
        any = true;
        visible += 1;
      }
    }
    group.classList.toggle("is-hidden", !any);
  }
  const total = Object.keys(libraries[current].components).length;
  statusEl.textContent = q ? `${visible} of ${total} components match “${q}”.` : `${total} components. Type to narrow the list.`;
}

function switchTo(variant) {
  current = variant;
  for (const btn of document.querySelectorAll(".cat-switch__btn")) {
    const on = btn.dataset.variant === variant;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  }
  noteEl.textContent = NOTE[variant];
  renderLibrary(libraries[variant]);
  document.body.dataset.variant = variant;
}

async function boot() {
  for (const [variant, url] of Object.entries(URLS)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${variant} catalog HTTP ${res.status}`);
    libraries[variant] = loadLibraryJson(await res.text());
    $(`#count-${variant}`).textContent = String(Object.keys(libraries[variant].components).length);
  }
  for (const btn of document.querySelectorAll(".cat-switch__btn")) {
    btn.addEventListener("click", () => switchTo(btn.dataset.variant));
  }
  filterEl.addEventListener("input", applyFilter);
  const wanted = new URLSearchParams(location.search).get("lib");
  switchTo(wanted === "chat" ? "chat" : "dashboard");
  statusEl.setAttribute("data-lab-ready", "1");
}

boot().catch((err) => {
  statusEl.textContent = `Could not load the catalog: ${err.message}`;
});

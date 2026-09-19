/**
 * Catalog page — every component the model may draw, with a live sample.
 * Lab chrome only; nothing here is imported by the runtime.
 */
import { loadLibraryJson } from "../assets/js/lang/contractLoader.js";
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { createStore } from "../assets/js/runtime/store.js";
import { createBindingManager } from "../assets/js/runtime/bindings.js";
import { registerAllComponents } from "../assets/js/host/mount.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";
import { demoFor } from "./catalog-demos.js";

const URLS = {
  dashboard: "/assets/libraries/dashboard/library.v1.json",
  chat: "/assets/libraries/chat/library.v1.json",
};

const NOTE = {
  dashboard:
    "Dashboard replies start with a Stack and may lay things out in rows, columns, tabs, and dialogs. This is what the stream lab and the walkthrough use.",
  chat: "Chat replies start with a Card and stack top to bottom. It adds follow-up questions and collapsible sections and drops the free-form layout pieces.",
};

const $ = (sel) => document.querySelector(sel);
const groupsEl = $("#groups");
const statusEl = $("#status");
const filterEl = $("#filter");
const noteEl = $("#variant-note");

const registry = createComponentRegistry();
registerAllComponents(registry);
const store = createStore({});
const bindings = createBindingManager(store);
const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
  bindings,
  state: store,
  actions: {
    run() {
      /* catalog samples are inert */
    },
  },
});

/** @type {Record<string, any>} */
const libraries = {};
let current = "dashboard";

/** Modal open state keyed by mount element id so switching catalogs is safe. */
const modalOpenByMount = new Map();

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

/**
 * Live draw for one component. Modal gets an Open sample control.
 * @param {string} name
 * @returns {HTMLElement}
 */
function previewPane(name) {
  const wrap = document.createElement("div");
  wrap.className = "cat-comp__preview";
  wrap.setAttribute("data-preview-for", name);

  const demo = demoFor(name);
  if (!demo) {
    const miss = document.createElement("p");
    miss.className = "cat-comp__preview-miss";
    miss.textContent = "No live sample yet for this name.";
    wrap.append(miss);
    return wrap;
  }

  if (demo.note) {
    const note = document.createElement("p");
    note.className = "cat-comp__preview-note";
    note.textContent = demo.note;
    wrap.append(note);
  }

  const mount = document.createElement("div");
  mount.className = "cat-comp__mount";
  mount.id = `preview-${name}`;
  wrap.append(mount);

  if (name === "Modal") {
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "cat-comp__open-modal";
    openBtn.textContent = "Open sample dialog";
    wrap.insertBefore(openBtn, mount);

    const paint = () => {
      const open = modalOpenByMount.get(mount.id) === true;
      render(
        mount,
        {
          type: "Modal",
          id: "d-modal",
          props: {
            title: "Sample dialog",
            open: {
              get: () => modalOpenByMount.get(mount.id) === true,
              set: (v) => {
                modalOpenByMount.set(mount.id, !!v);
                paint();
              },
            },
            size: "md",
            children: [
              {
                type: "TextContent",
                id: "d-modal-body",
                props: {
                  text: open
                    ? "This is the dialog body. Close it with the × or Escape."
                    : "Modal body.",
                  variant: "clear",
                },
              },
            ],
          },
        },
        ctx,
      );
    };
    openBtn.addEventListener("click", () => {
      modalOpenByMount.set(mount.id, true);
      paint();
    });
    paint();
    return wrap;
  }

  try {
    render(mount, demo.vnode, ctx);
  } catch (err) {
    mount.replaceChildren();
    const fail = document.createElement("p");
    fail.className = "cat-comp__preview-miss";
    fail.textContent = `Could not draw sample: ${err instanceof Error ? err.message : String(err)}`;
    mount.append(fail);
  }
  return wrap;
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
    b.textContent =
      c === "links"
        ? "checks URLs"
        : c === "images"
          ? "checks images"
          : c === "markdown"
            ? "safe markdown"
            : c === "actions"
              ? "can run actions"
              : c;
    head.append(b);
  }
  wrap.append(head);

  const desc = document.createElement("p");
  desc.className = "cat-comp__desc";
  desc.textContent = comp.prompt?.description || "";
  wrap.append(desc);

  wrap.append(previewPane(comp.name));

  const details = document.createElement("details");
  details.className = "cat-comp__contract";
  const summary = document.createElement("summary");
  summary.textContent = "Contract (argument order)";
  details.append(summary);
  details.append(signature(comp));

  if (Array.isArray(comp.allowedChildren) && comp.allowedChildren.length) {
    const p = document.createElement("p");
    p.className = "cat-comp__kids";
    if (comp.allowedChildren.length === 1 && comp.allowedChildren[0] === "*") {
      p.textContent = "Can hold: any component in this catalog.";
    } else {
      p.append(`Can hold (${comp.allowedChildren.length}): `);
      p.append(linkList(comp.allowedChildren));
    }
    details.append(p);
  }

  const parents = parentsOf(lib, comp.name);
  if (parents.length) {
    const p = document.createElement("p");
    p.className = "cat-comp__kids";
    p.append("Goes inside: ");
    p.append(linkList(parents));
    details.append(p);
  }

  wrap.append(details);
  return wrap;
}

function renderLibrary(lib) {
  groupsEl.replaceChildren();
  modalOpenByMount.clear();
  const seen = new Set();
  const groups = Array.isArray(lib.componentGroups) ? lib.componentGroups : [];
  const ordered = [...groups];
  const leftovers = Object.keys(lib.components).filter(
    (n) => !groups.some((g) => g.components.includes(n)),
  );
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
  statusEl.textContent = q
    ? `${visible} of ${total} components match “${q}”.`
    : `${total} components, each with a live sample. Type to narrow the list.`;
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
    $(`#count-${variant}`).textContent = String(
      Object.keys(libraries[variant].components).length,
    );
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

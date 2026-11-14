// src/Browser/components/containers/shared.js
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("container component: ctx.document required");
  }
  return doc;
}
function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}
function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
function resolveIsStreaming(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true) return true;
  if (props.isStreaming === false || props.streaming === false) return false;
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}
function normalizeSectionEntry(raw, index) {
  if (raw == null) {
    return { value: String(index), trigger: "", content: null };
  }
  if (typeof raw === "string") {
    return { value: String(index), trigger: raw, content: null };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const value = asText(obj.value) || String(index);
  const trigger = asText(obj.trigger ?? obj.title ?? obj.label);
  const content = obj.content !== void 0 ? obj.content : obj.children !== void 0 ? obj.children : null;
  return { value, trigger, content };
}
function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((s, i) => normalizeSectionEntry(s, i));
}
function normalizeStepEntry(raw, index) {
  if (raw == null) {
    return { title: "", details: null, number: index + 1 };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const num = Number.isInteger(obj.number) && /** @type {number} */
  obj.number > 0 ? (
    /** @type {number} */
    obj.number
  ) : index + 1;
  return {
    title: asText(obj.title),
    details: obj.details !== void 0 ? obj.details : obj.content ?? null,
    number: num
  };
}
function normalizeSteps(items) {
  if (!Array.isArray(items)) return [];
  return items.map((s, i) => normalizeStepEntry(s, i));
}
function renderPanelContent(panel, content, ctx) {
  clearChildren(panel);
  const doc = requireDocument(ctx);
  if (content == null) return;
  if (typeof content === "string" || typeof content === "number") {
    panel.appendChild(doc.createTextNode(String(content)));
    return;
  }
  if (Array.isArray(content)) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(panel, content);
    } else {
      for (const part of content) {
        if (typeof part === "string" || typeof part === "number") {
          panel.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    return;
  }
  if (typeof content === "object" && content !== null && "type" in /** @type {object} */
  content) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(panel, [content]);
    }
  }
}
function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}
function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function normalizeItem(raw) {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  const props = obj.props && typeof obj.props === "object" ? (
    /** @type {Record<string, unknown>} */
    obj.props
  ) : obj;
  const value = asText(props.value);
  if (!value) return null;
  const trigger = asText(props.trigger ?? props.label ?? props.title);
  let content = props.content;
  if (content == null && Array.isArray(obj.children)) {
    content = obj.children;
  }
  if (content == null && Array.isArray(props.children)) {
    content = props.children;
  }
  if (!Array.isArray(content)) {
    content = content == null ? [] : [content];
  }
  const out = { value, trigger, content };
  if (obj.id != null) out.id = /** @type {string|number} */
  obj.id;
  else if (props.id != null) out.id = /** @type {string|number} */
  props.id;
  if (obj.key != null) out.key = /** @type {string|number} */
  obj.key;
  else if (props.key != null) out.key = /** @type {string|number} */
  props.key;
  return out;
}
function normalizeItems(props = {}, itemType) {
  const rawList = Array.isArray(props.items) ? props.items : Array.isArray(props.children) ? props.children : [];
  const out = [];
  for (const raw of rawList) {
    if (itemType && raw && typeof raw === "object" && /** @type {Record<string, unknown>} */
    raw.type != null && /** @type {Record<string, unknown>} */
    raw.type !== itemType) {
      continue;
    }
    const item = normalizeItem(raw);
    if (item) out.push(item);
  }
  return out;
}
function itemKey(item, index) {
  if (item.key != null) return String(item.key);
  if (item.id != null) return String(item.id);
  return item.value || String(index);
}
function contentSize(content) {
  try {
    return JSON.stringify(content ?? null).length;
  } catch {
    return Array.isArray(content) ? content.length : content == null ? 0 : 1;
  }
}
function findDirectByAttr(parent, attr, value) {
  const out = [];
  for (const child of parent.childNodes ?? []) {
    if (child.nodeType !== 1) continue;
    const el = (
      /** @type {Element} */
      child
    );
    if (value == null) {
      if (el.getAttribute?.(attr) != null) out.push(el);
    } else if (el.getAttribute?.(attr) === value) {
      out.push(el);
    }
  }
  return out;
}
function renderItemContent(host, content, ctx) {
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(host, content ?? []);
    return;
  }
  while (host.firstChild) host.removeChild(host.firstChild);
  const doc = ctx.document ?? host.ownerDocument ?? globalThis.document;
  for (const child of content ?? []) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      host.appendChild(doc.createTextNode(String(child)));
    } else if (typeof child === "object" && /** @type {Record<string, unknown>} */
    child.nodeType === 1) {
      host.appendChild(
        /** @type {Node} */
        child
      );
    } else if (typeof child === "object" && typeof /** @type {Record<string, unknown>} */
    child.type === "string") {
      const span = doc.createElement("span");
      span.setAttribute("data-canvas-stub", String(
        /** @type {Record<string, unknown>} */
        child.type
      ));
      const text = (
        /** @type {Record<string, unknown>} */
        child.props && typeof /** @type {Record<string, unknown>} */
        child.props === "object" ? asText(
          /** @type {Record<string, unknown>} */
          /** @type {Record<string, unknown>} */
          child.props.text ?? /** @type {Record<string, unknown>} */
          /** @type {Record<string, unknown>} */
          child.props.content
        ) : ""
      );
      if (text) span.textContent = text;
      host.appendChild(span);
    }
  }
}
var _uid = 0;
function nextUid() {
  _uid += 1;
  return `c${_uid}`;
}
function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    // When true, keyed reconciler will not wipe this element's children.
    ownsChildren: impl.ownsChildren === true
  };
}

export {
  requireDocument,
  setClass,
  clearChildren,
  resolveIsStreaming,
  normalizeSectionEntry,
  normalizeSections,
  normalizeStepEntry,
  normalizeSteps,
  renderPanelContent,
  setOrRemoveAttr,
  asText,
  normalizeItems,
  itemKey,
  contentSize,
  findDirectByAttr,
  renderItemContent,
  nextUid,
  lifecycle
};

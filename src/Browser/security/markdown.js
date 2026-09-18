/**
 * A4.5 — Safe markdown → DOM / HTML for richtext (H4).
 *
 * Allowlist: p, br, strong, em, code, pre, a (href via sanitizeUrl),
 * ul/ol/li, h1–h3, blockquote, tables (table/thead/tbody/tr/th/td),
 * citations.
 *
 * Citations (documented choice): numeric markers `[1]` / `[1][2]` render as
 * `<cite data-citation="N">N</cite>` (not raw HTML, not math). Adjacent
 * markers each become their own `<cite>`. UI layers may style/hook
 * `data-citation` without needing unsafe HTML.
 *
 * Preferred path: tokenize → `document.createElement` / `createTextNode`
 * (browser `document` or test miniDom). `markdownToSafeHtml` serializes that
 * tree. `sanitizeHtml` remains a string-only defensive pass for untrusted
 * HTML fragments (never used as a raw-HTML markdown passthrough).
 *
 * Forbidden: raw HTML passthrough, script/style/iframe, on* attrs, math.
 */

import { sanitizeUrl } from "./urlPolicy.js";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "cite",
]);

const VOID_TAGS = new Set(["br"]);

const CITE_ATTR = "data-citation";

/**
 * Minimal document stub when no DOM is provided (Node string API).
 * Compatible with tests/browser/helpers/miniDom.js shapes.
 * @returns {Document}
 */
function createFallbackDocument() {
  class N {
    constructor() {
      this.parentNode = null;
      this.childNodes = [];
      this.ownerDocument = null;
    }
    appendChild(c) {
      if (c.parentNode) c.parentNode.removeChild(c);
      c.parentNode = this;
      this.childNodes.push(c);
      return c;
    }
    removeChild(c) {
      const i = this.childNodes.indexOf(c);
      if (i >= 0) {
        this.childNodes.splice(i, 1);
        c.parentNode = null;
      }
      return c;
    }
  }
  class T extends N {
    constructor(data) {
      super();
      this.nodeType = 3;
      this.nodeName = "#text";
      this._data = String(data);
    }
    get textContent() {
      return this._data;
    }
  }
  class E extends N {
    constructor(tag) {
      super();
      this.nodeType = 1;
      this.tagName = String(tag).toUpperCase();
      this.nodeName = this.tagName;
      this._attrs = new Map();
    }
    setAttribute(n, v) {
      this._attrs.set(String(n).toLowerCase(), String(v));
    }
    getAttribute(n) {
      const v = this._attrs.get(String(n).toLowerCase());
      return v === undefined ? null : v;
    }
    get attributes() {
      return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
    }
    get textContent() {
      return this.childNodes.map((c) => c.textContent ?? "").join("");
    }
  }
  return {
    createElement(tag) {
      const el = new E(tag);
      el.ownerDocument = this;
      return el;
    },
    createTextNode(data) {
      const t = new T(data);
      t.ownerDocument = this;
      return t;
    },
  };
}

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeAttr(text) {
  return escapeHtml(text);
}

/**
 * Serialize a miniDom / browser element tree to HTML.
 * @param {Element} node
 * @returns {string}
 */
export function serializeDom(node) {
  if (!node) return "";
  if (node.nodeType === 3) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== 1) return "";

  const tag = String(node.tagName || "").toLowerCase();
  if (!tag) {
    return [...(node.childNodes || [])].map(serializeDom).join("");
  }

  if (VOID_TAGS.has(tag)) return `<${tag}>`;

  let attrs = "";
  const list = node.attributes;
  if (list) {
    const entries = typeof list.length === "number"
      ? Array.from(list).map((a) => [a.name, a.value])
      : [...list];
    for (const [name, value] of entries) {
      const n = String(name).toLowerCase();
      if (n.startsWith("on") || n === "style") continue;
      if (tag === "a" && n === "href") {
        const safe = sanitizeUrl(value);
        if (!safe) continue;
        attrs += ` href="${escapeAttr(safe)}"`;
        continue;
      }
      if (tag === "a" && n === "rel") {
        attrs += ` rel="${escapeAttr(value)}"`;
        continue;
      }
      if (tag === "cite" && n === CITE_ATTR) {
        attrs += ` ${CITE_ATTR}="${escapeAttr(value)}"`;
        continue;
      }
      // no other attributes on allowlisted tags
    }
  }

  const inner = [...(node.childNodes || [])].map(serializeDom).join("");
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

/**
 * Strip disallowed tags/attrs from an HTML fragment (string sanitizer).
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string" || !html) return "";

  let out = String(html);

  out = out.replace(
    /<\s*(script|iframe|object|embed|style|form|input|button|link|meta|svg|math)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  out = out.replace(
    /<\s*(script|iframe|object|embed|style|form|input|button|link|meta|svg|math)(\s[^>]*)?\/?\s*>/gi,
    "",
  );

  out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  /** @type {string[]} */
  const anchorPlaceholders = [];
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\s*\/\s*a\s*>/gi, (_, attrs, body) => {
    const hrefMatch = String(attrs).match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch ? hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "" : "";
    const safe = sanitizeUrl(rawHref);
    const htmlOut = safe
      ? `<a href="${escapeAttr(safe)}" rel="noopener noreferrer">${body}</a>`
      : body;
    const idx = anchorPlaceholders.length;
    anchorPlaceholders.push(htmlOut);
    return `\u0000ANCHOR${idx}\u0000`;
  });
  out = out.replace(/<\/?a\b[^>]*>/gi, "");

  /** @type {string[]} */
  const citePlaceholders = [];
  out = out.replace(/<cite\b([^>]*)>([\s\S]*?)<\s*\/\s*cite\s*>/gi, (_, attrs, body) => {
    const m = String(attrs).match(/\bdata-citation\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const id = (m ? m[1] ?? m[2] ?? m[3] ?? "" : "").replace(/[^\d]/g, "");
    const text = String(body).replace(/<[^>]+>/g, "");
    const htmlOut = id
      ? `<cite ${CITE_ATTR}="${escapeAttr(id)}">${escapeHtml(text || id)}</cite>`
      : escapeHtml(text);
    const idx = citePlaceholders.length;
    citePlaceholders.push(htmlOut);
    return `\u0000CITE${idx}\u0000`;
  });

  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag) => {
    const tag = rawTag.toLowerCase();
    if (tag === "a" || tag === "cite") return "";
    const closing = /^<\s*\//.test(full);
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) {
      if (VOID_TAGS.has(tag)) return "";
      return `</${tag}>`;
    }
    if (tag === "br") return "<br>";
    return `<${tag}>`;
  });

  out = out.replace(/\u0000ANCHOR(\d+)\u0000/g, (_, i) => anchorPlaceholders[Number(i)] ?? "");
  out = out.replace(/\u0000CITE(\d+)\u0000/g, (_, i) => citePlaceholders[Number(i)] ?? "");

  return out;
}

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {Node[]} children
 * @param {Record<string, string>} [attrs]
 */
function el(doc, tag, children = [], attrs = {}) {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c) node.appendChild(c);
  }
  return node;
}

/**
 * @param {Document} doc
 * @param {string} text
 */
function text(doc, textValue) {
  return doc.createTextNode(textValue);
}

/**
 * Inline formatting on plain text → nodes (no raw HTML).
 * Handles code, strong, em, links, and citation markers.
 * @param {Document} doc
 * @param {string} raw
 * @returns {Node[]}
 */
function formatInlineNodes(doc, raw) {
  // Work on a single string with placeholders for code/links first via tokenize.
  /** @type {{ type: string, value?: string, href?: string, label?: string, ids?: string[] }[]} */
  const tokens = [];
  let s = String(raw);
  let i = 0;

  while (i < s.length) {
    // code `...`
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i) {
        tokens.push({ type: "code", value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // citations [1][2] or [1]
    if (s[i] === "[") {
      const citeRe = /^(\[\d+\](?:\s*\[\d+\])*)/;
      const cm = citeRe.exec(s.slice(i));
      // Distinguish from markdown links [label](url)
      if (cm) {
        const after = s.slice(i + cm[0].length);
        if (!after.startsWith("(")) {
          const ids = [...cm[0].matchAll(/\[(\d+)\]/g)].map((m) => m[1]);
          tokens.push({ type: "cite", ids });
          i += cm[0].length;
          continue;
        }
      }

      const linkRe = /^\[([^\]]+)\]\(([^)\s]+)\)/;
      const lm = linkRe.exec(s.slice(i));
      if (lm) {
        tokens.push({ type: "link", label: lm[1], href: lm[2] });
        i += lm[0].length;
        continue;
      }
    }

    // strong **...**
    if (s[i] === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > i) {
        tokens.push({ type: "strong", value: s.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // em *...*
    if (s[i] === "*") {
      const end = s.indexOf("*", i + 1);
      if (end > i) {
        tokens.push({ type: "em", value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // plain run until next special
    let j = i + 1;
    while (j < s.length && s[j] !== "`" && s[j] !== "[" && s[j] !== "*") j += 1;
    tokens.push({ type: "text", value: s.slice(i, j) });
    i = j;
  }

  /** @type {Node[]} */
  const nodes = [];
  for (const t of tokens) {
    if (t.type === "text") {
      if (t.value) nodes.push(text(doc, t.value));
    } else if (t.type === "code") {
      nodes.push(el(doc, "code", [text(doc, t.value ?? "")]));
    } else if (t.type === "strong") {
      nodes.push(el(doc, "strong", formatInlineNodes(doc, t.value ?? "")));
    } else if (t.type === "em") {
      nodes.push(el(doc, "em", formatInlineNodes(doc, t.value ?? "")));
    } else if (t.type === "link") {
      const href = sanitizeUrl(t.href);
      if (href) {
        nodes.push(
          el(doc, "a", formatInlineNodes(doc, t.label ?? ""), {
            href,
            rel: "noopener noreferrer",
          }),
        );
      } else {
        nodes.push(...formatInlineNodes(doc, t.label ?? ""));
      }
    } else if (t.type === "cite") {
      for (const id of t.ids || []) {
        nodes.push(el(doc, "cite", [text(doc, id)], { [CITE_ATTR]: id }));
      }
    }
  }
  return nodes;
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function isTableSeparator(line) {
  const t = line.trim();
  if (!t || !t.includes("-")) return false;
  // pipes / dashes / colons / spaces only (GFM separator row)
  if (!/^[\s|:\-]+$/.test(t)) return false;
  return /:?-+:?/.test(t);
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/**
 * @param {Document} doc
 * @param {string | null | undefined} markdown
 * @returns {Element} container div
 */
export function markdownToSafeDom(markdown, document) {
  const doc = document || globalThis.document || createFallbackDocument();
  const root = el(doc, "div");

  if (markdown == null) return root;
  const raw = String(markdown);
  if (!raw) return root;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  const appendParagraph = (buf) => {
    const joined = buf.join("\n").trim();
    if (!joined) return;
    for (const part of joined.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
      const kids = [];
      const bits = part.split("\n");
      bits.forEach((bit, idx) => {
        kids.push(...formatInlineNodes(doc, bit));
        if (idx < bits.length - 1) kids.push(el(doc, "br"));
      });
      root.appendChild(el(doc, "p", kids));
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      root.appendChild(el(doc, "pre", [el(doc, "code", [text(doc, buf.join("\n"))])]));
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      root.appendChild(el(doc, `h${level}`, formatInlineNodes(doc, heading[2].trim())));
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      root.appendChild(el(doc, "blockquote", formatInlineNodes(doc, buf.join("\n"))));
      continue;
    }

    // GFM table: header + separator + rows
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headerCells = splitTableRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        bodyRows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const thead = el(doc, "thead", [
        el(
          doc,
          "tr",
          headerCells.map((c) => el(doc, "th", formatInlineNodes(doc, c))),
        ),
      ]);
      const tbody = el(
        doc,
        "tbody",
        bodyRows.map((row) =>
          el(
            doc,
            "tr",
            row.map((c) => el(doc, "td", formatInlineNodes(doc, c))),
          ),
        ),
      );
      root.appendChild(el(doc, "table", [thead, tbody]));
      continue;
    }

    if (/^(\s*[-*+]|\s*\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (i < lines.length && /^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i])) {
        const item = lines[i].replace(/^(\s*[-*+]|\s*\d+\.)\s+/, "");
        items.push(el(doc, "li", formatInlineNodes(doc, item)));
        i += 1;
      }
      root.appendChild(el(doc, tag, items));
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i]) &&
      !(
        lines[i].includes("|") &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      )
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    appendParagraph(buf);
  }

  return root;
}

/**
 * Convert markdown to allowlisted HTML via the DOM path + serialize.
 * Raw HTML in the source becomes text nodes (escaped on serialize).
 * @param {string | null | undefined} markdown
 * @param {Document} [document]
 * @returns {string}
 */
export function markdownToSafeHtml(markdown, document) {
  if (markdown == null) return "";
  const raw = String(markdown);
  if (!raw) return "";
  const root = markdownToSafeDom(raw, document);
  const html = [...(root.childNodes || [])].map(serializeDom).join("");
  return sanitizeHtml(html);
}

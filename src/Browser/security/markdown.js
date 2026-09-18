/**
 * A4 — Safe markdown → HTML for richtext (H4).
 *
 * Allowlist: p, br, strong, em, code, pre, a (href via sanitizeUrl),
 * ul/ol/li, h1–h3, blockquote.
 * Strips script/iframe/object/embed/style and on* attributes.
 *
 * Pure-string path (no DOM deps) so Node tests work without jsdom.
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
]);

const VOID_TAGS = new Set(["br"]);

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
 * Strip disallowed tags/attrs from an HTML fragment (string sanitizer).
 * Used as a final pass and for hostile HTML embedded in markdown.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string" || !html) return "";

  let out = String(html);

  // Remove blocked elements entirely (open+close or self-closing).
  out = out.replace(
    /<\s*(script|iframe|object|embed|style|form|input|button|link|meta|svg|math)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  out = out.replace(
    /<\s*(script|iframe|object|embed|style|form|input|button|link|meta|svg|math)(\s[^>]*)?\/?\s*>/gi,
    "",
  );

  // Strip event-handler and style attributes anywhere.
  out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Anchors as pairs — reject unsafe href, keep text content only.
  // Use placeholders so later tag passes cannot strip normalized <a> tags.
  /** @type {string[]} */
  const anchorPlaceholders = [];
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\s*\/\s*a\s*>/gi, (_, attrs, body) => {
    const hrefMatch = String(attrs).match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch ? hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "" : "";
    const safe = sanitizeUrl(rawHref);
    const html = safe
      ? `<a href="${escapeAttr(safe)}" rel="noopener noreferrer">${body}</a>`
      : body;
    const idx = anchorPlaceholders.length;
    anchorPlaceholders.push(html);
    return `\u0000ANCHOR${idx}\u0000`;
  });
  // Unclosed / leftover <a ...> shells.
  out = out.replace(/<\/?a\b[^>]*>/gi, "");

  // Rewrite remaining tags: keep allowlisted only (no attributes).
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag) => {
    const tag = rawTag.toLowerCase();
    if (tag === "a") return "";
    const closing = /^<\s*\//.test(full);
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }
    if (closing) {
      if (VOID_TAGS.has(tag)) return "";
      return `</${tag}>`;
    }
    if (tag === "br") return "<br>";
    return `<${tag}>`;
  });

  out = out.replace(/\u0000ANCHOR(\d+)\u0000/g, (_, i) => anchorPlaceholders[Number(i)] ?? "");

  return out;
}

/**
 * Inline markdown on already-escaped text (no raw HTML leaks).
 * @param {string} escaped
 * @returns {string}
 */
function formatInline(escaped) {
  let s = escaped;

  // code spans
  s = s.replace(/`([^`\n]+)`/g, (_, code) => `<code>${code}</code>`);

  // strong then em
  s = s.replace(/\*\*([^*\n]+)\*\*/g, (_, t) => `<strong>${t}</strong>`);
  s = s.replace(/\*([^*\n]+)\*/g, (_, t) => `<em>${t}</em>`);

  // links — URL is still escaped entity text; unescape for policy check
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, urlEscaped) => {
    const url = urlEscaped
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const href = sanitizeUrl(url);
    if (!href) {
      return `${label}`;
    }
    return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">${label}</a>`;
  });

  return s;
}

/**
 * @param {string} raw
 * @returns {string}
 */
function formatBlocks(raw) {
  const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    const text = buf.join("\n").trim();
    if (!text) return;
    for (const part of text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
      const inner = formatInline(escapeHtml(part)).replace(/\n/g, "<br>");
      out.push(`<p>${inner}</p>`);
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
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${formatInline(escapeHtml(heading[2].trim()))}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote>${formatInline(escapeHtml(buf.join("\n")))}</blockquote>`);
      continue;
    }

    if (/^(\s*[-*+]|\s*\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (i < lines.length && /^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i])) {
        const item = lines[i].replace(/^(\s*[-*+]|\s*\d+\.)\s+/, "");
        items.push(`<li>${formatInline(escapeHtml(item))}</li>`);
        i += 1;
      }
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,3}\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    flushParagraph(buf);
  }

  return out.join("");
}

/**
 * Convert markdown to allowlisted HTML. Raw HTML in the source is escaped
 * before formatting, then a final sanitizeHtml pass strips any residual risk.
 * @param {string | null | undefined} markdown
 * @returns {string}
 */
export function markdownToSafeHtml(markdown) {
  if (markdown == null) return "";
  const raw = String(markdown);
  if (!raw) return "";
  const formatted = formatBlocks(raw);
  return sanitizeHtml(formatted);
}

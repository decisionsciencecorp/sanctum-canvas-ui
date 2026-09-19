/**
 * Build chat + dashboard library.v1.json from the frozen OpenUI genui-lib.
 * Property order comes from the Zod schemas the model was taught, not from
 * the six-name bootstrap catalog.
 *
 * Run: node tools/build-library-manifests.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const genui = join(root, "old/packages/react-ui/src/genui-lib");
const componentsRoot = join(root, "src/Browser/components");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

function stripComments(src) {
  let out = "";
  let i = 0;
  let mode = "code";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") {
        mode = "line";
        i += 2;
        continue;
      }
      if (c === "/" && n === "*") {
        mode = "block";
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        mode = c;
        out += c;
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (mode === "line") {
      if (c === "\n") {
        mode = "code";
        out += c;
      }
      i += 1;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = "code";
        i += 2;
        continue;
      }
      if (c === "\n") out += c;
      i += 1;
      continue;
    }
    out += c;
    if (c === "\\" ) {
      out += n || "";
      i += 2;
      continue;
    }
    if (c === mode) mode = "code";
    i += 1;
  }
  return out;
}

function balanced(src, openIndex, openChar, closeChar) {
  let depth = 0;
  let mode = "code";
  for (let i = openIndex; i < src.length; i += 1) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === '"' || c === "'" || c === "`") {
        mode = c;
        continue;
      }
      if (c === openChar) depth += 1;
      else if (c === closeChar) {
        depth -= 1;
        if (depth === 0) return src.slice(openIndex + 1, i);
      }
    } else {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === mode) mode = "code";
    }
  }
  throw new Error("unbalanced");
}

function readQuoted(src, i) {
  const q = src[i];
  let out = "";
  for (let j = i + 1; j < src.length; j += 1) {
    if (src[j] === "\\") {
      out += src[j + 1] || "";
      j += 1;
      continue;
    }
    if (src[j] === q) return { value: out, end: j };
    out += src[j];
  }
  throw new Error("unclosed string");
}

function splitTop(body) {
  const parts = [];
  let start = 0;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let mode = "code";
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (mode === "code") {
      if (c === '"' || c === "'" || c === "`") mode = c;
      else if (c === "(") depthParen += 1;
      else if (c === ")") depthParen -= 1;
      else if (c === "{") depthBrace += 1;
      else if (c === "}") depthBrace -= 1;
      else if (c === "[") depthBracket += 1;
      else if (c === "]") depthBracket -= 1;
      else if (c === "," && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        parts.push(body.slice(start, i));
        start = i + 1;
      }
    } else {
      if (c === "\\") i += 1;
      else if (c === mode) mode = "code";
    }
  }
  parts.push(body.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseDefault(expr) {
  const m = expr.match(/\.default\(\s*([\s\S]*?)\s*\)(?:\s*\.|$)/);
  if (!m) return undefined;
  const raw = m[1].trim();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (/^\[\]$/.test(raw)) return [];
  if (/^"([^"]*)"$/.test(raw) || /^'([^']*)'$/.test(raw)) {
    return raw.slice(1, -1);
  }
  return undefined;
}

function parseEnum(expr) {
  const i = expr.indexOf("z.enum(");
  if (i < 0) return null;
  const bracket = expr.indexOf("[", i);
  if (bracket < 0) return null;
  const inner = balanced(expr, bracket, "[", "]");
  const values = [];
  for (const part of splitTop(inner)) {
    const m = part.match(/^["']([^"']+)["']$/);
    if (m) values.push(m[1]);
  }
  return values.length ? values : null;
}

function childNames(expr, known) {
  const found = new Set();
  for (const name of known) {
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(expr)) found.add(name);
  }
  return [...found];
}

function propSpec(key, expr, known) {
  const optionalBySchema =
    /^[A-Za-z0-9_]+$/.test(expr.trim()) &&
    schemas.has(expr.trim()) &&
    /\.optional\(\)\s*;?\s*$/.test(schemas.get(expr.trim()).trim());
  const optional = /\.optional\(\)/.test(expr) || /\.default\(/.test(expr) || optionalBySchema;
  const reactive = /\breactive\(/.test(expr);
  const enm = parseEnum(expr);
  const def = parseDefault(expr);
  /** @type {Record<string, unknown>} */
  const spec = {};
  if (enm) {
    spec.type = "string";
    spec.enum = enm;
  } else if (/z\.array\(/.test(expr) || /\.array\(/.test(expr)) {
    spec.type = "array";
    const kids = childNames(expr, known);
    if (kids.length === 1) spec.items = { $ref: kids[0] };
    else if (kids.length > 1) spec.items = { anyOf: kids.map((n) => ({ $ref: n })) };
  } else if (/z\.number\(/.test(expr)) spec.type = "number";
  else if (/z\.boolean\(/.test(expr)) spec.type = "boolean";
  else if (/z\.string\(/.test(expr)) spec.type = "string";
  else if (/z\.literal\(/.test(expr)) spec.type = "string";
  else if (/z\.object\(/.test(expr) || /z\.record\(/.test(expr) || /Schema\b/.test(expr) || /actionPropSchema/.test(expr) || /rulesSchema/.test(expr)) {
    spec.type = "object";
  } else if (/\.ref\b/.test(expr)) {
    const kids = childNames(expr, known);
    spec.type = kids.length ? "object" : "any";
    if (kids.length === 1) spec.$ref = kids[0];
  } else spec.type = "any";
  if (!optional) spec.required = true;
  if (def !== undefined) spec.default = def;
  return { spec, reactive, optional, expr };
}

function objectBody(expr) {
  const hit = expr.match(/z\s*\.\s*object\s*\(/);
  if (!hit) return null;
  const i = hit.index;
  const brace = expr.indexOf("{", i);
  if (brace < 0) return null;
  return balanced(expr, brace, "{", "}");
}

const files = walk(genui);
files.push(join(root, "old/packages/react-ui/src/components/_shared/icons/schema.ts"));
const schemas = new Map();
const componentsByFile = new Map();
const exportedComponents = new Map();

function takeExpr(src, start) {
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let mode = "code";
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (mode === "code") {
      if (c === '"' || c === "'" || c === "`") mode = c;
      else if (c === "(") depthParen += 1;
      else if (c === "{") depthBrace += 1;
      else if (c === "[") depthBracket += 1;
      else if (c === ")") depthParen -= 1;
      else if (c === "}") depthBrace -= 1;
      else if (c === "]") depthBracket -= 1;
      else if (c === ";" && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        return src.slice(start, i).trim();
      }
    } else {
      if (c === "\\") i += 1;
      else if (c === mode) mode = "code";
    }
  }
  return src.slice(start).trim();
}

for (const file of files) {
  const src = stripComments(readFileSync(file, "utf8"));
  const assignRe = /(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*/g;
  let m;
  while ((m = assignRe.exec(src))) {
    const expr = takeExpr(src, m.index + m[0].length);
    if (/z\s*\.\s*object\s*\(/.test(expr)) schemas.set(m[1], expr);
  }
  const fnRe = /export function\s+(create[A-Za-z0-9]+)\s*\([^)]*\)\s*\{/g;
  while ((m = fnRe.exec(src))) {
    const body = balanced(src, src.indexOf("{", m.index), "{", "}");
    const ret = body.match(/return\s+(z\s*\.\s*object\s*\([\s\S]*)/);
    if (ret) schemas.set(m[1], ret[1].replace(/;\s*$/, ""));
  }
  const defRe = /(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*defineComponent\(\s*\{/g;
  while ((m = defRe.exec(src))) {
    const ident = m[1];
    const brace = src.indexOf("{", m.index);
    const body = balanced(src, brace, "{", "}");
    const nameM = body.match(/name:\s*"([^"]+)"/);
    if (!nameM) continue;
    const propsM = body.match(/props:\s*([\s\S]*?),\s*description:/);
    let description = "";
    const descIdx = body.indexOf("description:");
    if (descIdx >= 0) {
      const rest = body.slice(descIdx + "description:".length).trim();
      if (rest.startsWith('"') || rest.startsWith("'") || rest.startsWith("`")) {
        description = readQuoted(rest, 0).value;
      }
    }
    const rec = {
      ident,
      name: nameM[1],
      propsExpr: propsM ? propsM[1].trim().replace(/,\s*$/, "") : "",
      description,
      file,
    };
    if (!componentsByFile.has(file)) componentsByFile.set(file, new Map());
    componentsByFile.get(file).set(ident, rec);
    if (src.slice(m.index).startsWith("export") || /export\s+const\s+/.test(src.slice(Math.max(0, m.index - 8), m.index + 20))) {
      exportedComponents.set(ident, rec);
    }
  }
}

if (schemas.has("iconPropsSchema")) schemas.set("IconSchema", schemas.get("iconPropsSchema"));

function resolveComponent(file, ident) {
  const local = componentsByFile.get(file);
  if (local?.has(ident)) return local.get(ident);
  if (exportedComponents.has(ident)) return exportedComponents.get(ident);
  return null;
}

function parsePropsFromExpr(expr, known, depth = 0) {
  if (!expr || depth > 6) return [];
  const trimmed = expr.trim();
  const merge = trimmed.match(/\.merge\(\s*([A-Za-z0-9_]+)\s*\)/);
  const body = objectBody(trimmed);
  let props = [];
  if (body != null) {
    for (const part of splitTop(body)) {
      const km = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:([\s\S]+)$/);
      if (!km) continue;
      props.push({ key: km[1], ...propSpec(km[1], km[2], known) });
    }
  } else if (/^create[A-Za-z0-9]+\(/.test(trimmed) && schemas.has(trimmed.slice(0, trimmed.indexOf("(")))) {
    props = parsePropsFromExpr(schemas.get(trimmed.slice(0, trimmed.indexOf("("))), known, depth + 1);
  } else if (/^[A-Za-z0-9_]+$/.test(trimmed) && schemas.has(trimmed)) {
    props = parsePropsFromExpr(schemas.get(trimmed), known, depth + 1);
  }
  if (merge && schemas.has(merge[1])) {
    const extra = parsePropsFromExpr(schemas.get(merge[1]), known, depth + 1);
    const seen = new Set(props.map((p) => p.key));
    for (const p of extra) if (!seen.has(p.key)) props.push(p);
  }
  return props;
}

function libraryIdents(file) {
  const src = stripComments(readFileSync(file, "utf8"));
  const marker = "createLibrary({";
  const at = src.indexOf(marker);
  if (at < 0) throw new Error("no createLibrary in " + file);
  const after = src.slice(at);
  const compAt = after.indexOf("components:");
  const bracket = after.indexOf("[", compAt);
  const inner = balanced(after, bracket, "[", "]");
  return splitTop(inner)
    .map((p) => p.replace(/,/g, "").trim())
    .filter((p) => /^[A-Za-z0-9_]+$/.test(p));
}

function groupsOf(file) {
  const src = stripComments(readFileSync(file, "utf8"));
  const groups = [];
  const re = /name:\s*"([^"]+)"\s*,\s*components:\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    const bracket = src.indexOf("[", m.index);
    const inner = balanced(src, bracket, "[", "]");
    const names = [...inner.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    groups.push({ name: m[1], components: names });
  }
  return groups;
}

function indexRenderers(dir, acc = new Map()) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) indexRenderers(p, acc);
    else if (name.endsWith(".js")) {
      const rel = relative(componentsRoot, p).replaceAll("\\", "/");
      const text = readFileSync(p, "utf8");
      for (const hit of text.matchAll(/export const ([A-Za-z0-9_]+)/g)) {
        if (!acc.has(hit[1])) acc.set(hit[1], rel);
      }
      const base = basename(name, ".js");
      if (!acc.has(base)) acc.set(base, rel);
    }
  }
  return acc;
}

const renderers = indexRenderers(componentsRoot);
const DATA = new Set(["Series", "Slice", "ScatterSeries", "Point"]);

function rendererFor(name) {
  if (DATA.has(name)) return "charts/dataLeaf.js";
  if (name === "MarkDownRenderer") return "content/MarkDownRenderer.js";
  if (renderers.has(name)) return renderers.get(name);
  return `MISSING/${name}.js`;
}

function securityFor(name, props) {
  const caps = new Set();
  if (name === "MarkDownRenderer" || name === "TextContent") caps.add("markdown");
  if (/Image|Gallery|Icon/.test(name)) caps.add("images");
  if (/Button|FollowUp|ListItem|OptionCard|IconButton/.test(name)) caps.add("actions");
  for (const p of props) {
    if (/url|src|href/i.test(p.key)) caps.add("links");
    if (p.key === "action") caps.add("actions");
  }
  if (caps.size === 0) caps.add("none");
  if (caps.has("none") && caps.size > 1) caps.delete("none");
  return [...caps];
}

const CHILD_KEYS = new Set([
  "children",
  "content",
  "items",
  "fields",
  "sections",
  "columns",
  "slides",
]);

function buildLibrary(file, id, variant, rootName) {
  const idents = libraryIdents(file);
  const known = new Set();
  const resolved = [];
  for (const ident of idents) {
    const rec = resolveComponent(file, ident);
    if (!rec) {
      resolved.push({ ident, missing: true });
      continue;
    }
    known.add(rec.name);
    resolved.push(rec);
  }
  const components = {};
  const missing = [];
  for (const rec of resolved) {
    if (rec.missing) {
      missing.push(rec.ident);
      continue;
    }
    const props = parsePropsFromExpr(rec.propsExpr, known);
    if (!props.length && rec.propsExpr) {
      missing.push(`${rec.name}:no-props:${rec.propsExpr.slice(0, 80)}`);
    }
    const properties = {};
    const propertyOrder = [];
    const required = [];
    const reactiveProps = [];
    let children = null;
    for (const p of props) {
      propertyOrder.push(p.key);
      const { spec } = p;
      properties[p.key] = spec;
      if (spec.required) required.push(p.key);
      if (p.reactive) reactiveProps.push(p.key);
      if (CHILD_KEYS.has(p.key) && spec.type === "array") {
        const kids = childNames(p.expr, known);
        children = kids.length ? kids : ["*"];
      }
    }
    components[rec.name] = {
      name: rec.name,
      version: "0.5.0",
      propertyOrder,
      properties,
      required,
      reactiveProps,
      allowedChildren: children,
      renderer: rendererFor(rec.name),
      securityCapabilities: securityFor(rec.name, props),
      prompt: {
        description: rec.description || rec.name,
        group: groupsOf(file).find((g) => g.components.includes(rec.name))?.name || "",
      },
    };
  }
  return {
    doc: {
      contractFormatVersion: "1.0.0",
      id,
      variant,
      root: rootName,
      upstreamCommit: "ee54f66",
      componentGroups: groupsOf(file),
      components,
    },
    missing,
    count: Object.keys(components).length,
  };
}

const dashFile = join(genui, "openuiLibrary.tsx");
const chatFile = join(genui, "openuiChatLibrary.tsx");
const dashboard = buildLibrary(dashFile, "sanctum-openui-dashboard", "dashboard", "Stack");
const chat = buildLibrary(chatFile, "sanctum-openui-chat", "chat", "Card");

function writeBoth(rel, doc) {
  const text = JSON.stringify(doc, null, 2) + "\n";
  const a = join(root, "resources/libraries", rel);
  const b = join(root, "public/assets/libraries", rel);
  mkdirSync(dirname(a), { recursive: true });
  mkdirSync(dirname(b), { recursive: true });
  writeFileSync(a, text);
  writeFileSync(b, text);
}

writeBoth("dashboard/library.v1.json", dashboard.doc);
writeBoth("chat/library.v1.json", chat.doc);

const report = {
  dashboard: dashboard.count,
  chat: chat.count,
  dashboardMissing: dashboard.missing,
  chatMissing: chat.missing,
  dashboardRenderersMissing: Object.values(dashboard.doc.components)
    .filter((c) => c.renderer.startsWith("MISSING"))
    .map((c) => c.name),
  chatRenderersMissing: Object.values(chat.doc.components)
    .filter((c) => c.renderer.startsWith("MISSING"))
    .map((c) => c.name),
};
console.log(JSON.stringify(report, null, 2));
if (!existsSync(join(componentsRoot, "content/MarkDownRenderer.js"))) {
  console.error("MarkDownRenderer.js not written yet");
}

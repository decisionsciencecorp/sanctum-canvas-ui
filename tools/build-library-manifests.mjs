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

/* ---------- Zod expression resolver ----------
 * Walks `z.union([...])`, `X.ref`, `...Union.options`, `z.optional(X)`,
 * `z.array(...)`, `.optional()/.default()/.nullable()`, and named aliases so
 * that component-typed props come out as `$ref` / `anyOf` (composite), not a
 * bare `object` the parser then refuses to fill with a component.
 */

/** Split a chained expression into [{ name, args|null }] segments. */
function segments(expr) {
  const out = [];
  let i = 0;
  const s = expr.trim();
  let spread = false;
  if (s.startsWith("...")) {
    spread = true;
    i = 3;
  }
  while (i < s.length) {
    const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(s.slice(i));
    if (!m) break;
    const name = m[0];
    i += name.length;
    let args = null;
    while (s[i] === " " || s[i] === "\n") i += 1;
    if (s[i] === "(") {
      args = balanced(s, i, "(", ")");
      i += args.length + 2;
    }
    out.push({ name, args });
    while (s[i] === " " || s[i] === "\n") i += 1;
    if (s[i] === ".") {
      i += 1;
      continue;
    }
    break; // `as [...]` casts, trailing junk
  }
  return { segs: out, spread };
}

function literalValue(raw) {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t === "[]") return [];
  if (/^"([^"]*)"$/.test(t) || /^'([^']*)'$/.test(t)) return t.slice(1, -1);
  return undefined;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const k = JSON.stringify(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * @returns {{ spec: object, optional: boolean, reactive: boolean, def: unknown, members: string[] }}
 *   members = component names reachable as direct children (through arrays / unions)
 */
function resolveType(expr, ctx, depth = 0) {
  const base = { optional: false, reactive: false, def: undefined, members: [] };
  if (!expr || depth > 12) return { ...base, spec: { type: "any" } };
  const trimmed = expr.trim();

  // Array literal of union members: [A.ref, B.ref, ...X.options]
  if (trimmed.startsWith("[")) {
    const inner = balanced(trimmed, 0, "[", "]");
    const options = [];
    const members = [];
    for (const part of splitTop(inner)) {
      const r = resolveType(part, ctx, depth + 1);
      if (r.spec.anyOf) options.push(...r.spec.anyOf);
      else options.push(r.spec);
      members.push(...r.members);
    }
    return { ...base, spec: { anyOf: dedupe(options) }, members: [...new Set(members)] };
  }

  const { segs, spread } = segments(trimmed);
  if (!segs.length) return { ...base, spec: { type: "any" } };

  let result;
  let rest;
  const head = segs[0];

  if (head.name === "z" && segs[1]) {
    const op = segs[1];
    rest = segs.slice(2);
    switch (op.name) {
      case "string":
      case "literal":
      case "templateLiteral":
        result = { ...base, spec: { type: "string" } };
        break;
      case "number":
      case "int":
        result = { ...base, spec: { type: "number" } };
        break;
      case "boolean":
        result = { ...base, spec: { type: "boolean" } };
        break;
      case "enum": {
        const values = [];
        for (const part of splitTop(balanced(op.args, op.args.indexOf("["), "[", "]"))) {
          const v = literalValue(part);
          if (typeof v === "string") values.push(v);
        }
        result = { ...base, spec: { type: "string", enum: values } };
        break;
      }
      case "array": {
        const inner = resolveType(op.args, ctx, depth + 1);
        const spec = { type: "array" };
        if (inner.spec && !(inner.spec.type === "any" && !inner.spec.anyOf)) spec.items = inner.spec;
        result = { ...base, spec, members: inner.members };
        break;
      }
      case "union": {
        const inner = resolveType(op.args, ctx, depth + 1);
        result = inner;
        break;
      }
      case "optional": {
        const inner = resolveType(op.args, ctx, depth + 1);
        result = { ...inner, optional: true };
        break;
      }
      case "lazy": {
        const arrow = op.args.match(/=>\s*([\s\S]+)$/);
        result = arrow ? resolveType(arrow[1], ctx, depth + 1) : { ...base, spec: { type: "any" } };
        break;
      }
      case "object":
      case "record":
        result = { ...base, spec: { type: "object" } };
        break;
      default:
        result = { ...base, spec: { type: "any" } };
    }
  } else if (head.name === "reactive" && head.args != null) {
    const inner = resolveType(head.args, ctx, depth + 1);
    result = { ...inner, reactive: true };
    rest = segs.slice(1);
  } else if (segs[1]?.name === "ref") {
    const rec = ctx.resolveComponent(head.name);
    if (rec) result = { ...base, spec: { $ref: rec.name }, members: [rec.name] };
    else result = { ...base, spec: { type: "object" } };
    rest = segs.slice(2);
  } else if (segs[1]?.name === "options") {
    // ...Union.options  |  Union.options.filter((o) => o !== X.ref)
    const alias = ctx.resolveAlias(head.name);
    const inner = alias ? resolveType(alias, ctx, depth + 1) : { ...base, spec: { type: "any" } };
    const filter = segs[2]?.name === "filter" ? segs[2].args : null;
    if (filter) {
      const drop = [...filter.matchAll(/!==\s*([A-Za-z0-9_]+)\.ref/g)]
        .map((h) => ctx.resolveComponent(h[1])?.name)
        .filter(Boolean);
      const options = (inner.spec.anyOf || [inner.spec]).filter((o) => !drop.includes(o.$ref));
      result = {
        ...base,
        spec: { anyOf: options },
        members: inner.members.filter((n) => !drop.includes(n)),
      };
    } else result = inner;
    rest = segs.slice(filter ? 3 : 2);
  } else if (head.args != null && /^create[A-Za-z0-9]+$/.test(head.name) && schemas.has(head.name)) {
    result = { ...base, spec: { type: "object" } };
    rest = segs.slice(1);
  } else {
    const alias = ctx.resolveAlias(head.name) ?? (schemas.has(head.name) ? schemas.get(head.name) : null);
    if (alias) {
      const inner = resolveType(alias, ctx, depth + 1);
      if (/^\s*z\s*\.\s*object\s*\(/.test(alias)) {
        // Named object schemas (rules, trend, source) stay opaque objects —
        // unless a library component is defined by that very schema (Series,
        // Slice, ScatterSeries, Point). Then the model may write either the
        // inline object or the component call, exactly as OpenUI accepts.
        const owner = ctx.schemaOwner(head.name);
        result = owner
          ? { ...inner, spec: { anyOf: [{ type: "object" }, { $ref: owner }] }, members: [owner] }
          : { ...inner, spec: { type: "object" } };
      } else result = inner;
    } else result = { ...base, spec: { type: "any" } };
    rest = segs.slice(1);
  }

  for (const seg of rest || []) {
    if (seg.name === "optional" || seg.name === "nullable" || seg.name === "nullish") result.optional = true;
    else if (seg.name === "default") {
      result.optional = true;
      const v = literalValue(seg.args ?? "");
      if (v !== undefined) result.def = v;
    } else if (seg.name === "array") {
      result = {
        ...result,
        spec: { type: "array", items: result.spec },
      };
    }
  }
  if (spread && result.spec.$ref) result.spec = { anyOf: [result.spec] };
  return result;
}

function propSpec(key, expr, ctx) {
  const r = resolveType(expr, ctx);
  const spec = { ...r.spec };
  if (spec.anyOf) spec.anyOf = dedupe(spec.anyOf);
  if (spec.anyOf && spec.anyOf.length === 1) Object.assign(spec, spec.anyOf[0]), delete spec.anyOf;
  if (!r.optional) spec.required = true;
  if (r.def !== undefined) spec.default = r.def;
  return { spec, reactive: r.reactive, optional: r.optional, expr, members: r.members };
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
files.push(join(root, "old/packages/react-ui/src/components/Sources/SourceContext.tsx"));
const schemas = new Map();
const componentsByFile = new Map();
const exportedComponents = new Map();
const aliasesByFile = new Map();
const exportedAliases = new Map();
const anyFileAliases = new Map(); // file-local helpers inside schema.ts files

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
    // Named unions / aliases (ContentChildUnion, ChatCardChildUnion, …) are
    // what the container child lists are made of. Keep them per file so the
    // chat library's re-declared idents win over the base ones.
    if (!/defineComponent\(/.test(expr) && /\bz\s*\./.test(expr)) {
      if (!aliasesByFile.has(file)) aliasesByFile.set(file, new Map());
      aliasesByFile.get(file).set(m[1], expr);
      if (!anyFileAliases.has(m[1])) anyFileAliases.set(m[1], expr);
      if (src.slice(Math.max(0, m.index - 1), m.index + 7).includes("export")) {
        exportedAliases.set(m[1], expr);
      }
    }
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

function makeCtx(file, schemaOwners = new Map()) {
  return {
    schemaOwner: (ident) => schemaOwners.get(ident) ?? null,
    resolveComponent: (ident) => resolveComponent(file, ident),
    resolveAlias: (ident) =>
      aliasesByFile.get(file)?.get(ident) ?? exportedAliases.get(ident) ?? anyFileAliases.get(ident) ?? null,
  };
}

function parsePropsFromExpr(expr, ctx, depth = 0) {
  if (!expr || depth > 6) return [];
  const trimmed = expr.trim();
  const merge = trimmed.match(/\.merge\(\s*([A-Za-z0-9_]+)\s*\)/);
  const body = objectBody(trimmed);
  let props = [];
  if (body != null) {
    for (const part of splitTop(body)) {
      const km = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:([\s\S]+)$/);
      if (!km) continue;
      props.push({ key: km[1], ...propSpec(km[1], km[2], ctx) });
    }
  } else if (/^create[A-Za-z0-9]+\(/.test(trimmed) && schemas.has(trimmed.slice(0, trimmed.indexOf("(")))) {
    props = parsePropsFromExpr(schemas.get(trimmed.slice(0, trimmed.indexOf("("))), ctx, depth + 1);
  } else if (/^[A-Za-z0-9_]+$/.test(trimmed) && schemas.has(trimmed)) {
    props = parsePropsFromExpr(schemas.get(trimmed), ctx, depth + 1);
  }
  if (merge && schemas.has(merge[1])) {
    const extra = parsePropsFromExpr(schemas.get(merge[1]), ctx, depth + 1);
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
  // Components whose props ARE a named object schema (props: SeriesSchema).
  const schemaOwners = new Map();
  for (const rec of resolved) {
    if (rec.missing) continue;
    const ident = rec.propsExpr.trim();
    if (/^[A-Za-z0-9_]+$/.test(ident) && schemas.has(ident)) schemaOwners.set(ident, rec.name);
  }
  const ctx = makeCtx(file, schemaOwners);
  for (const rec of resolved) {
    if (rec.missing) {
      missing.push(rec.ident);
      continue;
    }
    const props = parsePropsFromExpr(rec.propsExpr, ctx);
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
        // Only names this library actually ships; `z.any()` children = any registered.
        const kids = p.members.filter((n) => known.has(n));
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

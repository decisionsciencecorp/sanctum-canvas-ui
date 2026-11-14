import "./chunk-MLKGABMK.js";

// src/Browser/components/tools/shared.js
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("tools component: ctx.document required");
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
function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function prefersReducedMotion(props = {}, ctx = {}) {
  if (props.reducedMotion === true || props.reduceMotion === true) return true;
  if (ctx.reducedMotion === true) return true;
  try {
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return true;
  } catch {
  }
  return false;
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
    ownsChildren: impl.ownsChildren !== false
  };
}
var TOOL_STATUS_LABELS = {
  streaming: (n) => `Calling the ${n} tool`,
  executing: (n) => `Running the ${n} tool`,
  complete: (n) => `Called the ${n} tool`,
  result: (n) => `${n} result`,
  error: (n) => `${n} failed`
};
var TOOL_NAMELESS_LABELS = {
  streaming: "Calling the tool",
  executing: "Running the tool",
  complete: "Called the tool",
  result: "Tool result",
  error: "Tool failed"
};
function defaultToolLabel(status, name) {
  const key = (
    /** @type {ToolStatus} */
    status
  );
  if (!TOOL_STATUS_LABELS[key]) return name ? `${name}: ${status}` : String(status);
  if (!name || !String(name).trim()) return TOOL_NAMELESS_LABELS[key];
  return TOOL_STATUS_LABELS[key](name);
}
function defaultRunLabel(phase) {
  switch (phase) {
    case "start":
      return "Run started";
    case "finish":
      return "Run finished";
    case "error":
      return "Run failed";
    default:
      return `Run ${phase}`;
  }
}

// src/Browser/components/tools/partialJson.js
function balanceOpenJSON(raw) {
  const closers = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  let out = raw;
  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out += '"';
  }
  out = out.replace(/(?:,\s*)?"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  out = out.replace(/,\s*$/, "");
  for (let i = closers.length - 1; i >= 0; i--) out += closers[i];
  return out;
}
function partialJSONParse(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
  }
  try {
    return JSON.parse(balanceOpenJSON(raw));
  } catch {
    return {};
  }
}
function isPartialJsonString(raw) {
  if (!raw || !String(raw).trim()) return true;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

// src/Browser/components/tools/redact.js
var SENSITIVE_KEY_RE = /^(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|authorization|auth|credential|cookie|session)$/i;
var REDACTED = "[REDACTED]";
function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || ""));
}
function redactValue(value, opts = {}) {
  const depth = opts.depth ?? 0;
  if (depth > 12) return REDACTED;
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^(?:sk-|Bearer\s+)/i.test(value) || value.length > 40 && /^[A-Za-z0-9_\-.=]+$/.test(value)) {
      return REDACTED;
    }
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, { depth: depth + 1 }));
  }
  const out = {};
  for (const [k, v] of Object.entries(
    /** @type {Record<string, unknown>} */
    value
  )) {
    out[k] = isSensitiveKey(k) ? REDACTED : redactValue(v, { depth: depth + 1 });
  }
  return out;
}
function redactForDisplay(value) {
  try {
    const redacted = redactValue(value);
    if (typeof redacted === "string") return redacted;
    return JSON.stringify(redacted, null, 2);
  } catch {
    return String(value ?? "");
  }
}

// src/Browser/components/tools/ToolActivity.js
var STATUSES = /* @__PURE__ */ new Set(["streaming", "executing", "complete", "result", "error"]);
function normalizeToolActivity(props = {}) {
  const activity = props.activity && typeof props.activity === "object" ? (
    /** @type {Record<string, unknown>} */
    props.activity
  ) : props;
  let status = asText(activity.status || props.status) || "executing";
  if (status === "success") status = "complete";
  if (!STATUSES.has(status)) status = "executing";
  const toolCall = activity.toolCall && typeof activity.toolCall === "object" ? (
    /** @type {Record<string, unknown>} */
    activity.toolCall
  ) : null;
  const fn = toolCall?.function && typeof toolCall.function === "object" ? (
    /** @type {Record<string, unknown>} */
    toolCall.function
  ) : null;
  const toolName = asText(activity.toolName) || asText(props.toolName) || asText(fn?.name) || asText(activity.name) || "";
  const rawArgs = asText(props.rawArgs) || asText(activity.rawArgs) || asText(fn?.arguments) || (typeof activity.arguments === "string" ? activity.arguments : "") || "";
  let input = activity.input !== void 0 ? activity.input : props.input;
  if (input === void 0) {
    input = rawArgs ? partialJSONParse(rawArgs) : {};
  }
  const isPartial = activity.isPartial === true || props.isPartial === true || status === "streaming" || (rawArgs ? isPartialJsonString(rawArgs) : false);
  const result = asText(activity.result) || asText(props.result) || asText(activity.content) || "";
  const errorText = asText(activity.errorText) || asText(props.errorText) || asText(activity.error) || asText(props.error) || "";
  const isError = activity.isError === true || status === "error" || Boolean(errorText);
  return {
    status: isError && status !== "error" ? "error" : status,
    id: asText(activity.id) || asText(props.id) || asText(toolCall?.id) || "",
    toolName,
    rawArgs,
    input,
    result,
    errorText,
    statusMessage: asText(activity.statusMessage) || asText(props.statusMessage),
    isError,
    isPartial
  };
}
function resolveRequestDisplay(activity) {
  const input = activity.input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = (
      /** @type {Record<string, unknown>} */
      input
    );
    if (obj._request != null) return redactForDisplay(obj._request);
    if (Object.keys(obj).length === 0 && activity.rawArgs.trim()) {
      return activity.rawArgs;
    }
  }
  if (activity.isPartial && activity.rawArgs.trim()) {
    const parsed = partialJSONParse(activity.rawArgs);
    if (parsed && typeof parsed === "object" && Object.keys(
      /** @type {object} */
      parsed
    ).length) {
      return redactForDisplay(parsed);
    }
    return activity.rawArgs;
  }
  return redactForDisplay(input);
}
var ToolActivity = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ToolActivity");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const activity = normalizeToolActivity(props);
    const reduced = prefersReducedMotion(props, ctx);
    const running = props.running !== false && ctx.running !== false;
    const isBusy = (activity.status === "streaming" || activity.status === "executing") && running;
    let cls = `canvas-tool-activity canvas-tool-activity--${activity.status}`;
    if (isBusy) cls += " canvas-tool-activity--busy";
    if (reduced) cls += " canvas-tool-activity--reduced-motion";
    if (activity.isPartial) cls += " canvas-tool-activity--partial";
    setClass(el, cls);
    el.setAttribute("data-status", activity.status);
    el.setAttribute("data-partial", activity.isPartial ? "1" : "0");
    el.setAttribute("data-tool-name", activity.toolName || "");
    if (activity.id) el.setAttribute("data-tool-id", activity.id);
    else el.removeAttribute("data-tool-id");
    clearChildren(el);
    const live = doc.createElement("div");
    live.setAttribute("class", "canvas-tool-activity__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    const label = activity.statusMessage || defaultToolLabel(activity.status, activity.toolName);
    live.textContent = label;
    el.appendChild(live);
    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-tool-activity__header");
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-tool-activity__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("data-spin", isBusy && !reduced ? "1" : "0");
    icon.textContent = activity.status === "error" ? "!" : activity.status === "complete" || activity.status === "result" ? "\u2713" : "\u25C9";
    header.appendChild(icon);
    const title = doc.createElement("span");
    title.setAttribute("class", "canvas-tool-activity__title");
    title.textContent = label;
    header.appendChild(title);
    el.appendChild(header);
    const request = resolveRequestDisplay(activity);
    if (request) {
      const req = doc.createElement("pre");
      req.setAttribute("class", "canvas-tool-activity__request");
      req.setAttribute("data-role", "args");
      if (activity.isPartial) req.setAttribute("data-partial", "1");
      req.textContent = request;
      el.appendChild(req);
    }
    if (activity.status === "result" || activity.status === "complete" || activity.status === "error") {
      if (activity.result) {
        const res = doc.createElement("pre");
        res.setAttribute("class", "canvas-tool-activity__result");
        res.setAttribute("data-role", "result");
        let display = activity.result;
        try {
          display = redactForDisplay(JSON.parse(activity.result));
        } catch {
          display = redactForDisplay(activity.result);
        }
        res.textContent = display;
        el.appendChild(res);
      }
      if (activity.errorText) {
        const err = doc.createElement("div");
        err.setAttribute("class", "canvas-tool-activity__error");
        err.setAttribute("data-role", "error");
        err.setAttribute("role", "alert");
        err.textContent = activity.errorText;
        el.appendChild(err);
      }
    }
    el.setAttribute("data-input-redacted", JSON.stringify(redactValue(activity.input)));
  }
});

// src/Browser/components/tools/RunStatus.js
var PHASES = /* @__PURE__ */ new Set(["start", "finish", "error"]);
function normalizeRunStatus(props = {}) {
  let phase = asText(props.phase) || asText(props.status) || asText(props.event) || "start";
  if (phase === "started" || phase === "run_started" || phase === "RUN_STARTED") phase = "start";
  if (phase === "finished" || phase === "run_finished" || phase === "RUN_FINISHED" || phase === "complete") {
    phase = "finish";
  }
  if (phase === "run_error" || phase === "RUN_ERROR" || phase === "failed") phase = "error";
  if (!PHASES.has(phase)) phase = "start";
  const message = asText(props.message) || asText(props.statusMessage) || asText(props.error) || defaultRunLabel(phase);
  return {
    phase,
    message,
    runId: asText(props.runId) || asText(props.id) || ""
  };
}
var RunStatus = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "RunStatus");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const run = normalizeRunStatus(props);
    const reduced = prefersReducedMotion(props, ctx);
    let cls = `canvas-run-status canvas-run-status--${run.phase}`;
    if (reduced) cls += " canvas-run-status--reduced-motion";
    setClass(el, cls);
    el.setAttribute("data-phase", run.phase);
    if (run.runId) el.setAttribute("data-run-id", run.runId);
    else el.removeAttribute("data-run-id");
    clearChildren(el);
    const live = doc.createElement("div");
    live.setAttribute("class", "canvas-run-status__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.textContent = run.message;
    el.appendChild(live);
    const row = doc.createElement("div");
    row.setAttribute("class", "canvas-run-status__row");
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-run-status__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = run.phase === "error" ? "!" : run.phase === "finish" ? "\u2713" : "\u25B6";
    row.appendChild(icon);
    const label = doc.createElement("span");
    label.setAttribute("class", "canvas-run-status__label");
    label.textContent = run.message;
    row.appendChild(label);
    el.appendChild(row);
    if (run.phase === "error" && asText(props.detail)) {
      const detail = doc.createElement("pre");
      detail.setAttribute("class", "canvas-run-status__detail");
      detail.textContent = asText(props.detail);
      el.appendChild(detail);
    }
  }
});

// src/Browser/components/tools/registerTools.js
var TOOL_COMPONENTS = {
  ToolActivity,
  RunStatus,
  // Aliases matching stream event vocabulary
  ToolCall: ToolActivity,
  ToolResult: {
    create(props = {}, ctx = {}) {
      return ToolActivity.create({ ...props, status: props.status || "result" }, ctx);
    },
    update(el, props = {}, ctx = {}) {
      return ToolActivity.update(el, { ...props, status: props.status || "result" }, ctx);
    },
    destroy(el, ctx = {}) {
      return ToolActivity.destroy(el, ctx);
    },
    ownsChildren: true
  }
};
function registerTools(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTools: registry with register() required");
  }
  for (const [type, entry] of Object.entries(TOOL_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var registerTools_default = registerTools;
export {
  RunStatus,
  TOOL_COMPONENTS,
  ToolActivity,
  balanceOpenJSON,
  registerTools_default as default,
  isPartialJsonString,
  isSensitiveKey,
  partialJSONParse,
  redactForDisplay,
  redactValue,
  registerTools
};

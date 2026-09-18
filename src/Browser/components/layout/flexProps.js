/**
 * Shared flex layout prop → class / data-attr mapping for Stack + Card.
 * Tokens: --canvas-space-* (see public/assets/css/tokens.css).
 */

/** @type {Record<string, string>} */
export const GAP_TOKENS = {
  none: "none",
  xs: "xs",
  s: "s",
  m: "m",
  md: "m", // library.v1 default alias
  l: "l",
  xl: "xl",
  "2xl": "2xl",
};

/** @type {Set<string>} */
const DIRECTIONS = new Set(["row", "column"]);

/** @type {Set<string>} */
const ALIGNS = new Set(["start", "center", "end", "stretch", "baseline"]);

/** @type {Set<string>} */
const JUSTIFIES = new Set([
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
]);

/**
 * @param {unknown} value
 * @param {string} fallback
 * @param {Set<string>} allowed
 */
function pick(value, fallback, allowed) {
  if (typeof value === "string" && allowed.has(value)) return value;
  return fallback;
}

/**
 * Normalize flex props (upstream Stack / Card + library defaults).
 * @param {Record<string, unknown>} [props]
 */
export function normalizeFlexProps(props = {}) {
  const direction = pick(props.direction, "column", DIRECTIONS);
  const gapKey =
    typeof props.gap === "string" && props.gap in GAP_TOKENS
      ? GAP_TOKENS[props.gap]
      : "m";
  const align = pick(props.align, "stretch", ALIGNS);
  let justify = pick(props.justify, "start", JUSTIFIES);
  const wrap = props.wrap === true;
  // Upstream: wrap + between → start (avoid space-between collapse when wrapping).
  if (wrap && justify === "between") justify = "start";
  return { direction, gap: gapKey, align, justify, wrap };
}

/**
 * Apply flex data-attrs + modifier classes onto an element.
 * @param {Element} el
 * @param {Record<string, unknown>} [props]
 * @param {{ baseClass: string, extraClasses?: string[] }} opts
 */
export function applyFlexDom(el, props, opts) {
  const flex = normalizeFlexProps(props);
  const classes = [
    opts.baseClass,
    `${opts.baseClass}--dir-${flex.direction}`,
    `${opts.baseClass}--gap-${flex.gap}`,
    `${opts.baseClass}--align-${flex.align}`,
    `${opts.baseClass}--justify-${flex.justify}`,
    flex.wrap ? `${opts.baseClass}--wrap` : null,
    ...(opts.extraClasses ?? []),
  ].filter(Boolean);

  el.setAttribute("class", classes.join(" "));
  el.setAttribute("data-direction", flex.direction);
  el.setAttribute("data-gap", flex.gap);
  el.setAttribute("data-align", flex.align);
  el.setAttribute("data-justify", flex.justify);
  if (flex.wrap) el.setAttribute("data-wrap", "1");
  else el.removeAttribute("data-wrap");
  return flex;
}

/**
 * Children from props (direct lifecycle / props.children path).
 * @param {Record<string, unknown>} [props]
 * @returns {unknown[] | null}
 */
export function propsChildren(props = {}) {
  return Array.isArray(props.children) ? props.children : null;
}

/**
 * Render props.children when present (reconciler still owns vnode.children).
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
export function renderPropsChildren(el, props, ctx) {
  const kids = propsChildren(props);
  if (!kids) return;
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el, kids);
  }
}

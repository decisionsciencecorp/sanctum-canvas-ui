/**
 * Size measure — ResizeObserver when present, otherwise stub defaults.
 */

/**
 * @typedef {{ width: number, height: number }} ChartSize
 */

/**
 * @param {Element} el
 * @param {(size: ChartSize) => void} onSize
 * @param {{ width?: number, height?: number }} [defaults]
 * @returns {{ disconnect: () => void, getSize: () => ChartSize }}
 */
export function observeSize(el, onSize, defaults = {}) {
  const fallbackW = Number(defaults.width) || 320;
  const fallbackH = Number(defaults.height) || 240;

  const read = () => {
    const w =
      Number(el.clientWidth) ||
      Number(/** @type {any} */ (el).offsetWidth) ||
      fallbackW;
    const h =
      Number(el.clientHeight) ||
      Number(/** @type {any} */ (el).offsetHeight) ||
      fallbackH;
    return {
      width: Math.max(40, w),
      height: Math.max(40, h),
    };
  };

  let current = read();
  onSize(current);

  /** @type {{ disconnect: () => void } | null} */
  let observer = null;
  const RO = globalThis.ResizeObserver;
  if (typeof RO === "function") {
    const ro = new RO(() => {
      current = read();
      onSize(current);
    });
    try {
      ro.observe(el);
      observer = ro;
    } catch {
      observer = null;
    }
  }

  return {
    disconnect() {
      observer?.disconnect?.();
      observer = null;
    },
    getSize() {
      return current;
    },
  };
}

/**
 * Resolve chart pixel size from props + measured host.
 * @param {Record<string, unknown>} props
 * @param {ChartSize} measured
 * @returns {ChartSize}
 */
export function resolveChartSize(props, measured) {
  const height = Number(props.height);
  const width = Number(props.width);
  return {
    width: Number.isFinite(width) && width > 0 ? width : measured.width,
    height: Number.isFinite(height) && height > 0 ? height : measured.height || 240,
  };
}

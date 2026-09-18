// Reactive state store for Canvas UI runtime ($variables, form fields).
// Ported from old/packages/lang-core/src/runtime/store.ts — Sanctum EventTarget surface.

export const STORE_CHANGE = "sanctum:store-change";

/**
 * @returns {Store & EventTarget}
 */
export function createStore() {
  const emitter = new EventTarget();
  /** @type {Map<string, unknown>} */
  const state = new Map();
  /** @type {Record<string, unknown>} */
  let declaredDefaults = {};
  /** @type {Record<string, unknown>} */
  let snapshot = {};
  let batchDepth = 0;
  let pendingNotify = false;
  let disposed = false;

  function rebuildSnapshot() {
    snapshot = Object.fromEntries(state);
  }

  function dispatchChange() {
    if (disposed) return;
    emitter.dispatchEvent(new Event(STORE_CHANGE));
  }

  function flushPendingNotify() {
    if (pendingNotify && batchDepth === 0) {
      pendingNotify = false;
      dispatchChange();
    }
  }

  function scheduleNotify() {
    if (disposed) return;
    if (batchDepth > 0) {
      pendingNotify = true;
      return;
    }
    dispatchChange();
  }

  /**
   * @param {unknown} existing
   * @param {unknown} value
   * @returns {boolean}
   */
  function shouldSkipSet(existing, value) {
    if (Object.is(existing, value)) return true;
    if (
      value &&
      existing &&
      typeof value === "object" &&
      typeof existing === "object" &&
      !Array.isArray(value) &&
      !Array.isArray(existing)
    ) {
      const nk = Object.keys(value);
      const ok = Object.keys(existing);
      if (
        nk.length === ok.length &&
        nk.every((k) => Object.is(value[k], existing[k]))
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {string} name
   * @param {unknown} value
   * @returns {boolean} whether state changed
   */
  function setInternal(name, value) {
    const existing = state.get(name);
    if (shouldSkipSet(existing, value)) return false;
    state.set(name, value);
    rebuildSnapshot();
    return true;
  }

  function get(name) {
    return state.get(name);
  }

  function set(name, value) {
    if (setInternal(name, value)) scheduleNotify();
  }

  function subscribe(listener) {
    const onEvent = () => listener();
    emitter.addEventListener(STORE_CHANGE, onEvent);
    return () => emitter.removeEventListener(STORE_CHANGE, onEvent);
  }

  function getSnapshot() {
    return snapshot;
  }

  /**
   * Apply persisted values, then stream defaults for keys not yet in state.
   * User-modified keys are never overwritten by later initialize calls.
   *
   * @param {Record<string, unknown>} defaults
   * @param {Record<string, unknown>} persisted
   */
  function initialize(defaults, persisted) {
    batch(() => {
      for (const key of Object.keys(persisted)) {
        setInternal(key, persisted[key]);
      }
      declaredDefaults = { ...declaredDefaults, ...defaults };
      for (const key of Object.keys(defaults)) {
        if (!state.has(key)) {
          setInternal(key, defaults[key]);
        }
      }
    });
    scheduleNotify();
  }

  /**
   * @param {string[] | undefined} targets
   */
  function reset(targets) {
    const keys =
      targets && targets.length > 0
        ? targets
        : Object.keys(declaredDefaults);
    batch(() => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(declaredDefaults, key)) {
          set(key, declaredDefaults[key]);
        }
      }
    });
  }

  /**
   * @param {() => void} fn
   */
  function batch(fn) {
    if (disposed) return;
    batchDepth += 1;
    try {
      fn();
    } finally {
      batchDepth -= 1;
      flushPendingNotify();
    }
  }

  function transaction(fn) {
    batch(fn);
  }

  function dispose() {
    disposed = true;
    state.clear();
    declaredDefaults = {};
    snapshot = {};
    pendingNotify = false;
  }

  const store = {
    get,
    set,
    subscribe,
    getSnapshot,
    initialize,
    reset,
    batch,
    transaction,
    dispose,
    addEventListener(type, listener, options) {
      return emitter.addEventListener(type, listener, options);
    },
    removeEventListener(type, listener, options) {
      return emitter.removeEventListener(type, listener, options);
    },
    dispatchEvent(event) {
      return emitter.dispatchEvent(event);
    },
  };

  return store;
}

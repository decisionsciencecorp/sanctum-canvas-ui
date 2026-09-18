/**
 * Reactive two-way bindings + form field registry (A3.4).
 */

/**
 * @param {import('./store.js').ReturnType<typeof createStore>} store
 * @param {{ isReactive?: (component: string, prop: string) => boolean }} [opts]
 */
export function createBindingManager(store, opts = {}) {
  /** @type {Map<string, { form: string, name: string, componentType: string }>} */
  const fields = new Map();
  let disposed = false;

  function fieldKey(form, name) {
    return `${form}::${name}`;
  }

  /**
   * Register a form field only when defining node is complete.
   */
  function registerField(form, name, componentType, initial) {
    if (disposed) return;
    const key = fieldKey(form, name);
    fields.set(key, { form, name, componentType });
    const path = `$${form}.${name}`;
    if (store.get(path) === undefined && initial !== undefined) {
      store.set(path, { value: initial, componentType });
    }
  }

  function unregisterField(form, name) {
    fields.delete(fieldKey(form, name));
  }

  function setFieldValue(form, name, value) {
    const meta = fields.get(fieldKey(form, name));
    const componentType = meta?.componentType ?? "unknown";
    store.set(`$${form}.${name}`, { value, componentType });
  }

  function getFieldValue(form, name) {
    const entry = store.get(`$${form}.${name}`);
    return entry && typeof entry === "object" ? entry.value : entry;
  }

  /**
   * Bind a reactive prop: reading returns store value; writing updates store.
   */
  function bind(targetStateName) {
    return {
      get: () => store.get(targetStateName),
      set: (v) => store.set(targetStateName, v),
    };
  }

  function dispose() {
    disposed = true;
    fields.clear();
  }

  return {
    registerField,
    unregisterField,
    setFieldValue,
    getFieldValue,
    bind,
    dispose,
    _fieldCount: () => fields.size,
  };
}

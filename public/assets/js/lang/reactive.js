/** WeakSet tracks reactive schemas without mutating the schema objects. */
const reactiveSchemas = new WeakSet();

/** Mark a schema as reactive (framework adapters). Returns the same schema. */
export function markReactive(schema) {
  reactiveSchemas.add(schema);
  return schema;
}

/** Check if a schema was marked reactive. */
export function isReactiveSchema(schema) {
  return typeof schema === "object" && schema !== null && reactiveSchemas.has(schema);
}

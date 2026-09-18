/**
 * Convert Sanctum library JSON → OpenUI LibraryJSONSchema ($defs)
 * preserving propertyOrder as object key insertion order.
 */
export function libraryToJsonSchema(library) {
  const defs = {};
  for (const [name, comp] of Object.entries(library.components)) {
    const properties = {};
    for (const prop of comp.propertyOrder) {
      properties[prop] = comp.properties[prop] || { type: "any" };
    }
    defs[name] = {
      type: "object",
      properties,
      required: comp.required || [],
      additionalProperties: false,
      description: comp.prompt?.description,
    };
  }
  return { $defs: defs };
}

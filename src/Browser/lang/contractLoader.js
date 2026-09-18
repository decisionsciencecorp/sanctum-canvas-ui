/**
 * Browser twin of Sanctum\Canvas\Php\Library\ContractLoader.
 * Same library JSON; no separate schema source.
 */

/**
 * @param {unknown} library
 */
export function validateLibrary(library) {
  if (!library || typeof library !== "object") {
    throw new Error("Library root must be an object");
  }
  for (const key of ["contractFormatVersion", "id", "variant", "root", "components"]) {
    if (!(key in library)) {
      throw new Error(`Library missing required field: ${key}`);
    }
  }
  const components = library.components;
  if (!components || typeof components !== "object") {
    throw new Error("components must be an object/map");
  }
  for (const [key, component] of Object.entries(components)) {
    validateComponent(key, component);
  }
  if (!(library.root in components)) {
    throw new Error(`root component '${library.root}' is not in components`);
  }
  return library;
}

/**
 * @param {string} key
 * @param {any} component
 */
export function validateComponent(key, component) {
  for (const field of [
    "name",
    "version",
    "propertyOrder",
    "properties",
    "required",
    "reactiveProps",
    "renderer",
    "securityCapabilities",
    "prompt",
  ]) {
    if (!(field in component)) {
      throw new Error(`Component ${key} missing field: ${field}`);
    }
  }
  if (component.name !== key) {
    throw new Error(`Component key '${key}' must equal name`);
  }
  if (!Array.isArray(component.propertyOrder)) {
    throw new Error(`${key}.propertyOrder must be an array`);
  }
  if (!("allowedChildren" in component)) {
    throw new Error(`${key}.allowedChildren is required (null for leaf)`);
  }
  if (!Array.isArray(component.reactiveProps)) {
    throw new Error(`${key}.reactiveProps must be an array (use [] if none)`);
  }
  for (const prop of component.propertyOrder) {
    if (!(prop in component.properties)) {
      throw new Error(`${key}.propertyOrder lists '${prop}' but properties map lacks it`);
    }
  }
  for (const prop of Object.keys(component.properties)) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.properties has '${prop}' missing from propertyOrder`);
    }
  }
  for (const prop of component.reactiveProps) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.reactiveProps '${prop}' is not in propertyOrder`);
    }
  }
  for (const prop of component.required) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.required '${prop}' is not in propertyOrder`);
    }
  }
}

/**
 * @param {any} component
 * @param {any[]} args
 */
export function mapPositionalArgs(component, args) {
  const out = {};
  component.propertyOrder.forEach((name, i) => {
    if (i in args) {
      out[name] = args[i];
    } else if (component.properties[name] && "default" in component.properties[name]) {
      out[name] = component.properties[name].default;
    }
  });
  return out;
}

export function isReactive(component, prop) {
  return (component.reactiveProps || []).includes(prop);
}

/**
 * @param {string} jsonText
 */
export function loadLibraryJson(jsonText) {
  return validateLibrary(JSON.parse(jsonText));
}

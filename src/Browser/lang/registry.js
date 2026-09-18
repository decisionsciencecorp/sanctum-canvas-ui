/**
 * Browser registry metadata over the same library JSON as PHP.
 */
import { validateLibrary, isReactive, mapPositionalArgs } from "./contractLoader.js";

/**
 * @param {any} library
 */
export function createRegistry(library) {
  validateLibrary(library);
  const byName = library.components;
  return {
    root: library.root,
    variant: library.variant,
    get(name) {
      return byName[name] || null;
    },
    has(name) {
      return Object.prototype.hasOwnProperty.call(byName, name);
    },
    names() {
      return Object.keys(byName).sort();
    },
    isReactive(name, prop) {
      const c = byName[name];
      return c ? isReactive(c, prop) : false;
    },
    mapArgs(name, args) {
      const c = byName[name];
      if (!c) throw new Error(`Unknown component: ${name}`);
      return mapPositionalArgs(c, args);
    },
    rendererOf(name) {
      return byName[name]?.renderer ?? null;
    },
  };
}

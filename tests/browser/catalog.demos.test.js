/**
 * Catalog demos cover every name in both library.v1.json files.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoFor, demoNames } from "../../public/lab/catalog-demos.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadNames(variant) {
  const lib = JSON.parse(
    readFileSync(join(root, `resources/libraries/${variant}/library.v1.json`), "utf8"),
  );
  return Object.keys(lib.components).sort();
}

describe("catalog live demos", () => {
  it("has a demo for every dashboard and chat component", () => {
    const covered = new Set(demoNames());
    for (const variant of ["dashboard", "chat"]) {
      for (const name of loadNames(variant)) {
        assert.ok(covered.has(name), `${variant}: missing demo for ${name}`);
        assert.ok(demoFor(name)?.vnode, `${variant}: ${name} has no vnode`);
      }
    }
  });

  it("does not invent demos for unknown names", () => {
    assert.equal(demoFor("NotARealComponent"), null);
  });
});

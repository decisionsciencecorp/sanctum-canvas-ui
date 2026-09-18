/**
 * Node-only test runner for browser contract loader (dev/CI — not a product dependency).
 * Run: node --test tests/browser/contractLoader.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadLibraryJson,
  mapPositionalArgs,
  isReactive,
  validateComponent,
} from "../../src/Browser/lang/contractLoader.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const examples = readFileSync(
  join(root, "resources/libraries/dashboard/library.examples.json"),
  "utf8",
);

describe("contractLoader", () => {
  it("loads examples library with explicit propertyOrder and reactiveProps", () => {
    const lib = loadLibraryJson(examples);
    assert.equal(lib.root, "Stack");
    assert.deepEqual(lib.components.Input.propertyOrder, [
      "name",
      "placeholder",
      "type",
      "rules",
      "value",
    ]);
    assert.deepEqual(lib.components.Input.reactiveProps, ["value"]);
    assert.equal(isReactive(lib.components.Input, "value"), true);
  });

  it("maps positional args by propertyOrder", () => {
    const lib = loadLibraryJson(examples);
    const mapped = mapPositionalArgs(lib.components.Input, ["email", "x"]);
    assert.equal(mapped.name, "email");
    assert.equal(mapped.placeholder, "x");
  });

  it("rejects component missing reactiveProps array", () => {
    assert.throws(() =>
      validateComponent("X", {
        name: "X",
        version: "1",
        propertyOrder: ["a"],
        properties: { a: { type: "string" } },
        required: [],
        renderer: "x.js",
        securityCapabilities: [],
        prompt: { description: "d" },
        allowedChildren: null,
      }),
    );
  });
});

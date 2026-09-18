import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRegistry } from "../../src/Browser/lang/registry.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lib = JSON.parse(
  readFileSync(join(root, "resources/libraries/dashboard/library.examples.json"), "utf8"),
);

describe("lang registry", () => {
  it("exposes root and reactive metadata", () => {
    const reg = createRegistry(lib);
    assert.equal(reg.root, "Stack");
    assert.equal(reg.has("Input"), true);
    assert.equal(reg.isReactive("Input", "value"), true);
    assert.equal(reg.rendererOf("Button"), "components/Button.js");
    assert.deepEqual(reg.mapArgs("Input", ["n"]), { name: "n" });
  });
});

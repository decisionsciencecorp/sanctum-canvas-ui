import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateLibrary,
  validateComponent,
  mapPositionalArgs,
  loadLibraryJson,
  isReactive,
} from "../../src/Browser/lang/contractLoader.js";

function baseComponent(name, overrides = {}) {
  return {
    name,
    version: "1",
    propertyOrder: ["a"],
    properties: { a: { type: "string", default: "dflt" } },
    required: [],
    reactiveProps: [],
    allowedChildren: null,
    renderer: "x.js",
    securityCapabilities: [],
    prompt: { description: "x" },
    ...overrides,
  };
}

function minimalLibrary(root, components) {
  return {
    contractFormatVersion: "1",
    id: "test",
    variant: "default",
    root,
    components,
  };
}

describe("contractLoader validation coverage", () => {
  it("validateLibrary rejects non-object root", () => {
    assert.throws(() => validateLibrary(null), /object/);
    assert.throws(() => validateLibrary("x"), /object/);
  });

  it("validateLibrary requires top-level fields", () => {
    assert.throws(() => validateLibrary({ id: "x" }), /contractFormatVersion/);
  });

  it("validateLibrary requires components object and valid root", () => {
    const lib = minimalLibrary("Missing", { Stack: baseComponent("Stack") });
    assert.throws(() => validateLibrary(lib), /root component/);
    assert.throws(
      () => validateLibrary({ ...lib, components: null }),
      /components must be an object/,
    );
  });

  it("validateComponent field and consistency errors", () => {
    assert.throws(() => validateComponent("X", { name: "Y" }), /missing field/);
    assert.throws(
      () => validateComponent("X", baseComponent("Y")),
      /must equal name/,
    );
    assert.throws(
      () =>
        validateComponent(
          "X",
          baseComponent("X", { propertyOrder: "not-array" }),
        ),
      /propertyOrder must be an array/,
    );
    const noAllowed = baseComponent("X");
    delete noAllowed.allowedChildren;
    assert.throws(() => validateComponent("X", noAllowed), /allowedChildren is required/);
    assert.throws(
      () =>
        validateComponent("X", baseComponent("X", { reactiveProps: "nope" })),
      /reactiveProps must be an array/,
    );
    assert.throws(
      () =>
        validateComponent(
          "X",
          baseComponent("X", {
            propertyOrder: ["a", "b"],
            properties: { a: { type: "string" } },
          }),
        ),
      /propertyOrder lists/,
    );
    assert.throws(
      () =>
        validateComponent(
          "X",
          baseComponent("X", {
            propertyOrder: ["a"],
            properties: { a: { type: "string" }, b: { type: "string" } },
          }),
        ),
      /missing from propertyOrder/,
    );
    assert.throws(
      () =>
        validateComponent(
          "X",
          baseComponent("X", {
            propertyOrder: ["a"],
            reactiveProps: ["ghost"],
          }),
        ),
      /reactiveProps/,
    );
    assert.throws(
      () =>
        validateComponent(
          "X",
          baseComponent("X", {
            propertyOrder: ["a"],
            required: ["missing"],
          }),
        ),
      /required/,
    );
  });

  it("mapPositionalArgs applies property defaults", () => {
    const comp = baseComponent("X", {
      propertyOrder: ["a", "b"],
      properties: {
        a: { type: "string" },
        b: { type: "string", default: "from-default" },
      },
    });
    const mapped = mapPositionalArgs(comp, ["only-a"]);
    assert.equal(mapped.a, "only-a");
    assert.equal(mapped.b, "from-default");
  });

  it("isReactive handles missing reactiveProps", () => {
    assert.equal(isReactive({ reactiveProps: ["x"] }, "x"), true);
    assert.equal(isReactive({}, "x"), false);
  });

  it("loadLibraryJson parses JSON text", () => {
    const lib = minimalLibrary("Stack", { Stack: baseComponent("Stack") });
    const loaded = loadLibraryJson(JSON.stringify(lib));
    assert.equal(loaded.root, "Stack");
  });
});

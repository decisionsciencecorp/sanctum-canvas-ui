import { isASTNode } from "./ast.js";
import {
  isElementNode
} from "./types.js";
const SCALAR_TYPEOFS = ["string", "number", "boolean"];
const NO_PROPS = {};
const NO_REQUIRED = [];
function jsType(value) {
  return Array.isArray(value) ? "array" : typeof value;
}
function isCompositeSchema(s) {
  return "$ref" in s || "anyOf" in s || "oneOf" in s || "allOf" in s;
}
function getScalarTypeInfo(s) {
  if (Array.isArray(s["enum"])) return { enumValues: s["enum"] };
  if ("const" in s) return { enumValues: [s["const"]] };
  switch (s["type"]) {
    case "string":
      return { expectedType: "string" };
    case "number":
    case "integer":
      return { expectedType: "number" };
    case "boolean":
      return { expectedType: "boolean" };
    default:
      return {};
  }
}
function getSchemaDefaultValue(property) {
  if (!property || typeof property !== "object" || Array.isArray(property)) {
    return void 0;
  }
  return property.default;
}
function getTypeFromSchema(property) {
  if (!property || typeof property !== "object" || Array.isArray(property)) {
    return void 0;
  }
  const p = property;
  if (typeof p.$ref === "string") {
    return p.$ref.split("/").pop();
  }
  const leaf = getScalarTypeInfo(p);
  if (leaf.enumValues) {
    return leaf.enumValues.map((v) => JSON.stringify(v)).join("|");
  }
  if (leaf.expectedType) {
    return leaf.expectedType;
  }
  return typeof p.type === "string" ? p.type : void 0;
}
function buildParamsSignature(component, params) {
  const rendered = params.map((p) => {
    const type = getTypeFromSchema(p.schema);
    const marked = p.required ? `${p.name}*` : p.name;
    return type ? `${marked}: ${type}` : marked;
  }).join(", ");
  return `${component}(${rendered})`;
}
function checkTypeMismatch(value, info) {
  const actual = typeof value;
  if (info.enumValues) {
    if (!SCALAR_TYPEOFS.includes(actual)) return null;
    if (info.enumValues.includes(value)) return null;
    return {
      expected: `one of [${info.enumValues.map((v) => JSON.stringify(v)).join(", ")}]`,
      actual: JSON.stringify(value)
    };
  }
  if (info.expectedType && info.expectedType !== actual) {
    return { expected: info.expectedType, actual: jsType(value) };
  }
  return null;
}
function validationMessage(component, path, issue) {
  switch (issue.code) {
    case "type-mismatch":
      return `field "${path}" expects ${issue.expected} but got ${issue.actual}`;
    case "missing-required":
      return `missing required field "${path}"${issue.signature ? ` \u2014 signature: ${issue.signature}` : ""}`;
    case "null-required":
      return `required field "${path}" cannot be null${issue.signature ? ` \u2014 signature: ${issue.signature}` : ""}`;
    case "unknown-component":
      return `Unknown component "${component}" \u2014 not found in catalog or builtins${issue.available?.length ? `. Available components: ${issue.available.join(", ")}` : ""}`;
    case "inline-reserved":
      return `${component}() must be declared as a top-level statement, not used inline as a value`;
    case "excess-args":
      return `${component} takes ${issue.declared} arg(s), got ${issue.got} (${issue.got - issue.declared} excess dropped)`;
  }
}
function pushValidationIssue(ctx, component, path, issue) {
  ctx.errors.push({
    code: issue.code,
    component,
    path,
    message: validationMessage(component, path, issue),
    statementId: ctx.currentStatementId
  });
}
function resolveInvalidValue(container, key, required, defaultValue) {
  if (defaultValue !== void 0) {
    container[key] = defaultValue;
    return false;
  }
  if (required) return true;
  delete container[key];
  return false;
}
function validateElementPosition(element, s, component, path, ctx) {
  if (isCompositeSchema(s)) return false;
  if (typeof s["type"] === "string" || Array.isArray(s["enum"]) || "const" in s) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: typeof s["type"] === "string" ? s["type"] : "a literal value",
      actual: `component "${element.typeName}"`
    });
    return true;
  }
  return false;
}
function validateObjectValue(value, s, component, path, ctx) {
  if (typeof value !== "object" || Array.isArray(value)) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: "object",
      actual: jsType(value)
    });
    return true;
  }
  const obj = value;
  const props = s["properties"] && typeof s["properties"] === "object" ? s["properties"] : NO_PROPS;
  const required = Array.isArray(s["required"]) ? s["required"] : NO_REQUIRED;
  let invalid = false;
  if (!ctx.partial) {
    for (const key of required) {
      const present = key in obj;
      if (!present || obj[key] == null) {
        const fallback = getSchemaDefaultValue(props[key]);
        if (fallback !== void 0) {
          obj[key] = fallback;
          continue;
        }
        pushValidationIssue(ctx, component, `${path}/${key}`, {
          code: present ? "null-required" : "missing-required"
        });
        invalid = true;
      }
    }
  }
  for (const key of Object.keys(props)) {
    if (key in obj) {
      const sub = props[key];
      if (validateSchemaValue(obj[key], sub, component, `${path}/${key}`, ctx)) {
        if (resolveInvalidValue(obj, key, required.includes(key), getSchemaDefaultValue(sub))) {
          invalid = true;
        }
      }
    }
  }
  return invalid;
}
function validateArrayValue(value, s, component, path, ctx) {
  if (!Array.isArray(value)) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: "array",
      actual: jsType(value)
    });
    return true;
  }
  const items = s["items"];
  if (!items || typeof items !== "object" || Array.isArray(items)) return false;
  let invalid;
  for (let i = 0; i < value.length; i++) {
    if (validateSchemaValue(value[i], items, component, `${path}/${i}`, ctx)) {
      (invalid ??= []).push(i);
    }
  }
  if (invalid) {
    for (let i = invalid.length - 1; i >= 0; i--) value.splice(invalid[i], 1);
  }
  return false;
}
function validateLeafValue(value, s, component, path, ctx) {
  const leaf = getScalarTypeInfo(s);
  if (leaf.expectedType == null && leaf.enumValues == null) return false;
  if (leaf.enumValues && ctx.partial) return false;
  const mismatch = checkTypeMismatch(value, leaf);
  if (mismatch) {
    pushValidationIssue(ctx, component, path, { code: "type-mismatch", ...mismatch });
    return true;
  }
  return false;
}
function validateSchemaValue(value, schema, component, path, ctx) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  const s = schema;
  if (value == null) return false;
  if (isASTNode(value)) return false;
  if (isElementNode(value)) return validateElementPosition(value, s, component, path, ctx);
  if (isCompositeSchema(s)) return false;
  const type = s["type"];
  if (type === "object") return validateObjectValue(value, s, component, path, ctx);
  if (type === "array") return validateArrayValue(value, s, component, path, ctx);
  return validateLeafValue(value, s, component, path, ctx);
}
export {
  buildParamsSignature,
  getScalarTypeInfo,
  getSchemaDefaultValue,
  getTypeFromSchema,
  pushValidationIssue,
  resolveInvalidValue,
  validateSchemaValue
};

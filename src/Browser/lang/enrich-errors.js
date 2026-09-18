function buildSignatureHint(componentName, schema) {
  if (!schema?.properties) return void 0;
  const required = new Set(schema.required ?? []);
  const params = Object.keys(schema.properties).map((k) => required.has(k) ? `${k}*` : k).join(", ");
  return `Signature: ${componentName}(${params}) \u2014 * marks required`;
}
function enrichErrors(validationErrors, schema, componentNames) {
  return validationErrors.map((ve) => {
    const error = {
      source: "parser",
      code: ve.code,
      message: ve.message,
      component: ve.component,
      path: ve.path || void 0,
      statementId: ve.statementId
    };
    if (ve.code === "unknown-component" && componentNames.length) {
      error.hint = `Available components: ${componentNames.join(", ")}`;
    } else if (ve.code === "missing-required" || ve.code === "null-required") {
      error.hint = buildSignatureHint(ve.component, schema.$defs?.[ve.component]);
    } else if (ve.code === "inline-reserved") {
      error.hint = `Declare as a top-level statement: myVar = ${ve.component}(...)`;
    }
    return error;
  });
}
export {
  enrichErrors
};

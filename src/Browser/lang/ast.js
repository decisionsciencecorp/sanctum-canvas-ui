function isRuntimeExpr(node) {
  switch (node.k) {
    case "StateRef":
    case "RuntimeRef":
    case "BinOp":
    case "UnaryOp":
    case "Ternary":
    case "Member":
    case "Index":
    case "Assign":
      return true;
    default:
      return false;
  }
}
const AST_KINDS = /* @__PURE__ */ new Set([
  "Comp",
  "Ref",
  "StateRef",
  "RuntimeRef",
  "BinOp",
  "UnaryOp",
  "Ternary",
  "Member",
  "Index",
  "Assign",
  "Str",
  "Num",
  "Bool",
  "Null",
  "Arr",
  "Obj",
  "Ph"
]);
function isASTNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return AST_KINDS.has(value.k);
}
function walkAST(node, visit) {
  const walk = (current) => {
    visit(current);
    switch (current.k) {
      case "Comp":
        current.args.forEach(walk);
        Object.values(current.mappedProps ?? {}).forEach(walk);
        break;
      case "Arr":
        current.els.forEach(walk);
        break;
      case "Obj":
        current.entries.forEach(([, value]) => walk(value));
        break;
      case "BinOp":
        walk(current.left);
        walk(current.right);
        break;
      case "UnaryOp":
        walk(current.operand);
        break;
      case "Ternary":
        walk(current.cond);
        walk(current.then);
        walk(current.else);
        break;
      case "Member":
        walk(current.obj);
        break;
      case "Index":
        walk(current.obj);
        walk(current.index);
        break;
      case "Assign":
        walk(current.value);
        break;
    }
  };
  walk(node);
}
export {
  isASTNode,
  isRuntimeExpr,
  walkAST
};

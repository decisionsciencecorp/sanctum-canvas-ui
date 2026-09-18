function isElementNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const node = value;
  return node.type === "element" && typeof node.typeName === "string" && typeof node.props === "object" && node.props !== null && typeof node.partial === "boolean";
}
var BuiltinActionType = /* @__PURE__ */ ((BuiltinActionType2) => {
  BuiltinActionType2["ContinueConversation"] = "continue_conversation";
  BuiltinActionType2["OpenUrl"] = "open_url";
  return BuiltinActionType2;
})(BuiltinActionType || {});
export {
  BuiltinActionType,
  isElementNode
};

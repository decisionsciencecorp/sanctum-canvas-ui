import { T } from "./tokens.js";
function autoClose(input) {
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (inStr) {
      if (c === inStr) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" && stack[stack.length - 1] === "(") stack.pop();
    else if (c === "]" && stack[stack.length - 1] === "[") stack.pop();
    else if (c === "}" && stack[stack.length - 1] === "{") stack.pop();
  }
  const wasIncomplete = !!inStr || stack.length > 0;
  if (!wasIncomplete) return { text: input, wasIncomplete: false };
  let out = input;
  if (inStr) {
    if (esc) out += "\\";
    out += inStr;
  }
  for (let j = stack.length - 1; j >= 0; j--)
    out += stack[j] === "(" ? ")" : stack[j] === "[" ? "]" : "}";
  return { text: out, wasIncomplete: true };
}
function split(tokens) {
  const stmts = [];
  let pos = 0;
  while (pos < tokens.length) {
    while (pos < tokens.length && tokens[pos].t === T.Newline) pos++;
    if (pos >= tokens.length || tokens[pos].t === T.EOF) break;
    const tok = tokens[pos];
    if (tok.t !== T.Ident && tok.t !== T.Type && tok.t !== T.StateVar) {
      while (pos < tokens.length && tokens[pos].t !== T.Newline && tokens[pos].t !== T.EOF) pos++;
      continue;
    }
    const id = tok.v;
    const idTokenType = tok.t;
    pos++;
    if (pos >= tokens.length || tokens[pos].t !== T.Equals) {
      while (pos < tokens.length && tokens[pos].t !== T.Newline && tokens[pos].t !== T.EOF) pos++;
      continue;
    }
    pos++;
    const expr = [];
    let depth = 0;
    let ternaryDepth = 0;
    while (pos < tokens.length && tokens[pos].t !== T.EOF) {
      const tt = tokens[pos].t;
      if (tt === T.Newline && depth <= 0 && ternaryDepth <= 0) {
        let peek = pos + 1;
        while (peek < tokens.length && tokens[peek].t === T.Newline) peek++;
        const nextT = peek < tokens.length ? tokens[peek].t : T.EOF;
        if (nextT === T.Question || nextT === T.Colon && ternaryDepth > 0) {
          pos++;
          continue;
        }
        break;
      }
      if (tt === T.Newline) {
        pos++;
        continue;
      }
      if (tt === T.LParen || tt === T.LBrack || tt === T.LBrace) depth++;
      else if ((tt === T.RParen || tt === T.RBrack || tt === T.RBrace) && depth > 0) depth--;
      else if (tt === T.Question && depth === 0) ternaryDepth++;
      else if (tt === T.Colon && depth === 0 && ternaryDepth > 0) ternaryDepth--;
      expr.push(tokens[pos++]);
    }
    if (expr.length) stmts.push({ id, idTokenType, tokens: expr });
  }
  return stmts;
}
export {
  autoClose,
  split
};

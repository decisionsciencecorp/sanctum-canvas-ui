import { isBuiltin } from "./builtins.js";
import { T } from "./tokens.js";
const PREC_TERNARY = 1;
const PREC_OR = 2;
const PREC_AND = 3;
const PREC_EQ = 4;
const PREC_CMP = 5;
const PREC_ADD = 6;
const PREC_MUL = 7;
const PREC_UNARY = 8;
const PREC_MEMBER = 9;
function parseExpression(tokens) {
  let pos = 0;
  const cur = () => tokens[pos] ?? { t: T.EOF };
  const adv = () => {
    const tok = cur();
    pos++;
    return tok;
  };
  const eat = (kind) => {
    if (cur().t === kind) pos++;
  };
  function getInfixPrec(tok) {
    switch (tok.t) {
      case T.Question:
        return PREC_TERNARY;
      case T.Or:
        return PREC_OR;
      case T.And:
        return PREC_AND;
      case T.EqEq:
      case T.NotEq:
        return PREC_EQ;
      case T.Greater:
      case T.Less:
      case T.GreaterEq:
      case T.LessEq:
        return PREC_CMP;
      case T.Plus:
      case T.Minus:
        return PREC_ADD;
      case T.Star:
      case T.Slash:
      case T.Percent:
        return PREC_MUL;
      case T.Dot:
      case T.LBrack:
        return PREC_MEMBER;
      default:
        return 0;
    }
  }
  function parseExpr(minPrec = 0) {
    let left = parsePrefix();
    while (getInfixPrec(cur()) > minPrec) {
      left = parseInfix(left);
    }
    return left;
  }
  function parsePrefix() {
    const tok = cur();
    if (tok.t === T.Str) {
      adv();
      return { k: "Str", v: tok.v };
    }
    if (tok.t === T.Num) {
      adv();
      return { k: "Num", v: tok.v };
    }
    if (tok.t === T.True) {
      adv();
      return { k: "Bool", v: true };
    }
    if (tok.t === T.False) {
      adv();
      return { k: "Bool", v: false };
    }
    if (tok.t === T.Null) {
      adv();
      return { k: "Null" };
    }
    if (tok.t === T.LBrack) return parseArr();
    if (tok.t === T.LBrace) return parseObj();
    if (tok.t === T.StateVar) {
      const name = tok.v;
      adv();
      if (cur().t === T.Equals) {
        adv();
        const value = parseExpr(0);
        return { k: "Assign", target: name, value };
      }
      return { k: "StateRef", n: name };
    }
    if (tok.t === T.Type) {
      const name = tok.v;
      if (tokens[pos + 1]?.t === T.LParen && (!isBuiltin(name) || name === "Action"))
        return parseComp();
      adv();
      return { k: "Ref", n: name };
    }
    if (tok.t === T.BuiltinCall) {
      if (tokens[pos + 1]?.t === T.LParen) return parseComp();
      adv();
      return { k: "Ref", n: tok.v };
    }
    if (tok.t === T.Ident) {
      adv();
      return { k: "Ref", n: tok.v };
    }
    if (tok.t === T.Not) {
      adv();
      return { k: "UnaryOp", op: "!", operand: parseExpr(PREC_UNARY) };
    }
    if (tok.t === T.Minus) {
      adv();
      return { k: "UnaryOp", op: "-", operand: parseExpr(PREC_UNARY) };
    }
    if (tok.t === T.LParen) {
      adv();
      const inner = parseExpr(0);
      eat(T.RParen);
      return inner;
    }
    adv();
    return { k: "Null" };
  }
  function parseInfix(left) {
    const tok = cur();
    if (tok.t === T.Plus) {
      adv();
      return { k: "BinOp", op: "+", left, right: parseExpr(PREC_ADD) };
    }
    if (tok.t === T.Minus) {
      adv();
      return { k: "BinOp", op: "-", left, right: parseExpr(PREC_ADD) };
    }
    if (tok.t === T.Star) {
      adv();
      return { k: "BinOp", op: "*", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.Slash) {
      adv();
      return { k: "BinOp", op: "/", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.Percent) {
      adv();
      return { k: "BinOp", op: "%", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.EqEq) {
      adv();
      return { k: "BinOp", op: "==", left, right: parseExpr(PREC_EQ) };
    }
    if (tok.t === T.NotEq) {
      adv();
      return { k: "BinOp", op: "!=", left, right: parseExpr(PREC_EQ) };
    }
    if (tok.t === T.Greater) {
      adv();
      return { k: "BinOp", op: ">", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.Less) {
      adv();
      return { k: "BinOp", op: "<", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.GreaterEq) {
      adv();
      return { k: "BinOp", op: ">=", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.LessEq) {
      adv();
      return { k: "BinOp", op: "<=", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.And) {
      adv();
      return { k: "BinOp", op: "&&", left, right: parseExpr(PREC_AND) };
    }
    if (tok.t === T.Or) {
      adv();
      return { k: "BinOp", op: "||", left, right: parseExpr(PREC_OR) };
    }
    if (tok.t === T.Question) {
      adv();
      const then = parseExpr(0);
      eat(T.Colon);
      const els = parseExpr(0);
      return { k: "Ternary", cond: left, then, else: els };
    }
    if (tok.t === T.Dot) {
      adv();
      const fieldTok = cur();
      const field = fieldTok.t === T.Ident || fieldTok.t === T.Type || fieldTok.t === T.Str || fieldTok.t === T.Num ? (adv(), String(fieldTok.v)) : fieldTok.t === T.StateVar ? (adv(), fieldTok.v.replace(/^\$/, "")) : (adv(), "?");
      return { k: "Member", obj: left, field };
    }
    if (tok.t === T.LBrack) {
      adv();
      const index = parseExpr(0);
      eat(T.RBrack);
      return { k: "Index", obj: left, index };
    }
    return left;
  }
  function parseComp() {
    const name = cur().v;
    adv();
    eat(T.LParen);
    const args = [];
    while (cur().t !== T.RParen && cur().t !== T.EOF) {
      args.push(parseExpr(0));
      if (cur().t === T.Comma) adv();
    }
    eat(T.RParen);
    return { k: "Comp", name, args };
  }
  function parseArr() {
    adv();
    const els = [];
    while (cur().t !== T.RBrack && cur().t !== T.EOF) {
      els.push(parseExpr(0));
      if (cur().t === T.Comma) adv();
    }
    eat(T.RBrack);
    return { k: "Arr", els };
  }
  function parseObj() {
    adv();
    const entries = [];
    while (cur().t !== T.RBrace && cur().t !== T.EOF) {
      const kt = cur();
      const key = kt.t === T.Ident || kt.t === T.Str || kt.t === T.Type || kt.t === T.Num ? (adv(), String(kt.v)) : kt.t === T.StateVar ? (adv(), kt.v.replace(/^\$/, "")) : (adv(), "?");
      eat(T.Colon);
      entries.push([key, parseExpr(0)]);
      if (cur().t === T.Comma) adv();
    }
    eat(T.RBrace);
    return { k: "Obj", entries };
  }
  return parseExpr(0);
}
export {
  parseExpression
};

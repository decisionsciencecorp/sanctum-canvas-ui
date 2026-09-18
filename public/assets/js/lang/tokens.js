/** Numeric token discriminants kept byte-compatible with upstream ee54f66. */
export const T = Object.freeze({
  Newline: 0,
  LParen: 1,
  RParen: 2,
  LBrack: 3,
  RBrack: 4,
  LBrace: 5,
  RBrace: 6,
  Comma: 7,
  Colon: 8,
  Equals: 9,
  True: 10,
  False: 11,
  Null: 12,
  EOF: 13,
  Str: 14,
  Num: 15,
  Ident: 16,
  Type: 17,
  StateVar: 18,
  Dot: 19,
  Plus: 20,
  Minus: 21,
  Star: 22,
  Slash: 23,
  Percent: 24,
  EqEq: 25,
  NotEq: 26,
  Greater: 27,
  Less: 28,
  GreaterEq: 29,
  LessEq: 30,
  And: 31,
  Or: 32,
  Not: 33,
  Question: 34,
  BuiltinCall: 35,
});

export const TOKEN_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(T).map(([name, value]) => [value, name])),
);

export function tokenLocation(token) {
  return {
    offset: token.start,
    endOffset: token.end,
    line: token.line,
    column: token.column,
  };
}

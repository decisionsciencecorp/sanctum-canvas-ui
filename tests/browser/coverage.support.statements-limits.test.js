import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { autoClose, split } from "../../src/Browser/lang/statements.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import {
  checkSourceLimits,
  checkStatementCount,
  DEFAULT_LIMITS,
} from "../../src/Browser/lang/limits.js";

describe("statements autoClose and split", () => {
  it("autoClose completes strings brackets and handles escapes", () => {
    const plain = autoClose('root = Title("ok")');
    assert.equal(plain.wasIncomplete, false);
    assert.equal(plain.text, 'root = Title("ok")');

    const unclosedStr = autoClose('x = "hello');
    assert.equal(unclosedStr.wasIncomplete, true);
    assert.ok(unclosedStr.text.endsWith('"'));

    const escEnd = autoClose('x = "line\\');
    assert.equal(escEnd.wasIncomplete, true);

    const openParen = autoClose("root = Stack([");
    assert.equal(openParen.wasIncomplete, true);
    assert.ok(openParen.text.includes("])"));

    const escapedInStr = autoClose('t = "a\\"b');
    assert.equal(escapedInStr.wasIncomplete, true);
  });

  it("split skips invalid statement starts and missing equals", () => {
    const toks = tokenize('!!!\nnotstmt\nfoo\nbar = 1\n');
    const stmts = split(toks);
    assert.equal(stmts.length, 1);
    assert.equal(stmts[0].id, "bar");
  });

  it("split keeps newlines inside grouped expressions", () => {
    const src = "x = (1 +\n2)\n";
    const stmts = split(tokenize(src));
    assert.equal(stmts.length, 1);
    assert.equal(stmts[0].id, "x");
    assert.ok(stmts[0].tokens.length >= 3);
  });

  it("split handles ternary continued on next lines", () => {
    const src = "flag = true\n? \"a\"\n: \"b\"\n";
    const stmts = split(tokenize(src));
    assert.equal(stmts.length, 1);
    assert.equal(stmts[0].id, "flag");
  });
});

describe("limits helpers", () => {
  it("checkSourceLimits rejects non-string input", () => {
    const r = checkSourceLimits(42);
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "invalid-input");
  });

  it("checkStatementCount enforces max statements", () => {
    assert.equal(checkStatementCount(1).ok, true);
    const over = checkStatementCount(DEFAULT_LIMITS.maxStatements + 1);
    assert.equal(over.ok, false);
    assert.equal(over.error.code, "too-many-statements");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createStreamParser,
  compileSchema,
  parse,
  stripFences,
} from "../../src/Browser/lang/parser.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { tokenLocation, T, TOKEN_NAMES } from "../../src/Browser/lang/tokens.js";

const schema = {
  $defs: {
    Stack: { properties: { children: { type: "array" } }, required: ["children"] },
    Title: { properties: { text: { type: "string" } }, required: ["text"] },
  },
};

describe("parser final coverage gaps", () => {
  it("pickEntryId falls back to first component when rootName type absent", () => {
    const map = compileSchema(schema);
    const r = parse('a = Title("only")', map, "Stack");
    assert.equal(r.root?.typeName, "Title");
    assert.equal(r.root?.statementId, "a");
  });

  it("refreshCleaned resets when fence extraction changes prefix", () => {
    const sp = createStreamParser(compileSchema(schema), "Stack");
    // Internal newline must survive preprocess().trim() so completedEnd advances.
    const first = 'main = Stack([t])\nt = Title("a")\n';
    const r1 = sp.push(first);
    assert.equal(r1.root?.typeName, "Stack");
    assert.ok(r1.meta.statementCount >= 2);
    const r2 = sp.set(`${first}\`\`\`\nz = Title("b")\n\`\`\``);
    assert.equal(r2.root?.typeName, "Title");
    assert.equal(r2.root?.statementId, "z");
  });

  it("pending junk with completed stmts keeps last root", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("done")\n');
    const r = sp.push("!!! not-a-statement");
    assert.equal(r.root?.props?.text, "done");
  });

  it("empty pending after completed returns buildResult", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("z")\n');
    const r = sp.getResult();
    assert.equal(r.root?.props?.text, "z");
    assert.equal(r.meta.incomplete, false);
  });

  it("stripFences without fences returns input", () => {
    assert.equal(stripFences('root = Title("x")'), 'root = Title("x")');
  });
});

describe("tokens coverage", () => {
  it("tokenLocation and TOKEN_NAMES", () => {
    const loc = tokenLocation({ start: 0, end: 4, line: 1, column: 1 });
    assert.equal(loc.offset, 0);
    assert.equal(loc.endOffset, 4);
    assert.equal(loc.line, 1);
    assert.equal(loc.column, 1);
    assert.equal(TOKEN_NAMES[T.Ident], "Ident");
    assert.ok(tokenize('root = Title("x")').length > 0);
  });
});

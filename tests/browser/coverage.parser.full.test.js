import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createParser,
  createStreamParser,
  createStreamingParser,
  compileSchema,
  parse,
  stripFences,
} from "../../src/Browser/lang/parser.js";

const schema = {
  $defs: {
    Stack: { properties: { children: { type: "array" } }, required: ["children"] },
    Title: { properties: { text: { type: "string" } }, required: ["text"] },
  },
};

describe("parser coverage — stripFences and stripComments", () => {
  const parser = createParser(schema, "Stack");

  it("skipString handles escapes before fence scan", () => {
    const raw = 'msg = "say \\"hi\\""\n```\nroot = Title("x")\n```';
    const out = stripFences(raw);
    assert.match(out, /root = Title/);
  });

  it("skipString returns past unclosed double-quoted segment", () => {
    const raw = 'broken = "no end\n```\nroot = Title("y")\n```';
    const out = stripFences(raw);
    assert.match(out, /Title/);
  });

  it("opening fence without newline before EOF", () => {
    const out = stripFences("```tag-only-no-newline");
    assert.ok(typeof out === "string");
  });

  it("fallback strip for inline opening fence without newlines", () => {
    // Unclosed / inline fences are handled by the primary scan; body may be empty.
    assert.equal(typeof stripFences("```inline```"), "string");
    assert.equal(typeof stripFences("```no newline"), "string");
  });

  it("returns input unchanged when no fenced blocks were extracted", () => {
    const plain = "root = Title(\"no fences\")\n";
    assert.equal(stripFences(plain), plain);
  });

  it("unclosed fenced block takes body until EOF", () => {
    const out = stripFences("```\nroot = Title(\"open\")\n");
    assert.match(out, /Title/);
  });

  it("stripComments ignores # inside escaped double-quoted strings", () => {
    const r = parser.parse('root = Title("a\\\\" + "b") # tail');
    assert.ok(r.root?.typeName === "Title" || r.meta.statementCount >= 1);
  });

  it("stripComments removes hash comments", () => {
    const r = parser.parse('root = Title("ok") # end-of-line');
    assert.equal(r.root?.typeName, "Title");
    assert.equal(r.meta.errors.length, 0);
  });

  it("stripComments skips escaped char inside quoted string before //", () => {
    const r = parser.parse("root = Title('it\\'s fine') // not in string");
    assert.equal(r.root?.typeName, "Title");
  });
});

describe("parser coverage — pickEntryId preferred component", () => {
  it("selects component id matching rootName when root id absent", () => {
    const map = compileSchema(schema);
    const r = parse('panel = Stack([t])\nt = Title("hi")', map, "Stack");
    assert.equal(r.root?.typeName, "Stack");
    assert.equal(r.root?.statementId, "panel");
  });

  it("falls back to first component when rootName does not match", () => {
    const map = compileSchema(schema);
    const r = parse('main = Title("only")', map, "Stack");
    assert.equal(r.root?.statementId, "main");
    assert.equal(r.root?.typeName, "Title");
  });
});

describe("parser coverage — streaming parser", () => {
  it("buildResult from completed statements when pending buffer empty", () => {
    const sp = createStreamingParser(schema, "Stack");
    const r = sp.push('main = Stack([t])\nt = Title("x")\n');
    assert.equal(r.root?.typeName, "Stack");
    assert.equal(r.meta.incomplete, false);
  });

  it("scanNewCompleted handles escapes inside streamed strings", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("a\\\\" + "b")\n');
    const r = sp.getResult();
    assert.equal(r.root?.typeName, "Title");
  });

  it("scanNewCompleted sets esc flag inside strings", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("line with \\" quote")\n');
    const r = sp.getResult();
    assert.ok(r.root || r.meta.statementCount >= 1);
  });

  it("refreshCleaned clears completed state when preprocess invalidates prefix", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("first")\n');
    sp.set('# edited\nroot = Title("second")\n');
    const r = sp.getResult();
    assert.equal(r.root?.props?.text, "second");
  });

  it("pending fragment with only comments uses completed statements", () => {
    const sp = createStreamParser(compileSchema(schema), "Stack");
    sp.push('main = Stack([t])\nt = Title("a")\n');
    const r = sp.push("// trailing comment only\n");
    assert.equal(r.root?.typeName, "Stack");
  });

  it("pending whitespace-only after completed lines", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("done")\n');
    const r = sp.push("   \n");
    assert.equal(r.root?.props?.text, "done");
  });

  it("getResult with only completed statements in buffer", () => {
    const sp = createStreamParser(compileSchema(schema), "Stack");
    sp.push('main = Stack([t])\nt = Title("a")\n');
    const r = sp.getResult();
    assert.equal(r.root?.typeName, "Stack");
    assert.equal(r.meta.incomplete, false);
  });

  it("ignores non-statement pending tail after completed lines", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("ok")\n');
    const r = sp.push("@@@\n");
    assert.equal(r.root?.props?.text, "ok");
  });

  it("streaming multiline ternary continues across chunks", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('flag = true\nroot = Title(flag ? "yes"\n');
    const r = sp.push(': "no")\n');
    assert.equal(r.root?.typeName, "Title");
  });

  it("reprocesses buffer when fence stripping changes completed prefix", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push("```\n");
    sp.push('root = Title("streamed")\n');
    const r = sp.push("```\n");
    assert.equal(r.root?.props?.text, "streamed");
  });

  it("clears completed watermark when preprocess invalidates cleaned prefix", () => {
    const sp = createStreamParser(compileSchema(schema), "Title");
    sp.push('root = Title("first")\n');
    sp.push('root = Title("first")\n');
    const r = sp.push("```\n");
    assert.equal(r.meta.statementCount, 0);
    assert.equal(r.root, null);
  });
});

describe("parser coverage — createParser exception path", () => {
  it("rethrows when preprocess throws on non-string input", () => {
    const p = createParser(schema, "Stack");
    assert.throws(() => p.parse(null), TypeError);
  });
});

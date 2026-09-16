import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RepairMessage } from "../src/components/repair-message";
import { samples } from "../src/lib/samples";

function renderReport(status: "fixed" | "fix_failed", output: string | null) {
  return renderToStaticMarkup(createElement(RepairMessage, {
    isStreaming: false,
    message: {
      id: "repair", role: "assistant",
      content: JSON.stringify({
        input: { generation: samples[0].generation, context: samples[0].context },
        completion: {
          choices: [{ message: { content: output } }],
          fix_summary: {
            status, fixed_errors: [],
            unfixed_errors: [{ code: "unknown-component", message: "Heading is not available." }],
          },
        },
      }),
    },
  }));
}

test("failed repairs preserve the original source and never render a success preview", () => {
  const html = renderReport("fix_failed", null);
  assert.match(html, /Repair incomplete/);
  assert.match(html, /Heading is not available/);
  assert.match(html, /Heading\(&quot;September revenue&quot;\)/);
  assert.doesNotMatch(html, /class="repair-preview"|<summary>Repaired code/);
});

test("a success response with invalid output is blocked by local validation", () => {
  const html = renderReport("fixed", samples[0].generation);
  assert.match(html, /did not pass local validation/);
  assert.doesNotMatch(html, /class="repair-preview"/);
});

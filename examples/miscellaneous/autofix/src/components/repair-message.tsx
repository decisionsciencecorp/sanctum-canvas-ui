"use client";

import { repairMessageSchema } from "@/lib/autofix-chat";
import { findErrors, type Diagnostic } from "@/lib/validation";
import { library } from "@/library";
import type { AssistantMessage } from "@openuidev/react-headless";
import { Renderer } from "@openuidev/react-lang";
import { useMemo, useState } from "react";
import type { z } from "zod/v4";

const statusLabels = {
  already_valid: "Already valid",
  fixed: "Repaired",
  fix_failed: "Repair incomplete",
};

function Diagnostics({ errors, empty }: { errors: Diagnostic[]; empty: string }) {
  if (!errors.length) return <p className="repair-muted">{empty}</p>;
  return (
    <ul className="repair-diagnostics">
      {errors.map((error, index) => (
        <li key={`${error.code}-${index}`}>
          <code>{error.code}</code>
          {error.statementId && <span> at {error.statementId}</span>}
          <p>{error.message}</p>
        </li>
      ))}
    </ul>
  );
}

function RepairResult({ report }: { report: z.infer<typeof repairMessageSchema> }) {
  const { input, completion } = report;
  const { status, fixed_errors, unfixed_errors } = completion.fix_summary;
  const output = completion.choices[0].message.content;
  const before = useMemo(() => findErrors(input.generation), [input.generation]);
  const after = useMemo(() => (output ? findErrors(output) : []), [output]);
  const [runtimeErrors, setRuntimeErrors] = useState<Diagnostic[]>([]);
  const [copyState, setCopyState] = useState("");

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyState("Copied");
    } catch {
      setCopyState("Select the code below to copy it manually.");
    }
  }

  return (
    <article className="repair-message" aria-label="Autofix result">
      <header className="repair-heading">
        <strong className={`repair-status repair-status--${status}`}>{statusLabels[status]}</strong>
        <span className="repair-muted">
          {fixed_errors.length} {fixed_errors.length === 1 ? "error" : "errors"} fixed
        </span>
      </header>
      {status === "fix_failed" ? (
        <div role="status">
          <p>Autofix could not complete this repair. The original code is preserved below.</p>
          <Diagnostics errors={unfixed_errors} empty="No further diagnostics were returned." />
        </div>
      ) : output && after.length === 0 ? (
        <div className="repair-preview">
          <Renderer
            response={output}
            library={library}
            isStreaming={false}
            onError={setRuntimeErrors}
          />
          {runtimeErrors.length > 0 && (
            <div role="alert">
              <Diagnostics errors={runtimeErrors} empty="" />
            </div>
          )}
        </div>
      ) : (
        <div role="alert">
          <p>The returned code did not pass local validation and cannot be previewed.</p>
          <Diagnostics errors={after} empty="No renderable output was returned." />
        </div>
      )}
      <details className="repair-details" open={status === "fix_failed"}>
        <summary>Original code and context</summary>
        <pre>
          <code>{input.generation}</code>
        </pre>
        {input.context && <p>{input.context}</p>}
        <Diagnostics errors={before} empty="The original program passed local validation." />
      </details>
      {output && (
        <details className="repair-details">
          <summary>{status === "already_valid" ? "Unchanged code" : "Repaired code"}</summary>
          <pre>
            <code>{output}</code>
          </pre>
          <button className="repair-copy" onClick={copyOutput}>
            Copy code
          </button>
          <span role="status" className="repair-muted">
            {" "}
            {copyState}
          </span>
        </details>
      )}
      <details className="repair-details">
        <summary>
          API diagnostics{completion.usage ? ` · ${completion.usage.total_tokens} tokens` : ""}
        </summary>
        <h4>Fixed</h4>
        <Diagnostics errors={fixed_errors} empty="No fixed errors reported." />
        <h4>Remaining</h4>
        <Diagnostics errors={unfixed_errors} empty="No remaining errors reported by the API." />
      </details>
    </article>
  );
}

export function RepairMessage({ message }: { message: AssistantMessage; isStreaming: boolean }) {
  const report = useMemo(() => {
    try {
      const parsed = repairMessageSchema.safeParse(JSON.parse(message.content ?? ""));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [message.content]);
  if (!report) return <p role="alert">The repair result could not be displayed.</p>;
  return <RepairResult key={message.id} report={report} />;
}

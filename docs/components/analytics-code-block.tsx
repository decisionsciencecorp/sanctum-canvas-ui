"use client";

import { captureCliCommandCopied } from "@/lib/analytics";
import { copyText } from "@/lib/copy-text";
import { CodeBlock, Pre, type CodeBlockProps } from "fumadocs-ui/components/codeblock";
import { Check, Clipboard } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

function CopyButton({
  containerRef,
  className,
}: {
  containerRef: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  async function handleCopy() {
    const pre = containerRef.current?.querySelector("pre");
    if (!pre) return;
    const clone = pre.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".nd-copy-ignore").forEach((node) => node.replaceWith("\n"));
    const command = clone.textContent ?? "";
    if (!(await copyText(command))) return;
    captureCliCommandCopied(command, { source: "docs_code_block", interaction: "copy_button" });
    setCopied(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={className}>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={handleCopy}
        className="inline-flex size-7 items-center justify-center rounded-md hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring [&_svg]:size-3.5"
      >
        {copied ? <Check /> : <Clipboard />}
      </button>
    </div>
  );
}

/** Preserve Fumadocs layout/tabs/highlighting, but observe actual clipboard success. */
export function AnalyticsCodeBlock({ children, allowCopy = true, ...props }: CodeBlockProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  return (
    <CodeBlock
      {...props}
      ref={containerRef}
      allowCopy={false}
      Actions={({ className }) =>
        allowCopy ? <CopyButton containerRef={containerRef} className={className} /> : null
      }
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}

import { observability, type ObservabilityEvent } from "@openuidev/observability";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { withDevtoolsAttribution } from "../lib/links";
import { FONT, useStyles, type ThemeTokens } from "../theme";
import type { DevtoolsPosition } from "../types";
import { DEPLOY_DOCS_URL, DeployCommand } from "./DeployCommand";

const SEEN_KEY = "openui:deploy-hint:v1";

/** Local eligibility only, not a hosted-response analytics event or a business-success signal. */
export function isCompletedLocalResponse(event: ObservabilityEvent): boolean {
  const detail = event.detail;
  const parser = detail["parser"] as Record<string, unknown> | undefined;
  return (
    event.level === "info" &&
    detail["kind"] === "react-lang:stream" &&
    detail["phase"] === "settled" &&
    typeof detail["response"] === "string" &&
    detail["response"].trim().length > 0 &&
    Array.isArray(detail["errors"]) &&
    detail["errors"].length === 0 &&
    parser?.["incomplete"] === false &&
    Array.isArray(parser["unresolved"]) &&
    parser["unresolved"].length === 0 &&
    typeof parser["statementCount"] === "number" &&
    parser["statementCount"] > 0
  );
}

/** A once-per-local-origin nudge. No prompts, responses or identity leave this browser. */
export function DeployHint({ position, hidden }: { position: DevtoolsPosition; hidden: boolean }) {
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const styles = useStyles(hintStyles);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    )
      return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
    } catch {
      // Suppress rather than repeatedly nudging when persistence is unavailable.
      return;
    }
    return observability.listenAll((event) => {
      if (
        shown.current ||
        hidden ||
        document.visibilityState === "hidden" ||
        !isCompletedLocalResponse(event)
      )
        return;
      try {
        if (window.localStorage.getItem(SEEN_KEY)) return;
        window.localStorage.setItem(SEEN_KEY, "seen");
      } catch {
        return;
      }
      shown.current = true;
      setVisible(true);
    });
  }, [hidden]);

  if (!visible || hidden) return null;
  const placement = {
    [position.startsWith("top") ? "top" : "bottom"]: 68,
    [position.endsWith("left") ? "left" : "right"]: 16,
  };

  return (
    <aside aria-label="Deploy your OpenUI app" style={{ ...styles.card, ...placement }}>
      <div style={styles.heading}>
        <strong>Ready to share your app?</strong>
        <button
          type="button"
          aria-label="Dismiss deployment hint"
          style={styles.dismiss}
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      </div>
      <p style={styles.description}>
        Deploy from your project folder to your Vercel account. Check access before sharing.
      </p>
      <DeployCommand />
      <div style={styles.actions}>
        <a
          href={withDevtoolsAttribution(DEPLOY_DOCS_URL, "local_deploy_hint")}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          Deployment docs ↗
        </a>
      </div>
    </aside>
  );
}

function hintStyles(t: ThemeTokens) {
  return {
    card: {
      position: "fixed",
      zIndex: 2147483646,
      boxSizing: "border-box",
      width: "min(360px, calc(100vw - 32px))",
      maxHeight: "calc(100vh - 100px)",
      overflowY: "auto",
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 12,
      padding: 16,
      background: t.bg,
      color: t.fg,
      boxShadow: t.shadow,
      fontFamily: FONT,
      fontSize: 13,
    },
    heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
    dismiss: {
      border: "none",
      background: "transparent",
      color: t.fgSecondary,
      fontSize: 24,
      minWidth: 44,
      minHeight: 44,
      cursor: "pointer",
    },
    description: { margin: "0 0 12px", lineHeight: 1.5, color: t.fgSecondary },
    actions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 12 },
    link: {
      display: "inline-flex",
      alignItems: "center",
      minHeight: 44,
      color: t.fg,
      textDecoration: "underline",
    },
  } satisfies Record<string, CSSProperties>;
}

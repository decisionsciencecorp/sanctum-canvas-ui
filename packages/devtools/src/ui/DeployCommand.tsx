import { Check, Copy } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { FONT, MONO, useStyles, type ThemeTokens } from "../theme";

const COMMAND = "npx @openuidev/cli@latest deploy";
export const DEPLOY_DOCS_URL = "https://www.openui.com/docs/api-reference/cli#deploy";

/** Shared clipboard control. Copying never executes the command or sends analytics. */
export function DeployCommand() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const styles = useStyles(commandStyles);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div>
      <div style={styles.row}>
        <code style={styles.command}>{COMMAND}</code>
        <button
          type="button"
          aria-label="Copy deploy command"
          title="Copy deploy command"
          style={styles.button}
          onClick={copyCommand}
        >
          {status === "copied" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
      </div>
      <span role="status" style={status === "idle" ? undefined : styles.status}>
        {status === "failed"
          ? "Copy failed. Select the command to copy it manually."
          : status === "copied"
            ? "Copied. Run it in a terminal from your project folder."
            : ""}
      </span>
    </div>
  );
}

function commandStyles(t: ThemeTokens) {
  return {
    row: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      paddingLeft: 10,
      background: t.bgSubtle,
    },
    command: {
      flex: 1,
      minWidth: 0,
      userSelect: "all",
      overflowWrap: "anywhere",
      color: t.fg,
      fontFamily: MONO,
      fontSize: 12,
      lineHeight: 1.5,
    },
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: 44,
      height: 44,
      border: `1px solid ${t.controlBorder}`,
      borderRadius: 7,
      background: t.inverted,
      color: t.invertedFg,
      cursor: "pointer",
    },
    status: {
      display: "block",
      marginTop: 8,
      color: t.fgSecondary,
      fontFamily: FONT,
      fontSize: 12,
      lineHeight: 1.5,
    },
  } satisfies Record<string, CSSProperties>;
}

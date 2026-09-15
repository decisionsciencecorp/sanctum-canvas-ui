import type { CSSProperties } from "react";
import { withDevtoolsAttribution } from "../lib/links";
import { useStyles, type ThemeTokens } from "../theme";
import { DEPLOY_DOCS_URL, DeployCommand } from "./DeployCommand";

/** Persistent discovery inside Inspect, independent of the one-time popup. */
export function DeployBanner() {
  const styles = useStyles(bannerStyles);
  return (
    <section aria-label="Deploy your OpenUI app" style={styles.banner}>
      <strong>Deploy your app to Vercel</strong>
      <p style={styles.description}>Run this command from your project folder.</p>
      <DeployCommand />
      <a
        href={withDevtoolsAttribution(DEPLOY_DOCS_URL, "inspect_deploy_banner")}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        Deployment docs ↗
      </a>
    </section>
  );
}

function bannerStyles(t: ThemeTokens) {
  return {
    banner: {
      flexShrink: 0,
      margin: "6px 0 12px",
      padding: 12,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 12,
      background: t.card,
      color: t.fg,
      fontSize: 13,
    },
    description: { margin: "6px 0 10px", color: t.fgSecondary, lineHeight: 1.5 },
    link: {
      display: "inline-flex",
      alignItems: "center",
      minHeight: 44,
      color: t.fgSecondary,
      fontSize: 12,
      textDecoration: "underline",
    },
  } satisfies Record<string, CSSProperties>;
}

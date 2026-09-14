"use client";

import { captureCliCommandCopied } from "@/lib/analytics";
import Link from "next/link";
import { ClipboardCommandButton } from "../../components/Button/Button";
import styles from "./BuildChatSection.module.css";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function captureBuildChatCliCopy(command: string) {
  captureCliCommandCopied(command, {
    source: "homepage_build_chat",
    interaction: "primary",
  });
}

function SectionTitle() {
  return <p className={styles.title}>Build a Generative UI chat in minutes</p>;
}

function CtaButton() {
  return (
    <div className={styles.ctaWrap}>
      <ClipboardCommandButton
        command="npx @openuidev/cli@latest create"
        onCopySuccess={captureBuildChatCliCopy}
        className={styles.ctaButton}
        iconPosition="start"
      >
        <span className={styles.ctaLabel}>npx @openuidev/cli@latest create</span>
      </ClipboardCommandButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BuildChatSection() {
  return (
    <div className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div aria-hidden="true" className={styles.overlay} />

          <div className={styles.content}>
            <div className={styles.copyColumn}>
              <div className={styles.copyStack}>
                <SectionTitle />
              </div>
              <CtaButton />
              <ol className={styles.journey} aria-label="From local app to shared app">
                <li>
                  <strong>Create</strong>
                  <span>Scaffold your OpenUI app.</span>
                </li>
                <li>
                  <strong>Run locally</strong>
                  <span>Try a prompt and make it useful.</span>
                </li>
                <li>
                  <strong>Deploy and share</strong>
                  <span>Use your Vercel account, verify the hosted response, then share.</span>
                </li>
              </ol>
              <div className={styles.deployActions}>
                <ClipboardCommandButton
                  command="npx @openuidev/cli@latest deploy"
                  onCopySuccess={captureBuildChatCliCopy}
                  className={styles.deployButton}
                  copyIconColor="currentColor"
                >
                  <span>Copy deploy command</span>
                </ClipboardCommandButton>
                <Link href="/docs/deploy" className={styles.guideLink}>
                  Read the deployment guide →
                </Link>
              </div>
              <p className={styles.deployNote}>
                Run from your project folder. Check the deployment environment and access before
                sharing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

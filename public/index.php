<?php
declare(strict_types=1);

/**
 * A7.7 — Standalone Sanctum Canvas laboratory.
 *
 * Laboratory chrome lives outside #sanctum-canvas-root so Track B never imports it.
 * CSP matches docs/track-a/csp.md (A4.7).
 */

header(
    "Content-Security-Policy: default-src 'self'; " .
    "script-src 'self'; " .
    "style-src 'self'; " .
    "img-src 'self' data: https:; " .
    "connect-src 'self'; " .
    "object-src 'none'; " .
    "base-uri 'self'; " .
    "frame-ancestors 'none'"
);
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

?><!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Defense-in-depth CSP meta (matches header above; A8.3 / Doc #1379 §9.4). -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    />
    <title>Sanctum Canvas — standalone laboratory</title>
    <link rel="stylesheet" href="/assets/css/tokens.css" />
    <link rel="stylesheet" href="/assets/css/skins.css" />
    <link rel="stylesheet" href="/assets/css/layout.css" />
    <link rel="stylesheet" href="/assets/css/a11y.css" />
    <link rel="stylesheet" href="/assets/css/components/forms.css" />
    <link rel="stylesheet" href="/assets/css/components/buttons.css" />
    <link rel="stylesheet" href="/assets/css/components/table.css" />
    <link rel="stylesheet" href="/assets/css/components/charts.css" />
    <link rel="stylesheet" href="/assets/css/components/card-blocks.css" />
    <link rel="stylesheet" href="/assets/css/components/tool-activity.css" />
    <link rel="stylesheet" href="/assets/css/components/content.css" />
    <link rel="stylesheet" href="/assets/css/components/stack.css" />
    <link rel="stylesheet" href="/assets/css/components/card.css" />
    <link rel="stylesheet" href="/assets/css/components/tabs.css" />
    <link rel="stylesheet" href="/assets/css/components/accordion.css" />
    <link rel="stylesheet" href="/assets/css/components/section-block.css" />
    <link rel="stylesheet" href="/assets/css/components/steps.css" />
    <link rel="stylesheet" href="/assets/css/components/carousel.css" />
    <link rel="stylesheet" href="/assets/css/components/modal.css" />
    <link rel="stylesheet" href="/lab/a5-foundation.css" />
    <link rel="stylesheet" href="/lab/a7-lab.css" />
  </head>
  <body class="a7-lab-body">
    <!-- Lab chrome — OUTSIDE #sanctum-canvas-root (Track B must not import this). -->
    <header class="a7-lab-chrome" id="lab-chrome" data-lab-chrome="1">
      <div class="a7-lab-chrome__brand">
        <h1>Sanctum Canvas lab</h1>
        <p class="a7-lab-lede">
          A7.7 standalone laboratory — fixture replay offline; live stream via
          <code>/api/chat.php</code> (fake provider when Venice unset).
        </p>
      </div>

      <section class="a7-lab-panel" aria-label="Fixture replay">
        <h2>Fixture replay</h2>
        <label class="a7-lab-field">
          <span>Fixture</span>
          <select id="lab-fixture" name="fixture"></select>
        </label>
        <div class="a7-lab-actions">
          <button type="button" id="lab-replay" class="a7-lab-btn">Replay fixture</button>
          <button type="button" id="lab-cancel" class="a7-lab-btn a7-lab-btn--danger" disabled>
            Cancel
          </button>
          <button type="button" id="lab-reset" class="a7-lab-btn a7-lab-btn--muted">Reset</button>
        </div>
      </section>

      <section class="a7-lab-panel" aria-label="Live prompt">
        <h2>Live prompt</h2>
        <label class="a7-lab-field">
          <span>Prompt</span>
          <textarea id="lab-prompt" name="prompt" rows="3" placeholder="Ask for a small UI…"></textarea>
        </label>
        <label class="a7-lab-field a7-lab-field--inline">
          <span>Format</span>
          <select id="lab-format" name="format">
            <option value="ndjson" selected>NDJSON</option>
            <option value="sse">SSE</option>
          </select>
        </label>
        <label class="a7-lab-field a7-lab-field--inline">
          <span>Provider</span>
          <select id="lab-provider" name="provider">
            <option value="fake" selected>fake (offline)</option>
            <option value="fixture">fixture</option>
            <option value="venice">venice (if key set)</option>
          </select>
        </label>
        <div class="a7-lab-actions">
          <button type="button" id="lab-start" class="a7-lab-btn a7-lab-btn--primary">Start</button>
          <button type="button" id="lab-patch" class="a7-lab-btn">Apply patch</button>
        </div>
        <label class="a7-lab-field">
          <span>Patch source (merged by statement id)</span>
          <textarea
            id="lab-patch-source"
            name="patch"
            rows="2"
            placeholder='root = TextContent("Patched hello")'
          ></textarea>
        </label>
      </section>

      <section class="a7-lab-panel" aria-label="Fake tools">
        <h2>Deterministic tools</h2>
        <div class="a7-lab-actions">
          <button type="button" id="lab-tool-echo" class="a7-lab-btn">echo_read</button>
          <button type="button" id="lab-tool-note-get" class="a7-lab-btn">note_get</button>
          <button type="button" id="lab-tool-note-set" class="a7-lab-btn">note_set</button>
        </div>
        <pre id="lab-tool-out" class="a7-lab-pre" aria-live="polite"></pre>
      </section>

      <p id="lab-status" class="a7-lab-status" role="status" data-lab-ready="0">Booting…</p>
    </header>

    <!-- Track B mount contract — renderer only. No lab chrome inside. -->
    <main
      id="sanctum-canvas-root"
      class="sanctum-canvas-root canvas-root"
      data-canvas-mount="1"
      aria-label="Canvas output"
    ></main>

    <!-- Optional debug panes — also outside the canvas mount. -->
    <aside class="a7-lab-debug" id="lab-debug" data-lab-debug="1" aria-label="Lab debug panes">
      <details open>
        <summary>Raw Lang</summary>
        <pre id="debug-lang" class="a7-lab-pre"></pre>
      </details>
      <details>
        <summary>AST / tree</summary>
        <pre id="debug-ast" class="a7-lab-pre"></pre>
      </details>
      <details open>
        <summary>Stream state</summary>
        <pre id="debug-state" class="a7-lab-pre"></pre>
      </details>
      <details>
        <summary>Query / tools</summary>
        <pre id="debug-query" class="a7-lab-pre"></pre>
      </details>
      <details open>
        <summary>Errors</summary>
        <pre id="debug-errors" class="a7-lab-pre"></pre>
      </details>
    </aside>

    <script type="module" src="/lab/a7-lab.js"></script>
  </body>
</html>

<?php
declare(strict_types=1);

/**
 * Deep Research — SMCP-only canvas twin (troubleshooting surface).
 *
 * Named URL (after sync): https://canvas-lab.sanctumos.org/lab/deep-research.php
 * Otto paints via sanctum_canvas_lab SMCP. No Broca / full shell chrome.
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
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    />
    <title>Deep Research — SMCP canvas twin</title>
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
    <link rel="stylesheet" href="/lab/deep-research.css" />
  </head>
  <body class="a7-lab-body dr-lab-body">
    <a class="a7-lab-skip" href="#sanctum-canvas-root">Skip to canvas</a>
    <header class="a7-lab-chrome dr-lab-chrome" data-lab-chrome="1">
      <div class="a7-lab-chrome__brand">
        <p class="a7-hint a7-lab-breadcrumb">
          <a href="/index.php">&larr; Home</a> &middot;
          <a href="/stream.php">Stream lab</a>
        </p>
        <h1>Deep Research — SMCP twin</h1>
        <p class="a7-lab-lede">
          Same Sanctum Canvas runtime the product hosts on the right pane.
          Otto paints it from Cursor via <code>sanctum_canvas_lab</code> SMCP —
          no Broca, no board, no chat shell. Use this page to iron out
          rendering bugs before (or beside) the full app.
        </p>
      </div>
      <section class="a7-lab-panel" aria-label="Control status">
        <h2>Control channel</h2>
        <dl class="dr-meta">
          <div><dt>Surface</dt><dd id="dr-surface">deep-research</dd></div>
          <div><dt>Rev</dt><dd id="dr-rev">0</dd></div>
          <div><dt>Action</dt><dd id="dr-action">idle</dd></div>
          <div><dt>Title</dt><dd id="dr-title">(none)</dd></div>
          <div><dt>Updated</dt><dd id="dr-updated">—</dd></div>
        </dl>
        <p id="lab-status" class="a7-lab-status" role="status" data-lab-ready="0">Booting…</p>
        <p class="a7-hint">
          Polling <code>/api/lab-control.php?surface=deep-research</code>.
          Submits from the canvas stay on this page (logged under Last submit).
        </p>
        <h3 class="dr-subhead">Last submit</h3>
        <pre id="dr-last-submit" class="a7-lab-pre">(none yet)</pre>
      </section>
    </header>

    <main
      id="sanctum-canvas-root"
      class="sanctum-canvas-root canvas-root"
      data-canvas-mount="1"
      aria-label="Deep Research canvas twin"
    ><p class="a7-lab-empty" id="lab-canvas-empty">Waiting for SMCP paint…</p></main>

    <aside class="a7-lab-debug" id="lab-debug" data-lab-debug="1" aria-label="Program debug">
      <details open>
        <summary>Program text</summary>
        <pre id="debug-lang" class="a7-lab-pre">(empty)</pre>
      </details>
      <details>
        <summary>Parse errors</summary>
        <pre id="debug-errors" class="a7-lab-pre">[]</pre>
      </details>
    </aside>

    <script type="module" src="/lab/deep-research.js"></script>
  </body>
</html>

<?php
declare(strict_types=1);

/**
 * Canvas isolation test app — Deep Research shell profile.
 *
 * Named URL (after sync): https://canvas-lab.sanctumos.org/lab/deep-research.php
 *
 * Loads only the shell component pack (forms / content / layout). One-click
 * fixtures paint without SMCP so you can tell product bugs from canvas bugs.
 * Otto can still paint via sanctum_canvas_lab SMCP when useful.
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
    <title>Canvas isolation — Deep Research shell</title>
    <link rel="stylesheet" href="/assets/css/tokens.css" />
    <link rel="stylesheet" href="/assets/css/skins.css" />
    <link rel="stylesheet" href="/assets/css/layout.css" />
    <link rel="stylesheet" href="/assets/css/a11y.css" />
    <link rel="stylesheet" href="/assets/css/components/forms.css" />
    <link rel="stylesheet" href="/assets/css/components/buttons.css" />
    <link rel="stylesheet" href="/assets/css/components/card-blocks.css" />
    <link rel="stylesheet" href="/assets/css/components/content.css" />
    <link rel="stylesheet" href="/assets/css/components/stack.css" />
    <link rel="stylesheet" href="/assets/css/components/card.css" />
    <link rel="stylesheet" href="/assets/css/components/tabs.css" />
    <link rel="stylesheet" href="/assets/css/components/accordion.css" />
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
        <h1>Canvas isolation test</h1>
        <p class="a7-lab-lede">
          Stripped Sanctum Canvas — shell components only (no charts, tables,
          tools, or chat packs). Paint a fixture below. If this page looks
          right and Deep Research does not, the bug is in the product host.
          If this page looks wrong too, fix it here and ship the fix in
          <code>sanctum-canvas-ui</code>.
        </p>
      </div>
      <section class="a7-lab-panel" aria-label="Local fixtures">
        <h2>Local fixtures</h2>
        <p class="a7-hint">
          No SMCP required. These load Lang from
          <code>/fixtures/lang/</code> through the same shell renderer the
          product should use.
        </p>
        <div class="dr-fixture-actions" role="group" aria-label="Paint fixture">
          <button type="button" class="dr-btn" id="dr-paint-scope" data-fixture="deep-research-scope-v1">
            Paint scope form
          </button>
          <button type="button" class="dr-btn" id="dr-paint-schema" data-fixture="deep-research-form-schema-v1">
            Paint form-schema sample
          </button>
          <button type="button" class="dr-btn dr-btn--ghost" id="dr-clear-local">
            Clear canvas
          </button>
        </div>
        <p id="lab-status" class="a7-lab-status" role="status" data-lab-ready="0">Booting…</p>
        <h3 class="dr-subhead">Optional SMCP channel</h3>
        <dl class="dr-meta">
          <div><dt>Surface</dt><dd id="dr-surface">deep-research</dd></div>
          <div><dt>Rev</dt><dd id="dr-rev">0</dd></div>
          <div><dt>Action</dt><dd id="dr-action">idle</dd></div>
          <div><dt>Title</dt><dd id="dr-title">(none)</dd></div>
          <div><dt>Updated</dt><dd id="dr-updated">—</dd></div>
        </dl>
        <p class="a7-hint">
          Otto may still paint via <code>sanctum_canvas_lab</code>. Local
          fixtures win until the next SMCP rev.
        </p>
        <h3 class="dr-subhead">Last submit</h3>
        <pre id="dr-last-submit" class="a7-lab-pre">(none yet)</pre>
      </section>
    </header>

    <main
      id="sanctum-canvas-root"
      class="sanctum-canvas-root canvas-root"
      data-canvas-mount="1"
      data-component-profile="shell"
      aria-label="Deep Research shell canvas"
    ><p class="a7-lab-empty" id="lab-canvas-empty">Pick a fixture above, or wait for SMCP paint.</p></main>

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

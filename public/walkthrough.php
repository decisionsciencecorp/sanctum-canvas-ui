<?php
declare(strict_types=1);

/**
 * A9.3 — Guided walkthrough (wizard on rails).
 *
 * Wizard chrome lives outside #sanctum-canvas-root; the canvas is driven by
 * public/lab/walkthrough.js through the same renderer the host mounts.
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
    <title>Sanctum Canvas — guided walkthrough</title>
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
    <link rel="stylesheet" href="/assets/css/components/code-block.css" />
    <link rel="stylesheet" href="/assets/css/components/follow-up.css" />
    <link rel="stylesheet" href="/assets/css/components/image.css" />
    <link rel="stylesheet" href="/assets/css/components/list.css" />
    <link rel="stylesheet" href="/lab/walkthrough.css" />
  </head>
  <body class="wt-body">
    <a class="wt-skip" href="#sanctum-canvas-root">Skip to the canvas</a>

    <header class="wt-top" data-lab-chrome="1">
      <div class="wt-top__left">
        <a class="wt-home" href="/index.php">&larr; Home</a>
        <span class="wt-top__title">Guided walkthrough</span>
        <span class="wt-top__sub">A week at Empanada Empire, answered on the canvas</span>
      </div>
      <div class="wt-top__right">
        <div class="wt-progress" id="wt-progress" role="progressbar" aria-label="Walkthrough progress" aria-valuemin="1" aria-valuemax="18" aria-valuenow="1">
          <div class="wt-progress__bar" id="wt-progress-bar"></div>
        </div>
        <nav class="wt-dots" id="wt-dots" aria-label="Steps"></nav>
      </div>
    </header>

    <aside class="wt-narration" id="wt-narration" data-lab-chrome="1" aria-label="What is happening">
      <p class="wt-counter" id="wt-counter">Step 1 of 18</p>
      <p class="wt-actor" id="wt-actor" data-actor="guide">Guide</p>
      <h1 class="wt-title" id="wt-title">Loading…</h1>
      <div class="wt-says" id="wt-says"></div>

      <div class="wt-block" id="wt-why-wrap" hidden>
        <p class="wt-block__label">Why it matters</p>
        <p class="wt-why" id="wt-why"></p>
      </div>

      <div class="wt-block" id="wt-components-wrap" hidden>
        <p class="wt-block__label">Components on screen</p>
        <div class="wt-chips" id="wt-components"></div>
      </div>

      <div class="wt-block" id="wt-program-wrap" hidden>
        <p class="wt-block__label">What the model writes (a real program — parsed in tests)</p>
        <pre class="wt-program" id="wt-program"></pre>
      </div>

      <div class="wt-block" id="wt-links-wrap" hidden>
        <p class="wt-block__label">Go further</p>
        <ul class="wt-links" id="wt-links"></ul>
      </div>

      <p class="wt-hint" id="wt-hint" hidden></p>

      <div class="wt-controls" data-lab-chrome="1">
        <button type="button" class="wt-btn wt-btn--muted" id="wt-back">Back</button>
        <button type="button" class="wt-btn wt-btn--primary" id="wt-next">Next</button>
        <button type="button" class="wt-btn" id="wt-auto" aria-pressed="false">Auto-play</button>
        <button type="button" class="wt-btn wt-btn--muted" id="wt-restart">Restart</button>
        <span class="wt-status" id="wt-status" aria-live="polite"></span>
      </div>
      <p class="wt-keys">Keyboard: &larr; &rarr; move between steps.</p>
      <span id="wt-ready" hidden></span>
    </aside>

    <main class="wt-stage" data-lab-chrome="1">
      <section class="wt-chat" id="wt-chat" aria-label="Conversation" aria-live="polite"></section>
      <div class="wt-canvas-frame">
        <div class="canvas-root wt-canvas" id="sanctum-canvas-root" aria-label="Canvas"></div>
      </div>
    </main>

    <script type="module" src="/lab/walkthrough.js"></script>
  </body>
</html>

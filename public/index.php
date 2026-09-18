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

/**
 * Hover/focus help bubble. Visible text stays on the control; this is the extra sentence.
 */
function canvas_lab_tip(string $what, string $text): string
{
    $what = htmlspecialchars($what, ENT_QUOTES);
    $text = htmlspecialchars($text, ENT_QUOTES);
    return '<span class="a7-tip">'
        . '<button type="button" class="a7-tip__btn" aria-label="Help: ' . $what . '" title="' . $text . '">?</button>'
        . '<span class="a7-tip__bubble" role="tooltip">' . $text . '</span>'
        . '</span>';
}

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
    <a class="a7-lab-skip" href="#sanctum-canvas-root">Skip to canvas output</a>
    <!-- Lab chrome — OUTSIDE #sanctum-canvas-root (Track B must not import this). -->
    <header class="a7-lab-chrome" id="lab-chrome" data-lab-chrome="1">
      <div class="a7-lab-chrome__brand">
        <h1>Sanctum Canvas lab</h1>
        <p class="a7-lab-lede">
          The middle of the page is the canvas. The left side drives it.
          Hover or tap a <strong>?</strong> if a control is still unclear.
        </p>
        <p class="a7-hint">
          This page only replays streams. The components themselves are on
          <a href="/lab/a5-foundation.html">text, cards, tabs, and layout</a>
          and
          <a href="/lab/a6-library.html">forms, tables, charts, and buttons</a>.
        </p>
      </div>

      <section class="a7-lab-panel" aria-label="Saved examples">
        <h2>Saved examples <?= canvas_lab_tip('Saved examples', 'These are recordings, not a live model. Replay draws that recording into the canvas.') ?></h2>
        <p class="a7-hint">Pick one, then press Replay. Start with “Hello card”.</p>
        <label class="a7-lab-field">
          <span>Example <?= canvas_lab_tip('Example', 'Each option is a saved stream. The line under the menu says what that one draws.') ?></span>
          <select id="lab-fixture" name="fixture" title="Saved recording to play into the canvas"></select>
        </label>
        <p id="lab-fixture-help" class="a7-hint">Loads the Hello card.</p>
        <div class="a7-lab-actions">
          <button type="button" id="lab-replay" class="a7-lab-btn" title="Play the selected example into the canvas.">Replay</button>
          <button type="button" id="lab-cancel" class="a7-lab-btn a7-lab-btn--danger" disabled title="Stop a replay or a live run that is still going.">Cancel</button>
          <button type="button" id="lab-reset" class="a7-lab-btn a7-lab-btn--muted" title="Clear the canvas and the debug panes on the right.">Clear</button>
        </div>
      </section>

      <section class="a7-lab-panel" aria-label="Type a prompt">
        <h2>Type a prompt <?= canvas_lab_tip('Type a prompt', 'Start asks this server for a screen. Canned reply ignores the text box and always draws the same Hello card. Saved example replays the menu above. Real model is not installed here.') ?></h2>
        <p class="a7-hint">Press Start. With Canned reply selected, you always get a Hello card. The box is not read.</p>
        <label class="a7-lab-field">
          <span>Prompt <?= canvas_lab_tip('Prompt', 'Ignored while Who answers is Canned reply. Only a real model would use this text, and that model is not set up.') ?></span>
          <textarea id="lab-prompt" name="prompt" rows="3" placeholder="Not used by Canned reply" title="Ignored unless Who answers is Real model."></textarea>
        </label>
        <label class="a7-lab-field a7-lab-field--inline">
          <span>Wire format <?= canvas_lab_tip('Wire format', 'How the reply is packaged on the wire. Line-by-line JSON and event stream should draw the same thing. Leave this on the default unless you are checking the stream.') ?></span>
          <select id="lab-format" name="format" title="Packaging of the reply. Default is fine.">
            <option value="ndjson" selected>Line-by-line JSON</option>
            <option value="sse">Event stream</option>
          </select>
        </label>
        <label class="a7-lab-field a7-lab-field--inline">
          <span>Who answers <?= canvas_lab_tip('Who answers', 'Canned reply ignores your prompt. Saved example replays the menu above. Real model is not set up on this server and will fail.') ?></span>
          <select id="lab-provider" name="provider" title="Canned reply is the one that works today.">
            <option value="fake" selected>Canned reply</option>
            <option value="fixture">Saved example</option>
            <option value="venice">Real model (not set up)</option>
          </select>
        </label>
        <div class="a7-lab-actions">
          <button type="button" id="lab-start" class="a7-lab-btn a7-lab-btn--primary" title="Send the prompt to whoever is selected under Who answers.">Start</button>
          <button type="button" id="lab-patch" class="a7-lab-btn" title="Merge the edit box into the current screen and draw the result.">Apply edit</button>
        </div>
        <label class="a7-lab-field">
          <span>Edit the current screen <?= canvas_lab_tip('Edit the current screen', 'Paste a small program, then press Apply edit. It merges into what is already drawn, matched by statement id. The placeholder is a one-line Hello card.') ?></span>
          <textarea
            id="lab-patch-source"
            name="patch"
            rows="2"
            placeholder='root = TextContent("Patched hello")'
            title="Program text merged into the current canvas when you press Apply edit."
          ></textarea>
        </label>
      </section>

      <section class="a7-lab-panel" aria-label="Server tools">
        <h2>Server tools <?= canvas_lab_tip('Server tools', 'These call this website only. They do not reach Sanctum, Broca, or any client system. The reply prints in the box under the buttons.') ?></h2>
        <p class="a7-hint">Buttons below talk to this site and print the reply here.</p>
        <div class="a7-lab-actions">
          <button type="button" id="lab-tool-echo" class="a7-lab-btn" title="Ask this site to repeat a fixed message back. Proves the tool API is up.">Echo a message</button>
          <button type="button" id="lab-tool-note-get" class="a7-lab-btn" title="Read the note stored on this server for this lab.">Read note</button>
          <button type="button" id="lab-tool-note-set" class="a7-lab-btn" title="Save a note on this server. Read note shows it afterward.">Save note</button>
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
    ><p class="a7-lab-empty" id="lab-canvas-empty">Nothing here yet. On the left, pick Hello card and press Replay.</p></main>

    <!-- Optional debug panes — also outside the canvas mount. -->
    <aside class="a7-lab-debug" id="lab-debug" data-lab-debug="1" aria-label="Lab debug panes">
      <p class="a7-hint">Optional. Open these only if you want to see why the canvas looks the way it does.</p>
      <details open>
        <summary title="The program text the canvas is drawing from.">Program text</summary>
        <pre id="debug-lang" class="a7-lab-pre"></pre>
      </details>
      <details>
        <summary title="The same program after it has been parsed into a tree.">Parsed structure</summary>
        <pre id="debug-ast" class="a7-lab-pre"></pre>
      </details>
      <details open>
        <summary title="Whether a run is idle, streaming, finished, or failed.">Run status</summary>
        <pre id="debug-state" class="a7-lab-pre"></pre>
      </details>
      <details>
        <summary title="Tool calls the canvas made during this run.">Tool calls</summary>
        <pre id="debug-query" class="a7-lab-pre"></pre>
      </details>
      <details open>
        <summary title="What failed, if anything. Empty is normal.">Errors</summary>
        <pre id="debug-errors" class="a7-lab-pre"></pre>
      </details>
    </aside>

    <script type="module" src="/lab/a7-lab.js"></script>
  </body>
</html>

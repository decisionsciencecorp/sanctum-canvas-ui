<?php
declare(strict_types=1);

/**
 * A9.2 — Sanctum Canvas lab home.
 *
 * Entry point for humans. Tiles pick a lab display; nothing here is part of the
 * canvas runtime (Track B never imports this page).
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
 * @var array<int, array{href:string,kicker:string,title:string,what:string,expect:string,featured?:bool,tag?:string}>
 */
$tiles = [
    [
        'href' => '/walkthrough.php',
        'kicker' => 'Start here',
        'title' => 'Guided walkthrough',
        'what' => 'A scripted conversation, on rails. An ops lead asks the assistant how the restaurant did this week and the canvas fills in step by step: text, numbers, charts, a table, a form that fires a tool, follow-up questions, and a confirmation dialog.',
        'expect' => 'About 18 short steps. Press Next or let it auto-play. Every component family appears in context.',
        'featured' => true,
        'tag' => 'Story',
    ],
    [
        'href' => '/stream.php',
        'kicker' => 'Plumbing',
        'title' => 'Stream lab',
        'what' => 'Replays saved event streams into the canvas and shows the raw events and state on the right. Also has a canned "live" prompt and the server-side tool buttons.',
        'expect' => 'Pick a saved example and press Replay. Use this to see how a model reply becomes a screen.',
        'tag' => 'Streams',
    ],
    [
        'href' => '/lab/a5-foundation.html',
        'kicker' => 'Components',
        'title' => 'Text, cards, and layout',
        'what' => 'Stack, Card, headers, paragraphs, callouts, tags, metrics, lists, code, images, plus Tabs, Accordion, Section, Steps, Carousel, and an open Modal.',
        'expect' => 'One sample of each. Tabs, accordion, carousel arrows, and step titles respond. The dialog stays closed until you open it.',
        'tag' => 'Gallery',
    ],
    [
        'href' => '/lab/a6-library.html',
        'kicker' => 'Components',
        'title' => 'Forms, tables, charts, and buttons',
        'what' => 'A full form with every field type, selection controls, button variants, a sortable table, an editable table, nine chart types, card blocks, an image gallery, and tool-activity rows.',
        'expect' => 'Static samples you can type into and sort. Charts are SVG drawn by the runtime.',
        'tag' => 'Gallery',
    ],
    [
        'href' => '/lab/a5-stack-card.html',
        'kicker' => 'Components',
        'title' => 'Stack and Card roots',
        'what' => 'Just the two root layouts a model reply lands in.',
        'expect' => 'Labels in a row, and a card whose source is a link you can open.',
        'tag' => 'Gallery',
    ],
    [
        'href' => '/lab/a5-carousel-modal.html',
        'kicker' => 'Components',
        'title' => 'Carousel and Modal',
        'what' => 'The two container components with the most keyboard behaviour: scroll-snap slides and a focus-trapping dialog.',
        'expect' => 'Arrow keys move the carousel; Escape closes the dialog.',
        'tag' => 'Gallery',
    ],
    [
        'href' => '/lab/csp.html',
        'kicker' => 'Security',
        'title' => 'Content Security Policy smoke',
        'what' => 'Proves the page refuses inline scripts, inline styles, and unsafe URLs, and that renderer resource limits hold.',
        'expect' => 'A list of pass / fail lines. All should read pass.',
        'tag' => 'Check',
    ],
];

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES);
}
?><!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    />
    <title>Sanctum Canvas lab — home</title>
    <link rel="stylesheet" href="/assets/css/tokens.css" />
    <link rel="stylesheet" href="/assets/css/skins.css" />
    <link rel="stylesheet" href="/assets/css/a11y.css" />
    <link rel="stylesheet" href="/lab/home.css" />
  </head>
  <body class="home-body">
    <a class="home-skip" href="#home-tiles">Skip to the list of pages</a>
    <main class="home-main" id="lab-home">
      <header class="home-hero">
        <p class="home-kicker">Sanctum Canvas &middot; Track A review lab</p>
        <h1>What do you want to look at?</h1>
        <p class="home-lede">
          This site is the review surface for the ported chat-to-screen renderer.
          A model writes a short program; the canvas turns it into live UI.
          Nothing here talks to a real model &mdash; every page runs on saved or scripted data,
          so what you see is the renderer, not a model&rsquo;s mood.
        </p>
        <p class="home-lede home-lede--small">
          If you only have two minutes, open the <a href="/walkthrough.php">guided walkthrough</a>.
        </p>
      </header>

      <section class="home-tiles" id="home-tiles" aria-label="Lab pages">
        <?php foreach ($tiles as $t): ?>
        <a class="home-tile<?= !empty($t['featured']) ? ' home-tile--featured' : '' ?>" href="<?= h($t['href']) ?>">
          <div class="home-tile__top">
            <span class="home-tile__kicker"><?= h($t['kicker']) ?></span>
            <?php if (!empty($t['tag'])): ?><span class="home-tile__tag"><?= h($t['tag']) ?></span><?php endif; ?>
          </div>
          <h2 class="home-tile__title"><?= h($t['title']) ?></h2>
          <p class="home-tile__what"><?= h($t['what']) ?></p>
          <p class="home-tile__expect"><strong>What to expect:</strong> <?= h($t['expect']) ?></p>
          <span class="home-tile__cta" aria-hidden="true">Open &rarr;</span>
        </a>
        <?php endforeach; ?>
      </section>

      <footer class="home-foot">
        <p>
          Reading the code instead? Runtime lives under <code>/assets/js/</code>; the host mount contract is
          <code>canvas-host-v1</code>. Lab pages under <code>/lab/</code> are review chrome only.
        </p>
      </footer>
    </main>
  </body>
</html>

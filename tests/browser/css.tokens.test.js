/**
 * A4.6 — CSS token files exist and use --canvas- namespace.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cssDir = join(root, "public/assets/css");

const FILES = ["tokens.css", "skins.css", "layout.css", "a11y.css"];

describe("A4.6 CSS tokens", () => {
  for (const name of FILES) {
    it(`${name} exists`, () => {
      assert.equal(existsSync(join(cssDir, name)), true, `${name} missing`);
    });
  }

  it("tokens.css declares --canvas- variables", () => {
    const src = readFileSync(join(cssDir, "tokens.css"), "utf8");
    assert.match(src, /--canvas-surface-background\s*:/);
    assert.match(src, /--canvas-text-primary\s*:/);
    assert.match(src, /--canvas-border-default\s*:/);
    assert.match(src, /--canvas-interactive-default\s*:/);
    assert.match(src, /--canvas-status-success-bg\s*:/);
    assert.match(src, /--canvas-space-m\s*:/);
    assert.match(src, /--canvas-font-body\s*:/);
    assert.match(src, /--canvas-radius-m\s*:/);
    assert.match(src, /--canvas-shadow-m\s*:/);
    assert.match(src, /--canvas-motion-duration-default\s*:/);
    assert.equal(src.includes("--openui-"), false, "prefer --canvas- only in tokens");
  });

  it("skins.css provides light/dark/sanctum data-theme overrides", () => {
    const src = readFileSync(join(cssDir, "skins.css"), "utf8");
    assert.match(src, /data-theme=["']light["']/);
    assert.match(src, /data-theme=["']dark["']/);
    assert.match(src, /data-theme=["']sanctum["']/);
    assert.match(src, /--canvas-/);
  });

  it("layout.css uses container queries and touch targets", () => {
    const src = readFileSync(join(cssDir, "layout.css"), "utf8");
    assert.match(src, /@container/);
    assert.match(src, /--canvas-touch-target-min/);
    assert.match(src, /container-type\s*:\s*inline-size/);
  });

  it("a11y.css covers reduced-motion, forced-colors, print", () => {
    const src = readFileSync(join(cssDir, "a11y.css"), "utf8");
    assert.match(src, /prefers-reduced-motion/);
    assert.match(src, /forced-colors/);
    assert.match(src, /@media\s+print/);
  });
});

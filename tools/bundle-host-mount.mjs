/**
 * Bundle canvas-host-v1 mount entries for deploy + product vendors.
 *
 *   mount.bundle.js       — full Track A (catalog / walkthrough)
 *   mount.shell.bundle.js — shell profile only (Deep Research / isolation lab)
 *
 * Usage: node tools/bundle-host-mount.mjs
 */
import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync, existsSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcHost = join(root, "src/Browser/host");
const outHost = join(root, "public/assets/js/host");

mkdirSync(outHost, { recursive: true });

const targets = [
  { entry: "mount.js", outfile: "mount.bundle.js", label: "full" },
  { entry: "mount.shell.js", outfile: "mount.shell.bundle.js", label: "shell" },
];

for (const t of targets) {
  const entry = join(srcHost, t.entry);
  const outfile = join(outHost, t.outfile);
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    logLevel: "info",
  });
  const bytes = statSync(outfile).size;
  console.log(`ok ${t.label}: ${outfile} (${bytes} bytes)`);
}

// Keep unbundled public copies aligned with src (deploy + lab module graph).
for (const name of [
  "mount.js",
  "mount.shell.js",
  "mountCore.js",
  "registerShellComponents.js",
  "registerAllComponents.js",
  "index.js",
]) {
  const from = join(srcHost, name);
  if (!existsSync(from)) continue;
  copyFileSync(from, join(outHost, name));
  console.log(`copied ${name}`);
}

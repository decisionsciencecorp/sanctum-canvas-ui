/**
 * Bundle canvas-host-v1 mount entries for deploy + product vendors.
 *
 *   mount.bundle.js       — full Track A (single file, kitchen sink)
 *   mount.shell.js        — shell entry + lazy pack chunks (code-split)
 *
 * Shell uses esbuild splitting so charts/tables/tools land in separate
 * chunks and only download when a program names those types.
 *
 * Usage: node tools/bundle-host-mount.mjs
 */
import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync, existsSync, statSync, readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcHost = join(root, "src/Browser/host");
const outHost = join(root, "public/assets/js/host");

mkdirSync(outHost, { recursive: true });

// Full kitchen sink — one file for catalog / walkthrough.
{
  const outfile = join(outHost, "mount.bundle.js");
  await esbuild.build({
    entryPoints: [join(srcHost, "mount.js")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    logLevel: "info",
  });
  console.log(`ok full: ${outfile} (${statSync(outfile).size} bytes)`);
}

// Shell + lazy packs — code-split into outHost/
{
  // Drop prior split chunks so stale hashes don't accumulate.
  for (const name of readdirSync(outHost)) {
    if (/^chunk-.*\.js$/.test(name) || name === "mount.shell.js" && !name.endsWith(".bundle")) {
      // keep source copies; only remove hashed chunks from prior builds
    }
    if (/^chunk-.*\.js$/.test(name)) {
      rmSync(join(outHost, name), { force: true });
    }
  }

  const result = await esbuild.build({
    entryPoints: { "mount.shell": join(srcHost, "mount.shell.js") },
    outdir: outHost,
    entryNames: "[name]",
    chunkNames: "chunk-[hash]",
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    logLevel: "info",
    metafile: true,
  });

  // Also emit a stable alias used by Deep Research / docs.
  const shellEntry = join(outHost, "mount.shell.js");
  const shellAlias = join(outHost, "mount.shell.bundle.js");
  copyFileSync(shellEntry, shellAlias);

  const shellBytes = statSync(shellEntry).size;
  const chunks = Object.keys(result.metafile.outputs).filter((p) =>
    /chunk-.*\.js$/.test(p),
  );
  console.log(`ok shell: ${shellEntry} (${shellBytes} bytes) + ${chunks.length} lazy chunk(s)`);
  for (const c of chunks) {
    console.log(`  chunk ${c} (${statSync(c).size} bytes)`);
  }
  console.log(`aliased → ${shellAlias}`);
}

// Keep unbundled public copies aligned with src (lab module graph + fallbacks).
for (const name of [
  "mount.js",
  "mount.shell.js",
  "mountCore.js",
  "lazyPacks.js",
  "registerShellComponents.js",
  "registerAllComponents.js",
  "index.js",
]) {
  const from = join(srcHost, name);
  if (!existsSync(from)) continue;
  // Do not overwrite the split mount.shell.js entry esbuild just wrote.
  if (name === "mount.shell.js") {
    copyFileSync(from, join(outHost, "mount.shell.source.js"));
    console.log(`copied ${name} → mount.shell.source.js`);
    continue;
  }
  copyFileSync(from, join(outHost, name));
  console.log(`copied ${name}`);
}

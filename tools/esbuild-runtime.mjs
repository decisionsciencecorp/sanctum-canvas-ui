import * as esbuild from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("src/Browser/runtime", { recursive: true });

// evaluator / evaluate-prop / evaluate-tree are hand-maintained ESM under src/Browser/runtime/
// queryManager + mcp are hand-maintained ESM (A3.5); toolProvider/store may still bundle from old/
const entries = ["store", "state-field", "toolProvider"];

const result = await esbuild.build({
  entryPoints: entries.map((n) => `old/packages/lang-core/src/runtime/${n}.ts`),
  outdir: "src/Browser/runtime",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  bundle: true,
  splitting: false,
  write: true,
  // Keep imports to our lang port where possible via alias after first pass;
  // for initial dump, bundle lang-core parser deps then we'll rewire.
  packages: "bundle",
  external: [],
  logLevel: "info",
});

console.log("esbuild ok", result.errors?.length ?? 0);

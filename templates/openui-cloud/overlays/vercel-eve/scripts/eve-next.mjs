import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const eveCli = join(projectRoot, "node_modules", "eve", "bin", "eve.js");
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const eveServer = join(projectRoot, ".output", "server", "index.mjs");

function runNode(script, args, env = process.env) {
  return spawn(process.execPath, [script, ...args], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function runToCompletion(script, args) {
  const result = await waitForExit(runNode(script, args));
  if (result.code !== 0) {
    process.exit(result.code ?? 1);
  }
}

async function build() {
  // withEve builds its own Vercel service during `next build`. Local
  // production needs the Nitro output on disk before `next start`.
  if (!process.env.VERCEL) {
    await runToCompletion(eveCli, ["build"]);
  }
  await runToCompletion(nextCli, ["build", ...process.argv.slice(3)]);
}

async function waitForEve(origin, child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("Eve exited before it became ready.");
    }
    try {
      const response = await fetch(`${origin}/eve/v1/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for Eve at ${origin}.`);
}

async function start() {
  const externalOrigin = process.env.EVE_NEXT_PRODUCTION_ORIGIN?.trim();
  if (externalOrigin) {
    const next = runNode(nextCli, ["start", ...process.argv.slice(3)]);
    const result = await waitForExit(next);
    process.exit(result.code ?? 1);
  }

  try {
    await access(eveServer);
  } catch {
    throw new Error('Eve production output is missing. Run "npm run build" first.');
  }

  const port = process.env.EVE_NEXT_PRODUCTION_PORT?.trim() || "4274";
  const origin = `http://127.0.0.1:${port}`;
  const eve = runNode(eveServer, [], {
    ...process.env,
    HOST: "127.0.0.1",
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: port,
    PORT: port,
  });

  await waitForEve(origin, eve);

  // Suppress withEve's optional in-process launcher if Next evaluates its
  // config at startup; this process already owns the Eve runtime.
  const next = runNode(nextCli, ["start", ...process.argv.slice(3)], {
    ...process.env,
    EVE_NEXT_PRODUCTION_ORIGIN: origin,
  });

  let stopping = false;
  const stop = (signal = "SIGTERM") => {
    if (stopping) return;
    stopping = true;
    if (eve.exitCode === null) eve.kill(signal);
    if (next.exitCode === null) next.kill(signal);
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  const first = await Promise.race([
    waitForExit(eve).then((result) => ({ child: "Eve", result })),
    waitForExit(next).then((result) => ({ child: "Next.js", result })),
  ]);
  stop();
  if (!stopping || first.result.code !== null) {
    console.error(`${first.child} exited; stopping the other server.`);
  }
  process.exit(first.result.code ?? (first.result.signal ? 1 : 0));
}

const command = process.argv[2];
if (command === "build") {
  await build();
} else if (command === "start") {
  await start();
} else {
  throw new Error(`Unknown command: ${command ?? "(missing)"}`);
}

# Intentional Sanctum hardenings vs upstream OpenUI

Upstream pin: `ee54f66` under `old/`.

Parity fixtures mark `parity: exact` or `parity: sanctum_hardening` with an `H*` id (or phase note below).

This list is the **complete A2–A7 intentional hardening inventory** for the A8.1 parity audit. Visual “intentional” presentation choices (native `<select>` / `<dialog>`, copy wording) are recorded in A5/A6 visual-parity docs and summarized under **UI presentation** — they are not language-kernel `H*` ids.

**A8.1 audit (2026-09-18):** Full browser suite **800/800** green; core modules `parser.js` / `validation.js` / `evaluator.js` / `urlPolicy.js` remain **100% line** coverage. No unexplained upstream mismatch — every delta maps to an H* row below (or A5/A6 visual notes). Evidence: `docs/track-a/A8.1-evidence.md`.

---

## Language & contracts (A0–A2)

| ID | Topic | Upstream | Sanctum | Phase |
|----|-------|----------|---------|-------|
| H1 | Reactive metadata | Process-local WeakSet; lost in `$defs` | `reactiveProps` array on each component contract | A0/A1 |
| H2 | Property order | Implicit Zod/`Object.keys` order | Explicit `propertyOrder` array; required | A0/A1 |
| H3 | Slot/composition validation | Some composite slots unchecked | Validate children against allowed component refs | A2 |
| H5 | Integer type | Permissive float-as-integer in places | Prefer exact integers when program is complete | A2 |
| H6 | Unresolved refs | Tracked in meta, not always errors | Errors for complete (non-partial) programs | A2 |

---

## Runtime (A3)

| ID | Topic | Upstream | Sanctum | Phase |
|----|-------|----------|---------|-------|
| H7 | Partial stream side effects | Intent documented | Hard reject Query/Mutation/tool/OpenUrl while incomplete (`actionRunner` + `guardedToolInvoke`) | A3/A4 |
| H8 | Action gesture gate | Mixed | OpenUrl / ContinueConversation / ToAssistant require explicit user gesture | A3 |
| H9 | ContinueConversation bounds | Soft / product-specific | Hard cap `MAX_CONTINUE_CHARS` (4000); no-op while streaming | A5.3 (wired in runtime path) |
| H10 | Mutation halt-on-failure | Documented | Failed mutation stops later action steps; no silent continue | A3 |
| H11 | Store disposal | Easy to leak in ports | Lifecycle dispose removes timers, listeners, pending requests | A3.9 |

---

## Renderer & security kernel (A4)

| ID | Topic | Upstream | Sanctum | Phase |
|----|-------|----------|---------|-------|
| H4 | URL policy | `safeUrl` not universal (e.g. markdown) | One policy for links, images, CSS urls, OpenUrl | A4.4 |
| H12 | Markdown HTML | Inconsistent scrubbing | Allowlisted DOM only; raw HTML/script/iframe/math inert; tables text-safe | A4.5 |
| H13 | Unknown components | Risk of arbitrary tags | Fail closed → `data-openui-unknown`; never executable | A4.1 |
| H14 | Last-good subtree | Optional | Broken / throwing update restores prior good DOM; blocks tool invoke | A4.3 |
| H15 | Renderer resource limits | Soft or absent | `maxNodes`/`maxDepth`/actions/queries/images/updates — hostile trees stop cleanly | A4.7 |
| H16 | CSP | Often loose in demos | Strict same-origin scripts/styles; no `unsafe-inline`/`unsafe-eval`; lab+PHP headers | A4.7 |

---

## Foundation & advanced UI (A5–A6)

| ID | Topic | Upstream | Sanctum | Phase |
|----|-------|----------|---------|-------|
| H17 | Image / media URLs | `data:` sometimes allowed in stories | H4 blocks `data:` / unsafe schemes for active images; same-origin SVG fixtures in lab | A5/A6 |
| H18 | Native controls where upstream is custom | Radix / custom triggers | Native `<select>`, `<input type=date>`, `<dialog>` where a11y/simpler — **documented visual intentional** | A5.7/A6 |
| H19 | Card / metric presentation | Combined label strings / baseline metric chrome | Port label/metric text choices recorded in visual parity (not defects) | A5/A6 |
| H20 | Tool-activity copy | Upstream “streaming” wording | Sanctum presentation labels (“Calling…”) — intentional | A6 |
| H21 | Library manifests | Full Zod surface was deferred during A6 close as a six-name bootstrap | **Reopened and finished.** Chat and dashboard `library.v1.json` are generated from OpenUI `genui-lib` (`tools/build-library-manifests.mjs`). Dashboard 82 names, chat 84. A renderer without a contract is a gap. | A6 deferral closed |

---

## Transport & PHP host (A7)

| ID | Topic | Upstream | Sanctum | Phase |
|----|-------|----------|---------|-------|
| H22 | Malformed stream lines | Varies | Non-terminal malformed SSE/NDJSON → skip + bounded diagnostics; do not wipe canvas | A7.1–A7.3 |
| H23 | Tool args never execute from partial JSON | Intent | `TOOL_CALL_ARGS` append-only until END; PHP revalidates | A7 |
| H24 | Fixed tool registry | Dynamic MCP/callables in some stacks | Allowlisted names only; hostile name shapes rejected before handlers | A7.5 |
| H25 | CSRF + idempotency on writes | Optional in demos | Required for browser-originated tool writes / program mutations | A7.5–A7.6 |
| H26 | Secret / error redaction | Easy to leak provider errors | Structured codes; no credentials or raw provider stacks to UI | A7.4+ |
| H27 | Lab chrome isolation | N/A (product shell) | `#sanctum-canvas-root` never contains lab chrome; Track B mounts empty root only | A7.7 |

---

## Cross-reference

| Artifact | Path |
|----------|------|
| A0 disposition JSON | `docs/track-a/source-disposition.json` → `intentional_hardenings` (H1–H7 seed) |
| CSP | `docs/track-a/csp.md` |
| Hostile fixtures | `tests/fixtures/hostile/` |
| Partial side-effects fixture | `resources/fixtures/runtime/no-side-effects-while-partial.json` (H7) |
| Visual notes | `docs/track-a/A5-visual-parity.md`, `A6-visual-parity.md` |
| Security regression scaffold | `tests/security/` |
| A8.1 language/runtime audit | `docs/track-a/A8.1-evidence.md` |
| A8.2 component checklist | `docs/track-a/A8-parity-checklist.md` |
| A8.3 security audit | `docs/track-a/A8.3-evidence.md` |

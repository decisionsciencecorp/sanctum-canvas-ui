# Deep Research — SMCP canvas twin

**2026-11-13 (Mark).** Until Deep Research **v1 ships**, keep an **active SMCP-controlled** Sanctum Canvas on canvas-lab that mirrors what the product hosts on the right pane.

## Why

Full-app bugs (Broca + board + chat + canvas) are hard to isolate. Mark opens the lab twin; Otto MCP-paints from the Deep Research session; we fix rendering in the simpler environment, then sync programs back into the product.

## URLs

| Surface | URL |
|---------|-----|
| Lab twin | https://canvas-lab.sanctumos.org/lab/deep-research.php |
| Control API | `GET/POST https://canvas-lab.sanctumos.org/api/lab-control.php` |
| Home tile | https://canvas-lab.sanctumos.org/ |

## Control

SMCP plugin: `smcp_plugin/sanctum_canvas_lab/`

- `sanctum_canvas_lab__paint` / `__paint_fixture` / `__clear` / `__status`
- Cursor: `tools/run-canvas-lab-smcp-stdio.sh` → MCP server `sanctum-canvas-lab`

## Sync rule (until v1)

When Deep Research changes the canvas program vocabulary, host mount options, or default scope forms:

1. Update the twin Lang fixtures under `public/fixtures/lang/`
2. Paint them here and verify on the lab URL
3. Mirror the same Lang / host wiring into `decisionsciencecorp/deep-research`

After v1 ships, this twin can stay as a regression harness or be retired by Mark.

## Not this page

Stream lab, walkthrough, and catalog remain general Track A labs. This twin is **product-scoped** and **SMCP-only**.

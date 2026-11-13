# SMCP plugin: `sanctum_canvas_lab`

Paint / clear / status for **SMCP-only lab twins** on [canvas-lab.sanctumos.org](https://canvas-lab.sanctumos.org/).

## Deep Research twin

| Item | Value |
|------|-------|
| Page | https://canvas-lab.sanctumos.org/lab/deep-research.php |
| Surface | `deep-research` |
| Control API | `GET/POST /api/lab-control.php` |
| Sync policy | Keep Lang programs + host behavior aligned with Deep Research product canvas **until v1 ships** |

Otto (or Face later) calls these tools from Cursor/SMCP. Mark opens the lab URL to see the same Sanctum Canvas runtime **without** Broca / board / chat shell — for rendering bug triage.

## Tools

| Tool | Effect |
|------|--------|
| `sanctum_canvas_lab__status` | Read rev / last paint / last submit |
| `sanctum_canvas_lab__paint` | Replace canvas with OpenUI Lang source |
| `sanctum_canvas_lab__paint_fixture` | Paint bundled fixture (`deep-research-scope-v1`) |
| `sanctum_canvas_lab__clear` | Clear canvas |

## Env

| Variable | Default |
|----------|---------|
| `CANVAS_LAB_BASE_URL` | `https://canvas-lab.sanctumos.org` |
| `CANVAS_LAB_TOKEN` | `canvas-lab-dev` (override in prod) |

Local smoke against PHP built-in or multihost:

```bash
CANVAS_LAB_BASE_URL=http://127.0.0.1:8765 \
  python3 smcp_plugin/sanctum_canvas_lab/cli.py paint_fixture
```

## Cursor MCP

See `tools/run-canvas-lab-smcp-stdio.sh` — server name `sanctum-canvas-lab`.

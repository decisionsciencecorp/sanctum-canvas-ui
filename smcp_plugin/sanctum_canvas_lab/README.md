# SMCP plugin: `sanctum_canvas_lab`

Optional remote paint / clear / status for the **canvas isolation test** on
[canvas-lab.sanctumos.org](https://canvas-lab.sanctumos.org/). The page also
paints local fixtures with no SMCP — use SMCP when Otto needs to drive it
from Cursor.

## Deep Research shell isolation

| Item | Value |
|------|-------|
| Page | https://canvas-lab.sanctumos.org/lab/deep-research.php |
| Surface | `deep-research` |
| Control API | `GET/POST /api/lab-control.php` |
| Profile | Shell components only (forms / content / layout) |

Mark opens the lab URL and clicks a fixture to see whether Sanctum Canvas itself
is healthy. If the fixture looks right here and wrong in Deep Research, the bug
is in the product host.

## Tools

| Tool | Effect |
|------|--------|
| `sanctum_canvas_lab__status` | Read rev / last paint / last submit |
| `sanctum_canvas_lab__paint` | Replace canvas with OpenUI Lang source |
| `sanctum_canvas_lab__paint_fixture` | Paint bundled fixture (`deep-research-scope-v1`, `deep-research-form-schema-v1`, …) |
| `sanctum_canvas_lab__clear` | Clear canvas |

## Env

| Variable | Default |
|----------|---------|
| `CANVAS_LAB_BASE_URL` | `https://canvas-lab.sanctumos.org` |
| `CANVAS_LAB_TOKEN` | `canvas-lab-dev` (override in prod) |

Local smoke:

```bash
CANVAS_LAB_BASE_URL=http://127.0.0.1:8765 \
  python3 smcp_plugin/sanctum_canvas_lab/cli.py paint_fixture
```

Doc: `docs/deep-research-smcp-twin.md`. Bundle: `npm run bundle:host`.

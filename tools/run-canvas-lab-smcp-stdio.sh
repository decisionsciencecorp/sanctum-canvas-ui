#!/usr/bin/env bash
# Cursor / Otto → Sanctum Canvas Lab SMCP (paint Deep Research twin, etc.).
set -euo pipefail

RUNTIME="${OTTO_SMCP_RUNTIME:-$HOME/.otto-local/smcp-runtime}"
SMCP_SRC="${OTTO_SMCP_SRC:-$HOME/projects/smcp}"
CANVAS_ROOT="${OTTO_SANCTUM_CANVAS_ROOT:-$HOME/projects/sanctum-canvas-ui}"
PLUGIN_SRC="$CANVAS_ROOT/smcp_plugin/sanctum_canvas_lab"
PLUGIN_DIR="$RUNTIME/plugins-canvas-lab"

if [ -f "$RUNTIME/env.paths" ]; then
  # shellcheck disable=SC1090
  set -a && . "$RUNTIME/env.paths" && set +a
fi

VENV_PY="$RUNTIME/.venv/bin/python"
if [ ! -x "$VENV_PY" ]; then
  echo "SMCP runtime missing. Install via sanctum-tasks tools/install-otto-smcp-runtime.sh" >&2
  exit 2
fi

mkdir -p "$PLUGIN_DIR"
ln -sfn "$PLUGIN_SRC" "$PLUGIN_DIR/sanctum_canvas_lab"

export MCP_PLUGINS_DIR="$PLUGIN_DIR"
export CANVAS_LAB_BASE_URL="${CANVAS_LAB_BASE_URL:-https://canvas-lab.sanctumos.org}"
export CANVAS_LAB_TOKEN="${CANVAS_LAB_TOKEN:-canvas-lab-dev}"

cd "$SMCP_SRC"
exec "$VENV_PY" smcp_stdio.py

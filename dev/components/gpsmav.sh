#!/bin/bash
# GPSmav development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Use component-specific virtual environment if it exists, otherwise use main venv
if [ -d "${PROJECT_ROOT}/src/gpsmav/venv" ]; then
    source "${PROJECT_ROOT}/src/gpsmav/venv/bin/activate"
else
    source "${PROJECT_ROOT}/venv/bin/activate"
fi

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG

cd "${PROJECT_ROOT}/src/gpsmav"
exec python3 mavgps.py

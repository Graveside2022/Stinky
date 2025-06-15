#!/bin/bash
# HackRF development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG

cd "${PROJECT_ROOT}/src/hackrf"
exec python3 -m hackrf.spectrum_analyzer

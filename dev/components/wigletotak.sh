#!/bin/bash
# WigleToTAK development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG
export FLASK_ENV=development
export FLASK_DEBUG=1

cd "${PROJECT_ROOT}/src/wigletotak"
exec python3 -m wigletotak.app

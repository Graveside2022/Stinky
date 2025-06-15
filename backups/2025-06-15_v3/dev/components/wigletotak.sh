#!/bin/bash
# WigleToTAK development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Use component-specific virtual environment if it exists, otherwise use main venv
if [ -d "${PROJECT_ROOT}/src/wigletotak/WigleToTAK/TheStinkToTAK/venv" ]; then
    source "${PROJECT_ROOT}/src/wigletotak/WigleToTAK/TheStinkToTAK/venv/bin/activate"
else
    source "${PROJECT_ROOT}/venv/bin/activate"
fi

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG
export FLASK_ENV=development
export FLASK_DEBUG=1

cd "${PROJECT_ROOT}/src/wigletotak/WigleToTAK/TheStinkToTAK"
exec python3 WigleToTak2.py

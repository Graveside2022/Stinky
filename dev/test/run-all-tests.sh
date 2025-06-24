#!/bin/bash
# Run all tests

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="${PROJECT_ROOT}/dev/test"

echo "Running all Stinkster tests..."
echo "================================"

# Activate virtual environment
source "${PROJECT_ROOT}/venv/bin/activate"
export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"

# Run unit tests
echo "Running unit tests..."
if bash "${TEST_DIR}/run-unit-tests.sh"; then
    echo "✓ Unit tests passed"
else
    echo "✗ Unit tests failed"
    exit 1
fi

# Run integration tests
echo "Running integration tests..."
if bash "${TEST_DIR}/run-integration-tests.sh"; then
    echo "✓ Integration tests passed"
else
    echo "✗ Integration tests failed"
    exit 1
fi

echo "All tests completed successfully!"

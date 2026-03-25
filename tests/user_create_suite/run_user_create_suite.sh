#!/bin/bash
# User Create Test Suite - Shell runner
# Creates 100 users by default, or COUNT + EXTRA if provided.
# Usage:
#   ./run_user_create_suite.sh              # 100 users
#   ./run_user_create_suite.sh 150          # 150 users
#   ./run_user_create_suite.sh 100 50       # 100 + 50 = 150 users

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJ_ROOT"

COUNT="${1:-100}"
EXTRA="${2:-0}"
BASE_URL="${BASE_URL:-http://doc-hub-api:8000}"

echo "User Create Suite: count=$COUNT, extra=$EXTRA, total=$((COUNT + EXTRA))"
PYTHONUNBUFFERED=1 python3 -m tests.user_create_suite.run_user_create_suite \
  --count "$COUNT" \
  --extra "$EXTRA" \
  --base-url "$BASE_URL"

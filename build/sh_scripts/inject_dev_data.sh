#!/bin/bash

# ===============================================================================
# inject_dev_data.sh — Seed Dev Environment with Sample Data
# ===============================================================================
# Injects resume data and creates a dev user so you can see the full app in action.
# Run from tests-manual container: docker exec -it tests-manual ./build/sh_scripts/inject_dev_data.sh
# Or from project root after dev env is up: ./build/sh_scripts/inject_dev_data.sh (uses localhost)
# ===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [ -f "$PROJ_ROOT/cfgs/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJ_ROOT/cfgs/.env"
  set +a
fi

# Colors
off="\033[0m"
red="\033[0;31m"
green="\033[0;32m"
yellow="\033[0;33m"
cyan="\033[1;36m"
magenta="\033[0;35m"
gray="\033[0;37m"

JOB="${green}JOB:${gray} --> ${off}"
# Multi-collection data: resumes + record types (ubuntu_releases, python_releases, roman_leaders)
DATA_BASE="${DATA_BASE:-/dbapp/tests/data_sets}"
DATA_DIR="${DATA_DIR:-$DATA_BASE/resumes}"
BASE_URL="${BASE_URL:-http://doc-hub-api:8000}"
DUMMY_USER="dev@dev.com"
DUMMY_PASS="dev123"  
# DEV_EMAIL="${DUMMY_USER:-dev@example.com}"
# DEV_PASS="${DUMMY_PASS:-dev123}"
DEV_NAME="Dev User"

# If running from host (no /dbapp), use relative path and localhost
if [ ! -d "$DATA_DIR" ]; then
  DATA_BASE="$PROJ_ROOT/tests/data_sets"
  DATA_DIR="$DATA_BASE/resumes"
  BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
fi

if [ ! -d "$DATA_BASE" ]; then
  DATA_BASE="$(cd "$(dirname "$DATA_DIR")" 2>/dev/null && pwd)"
fi
if [ ! -d "$DATA_DIR" ] && [ ! -d "${DATA_BASE:-.}/resumes" ]; then
  echo -e "${red}Error:${off} Data directory not found: ${DATA_DIR:-$DATA_BASE/resumes}"
  exit 1
fi

echo -e "\n${cyan}═══════════════════════════════════════════════════════════════${off}"
echo -e "${cyan}  Doc Portal — Dev Data Injection${off}"
echo -e "${cyan}═══════════════════════════════════════════════════════════════${off}\n"
echo -e "$JOB Base URL: ${yellow}$BASE_URL${off}"
echo -e "$JOB Data base: ${yellow}${DATA_BASE:-$DATA_DIR}${off}\n"

# -------------------------------------------------------------------------------
# 1. Wait for FastAPI
# -------------------------------------------------------------------------------
echo -e "$JOB ${magenta}1. Waiting for FastAPI${off}"
for i in {1..30}; do
  if curl -sf "$BASE_URL/resume/status/health" >/dev/null 2>&1; then
    echo -e "$JOB ${green}FastAPI is ready${off}\n"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${red}Error:${off} FastAPI not reachable at $BASE_URL after 30 attempts"
    exit 1
  fi
  sleep 1
done

# -------------------------------------------------------------------------------
# 2. Create dev user (for UI login)
# -------------------------------------------------------------------------------
echo -e "$JOB ${magenta}2. Creating dev user${off} (${DUMMY_USER} / ${DUMMY_PASS})"
REG_RESP=$(curl -sf -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DUMMY_USER\",\"password\":\"$DUMMY_PASS\",\"name\":\"$DEV_NAME\"}" 2>/dev/null || true)
if echo "$REG_RESP" | grep -q "access_token"; then
  echo -e "$JOB ${green}Dev user created${off}\n"
elif echo "$REG_RESP" | grep -q "already registered"; then
  echo -e "$JOB ${yellow}Dev user already exists${off}\n"
else
  echo -e "$JOB ${yellow}Register response: $REG_RESP${off}\n"
fi

# -------------------------------------------------------------------------------
# 3. Get API key
# -------------------------------------------------------------------------------
echo -e "$JOB ${magenta}3. Getting API key${off}"
CURL_ADMIN=()
if [[ -n "${ADMIN_SECRET:-}" ]]; then
  CURL_ADMIN=(-H "X-Admin-Secret: ${ADMIN_SECRET}")
fi
KEY_RESP=$(curl -sf -X POST "$BASE_URL/auth/generate-api-key" "${CURL_ADMIN[@]}" 2>/dev/null || true)
API_KEY=$(echo "$KEY_RESP" | jq -r '.api_key // empty' 2>/dev/null)
if [ -z "$API_KEY" ]; then
  echo -e "$JOB ${yellow}Trying existing key from /tmp/api_key.txt${off}"
  if [ -f /tmp/api_key.txt ]; then
    API_KEY=$(cat /tmp/api_key.txt)
  fi
fi
if [ -z "$API_KEY" ]; then
  echo -e "${red}Error:${off} Could not obtain API key. Response: $KEY_RESP"
  exit 1
fi
echo "$API_KEY" >/tmp/api_key.txt 2>/dev/null || true
echo -e "$JOB ${green}API key ready${off}\n"

# -------------------------------------------------------------------------------
# 4. Inject data (resumes + record collections)
# -------------------------------------------------------------------------------
get_endpoint() {
  case "$1" in
    resumes) echo "/resume/" ;;
    ubuntu_releases) echo "/ubuntu-releases/" ;;
    python_releases) echo "/python-releases/" ;;
    roman_leaders) echo "/roman-leaders/" ;;
    *) echo "" ;;
  esac
}

total_count=0
total_failed=0
for subdir in resumes ubuntu_releases python_releases roman_leaders; do
  if [ "$subdir" = "resumes" ]; then
    coll_dir="${DATA_DIR:-$DATA_BASE/resumes}"
  else
    coll_dir="${DATA_BASE}/$subdir"
  fi
  endpoint=$(get_endpoint "$subdir")

  [ ! -d "$coll_dir" ] && continue

  echo -e "$JOB ${magenta}4.$subdir Injecting $subdir${off}"
  count=0
  failed=0
  for f in "$coll_dir"/*.json; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .json)
    if [ "$name" = "dummy_pyaload" ]; then
      echo -e "$JOB ${gray}Skip $name (invalid payload)${off}"
      continue
    fi
    resp=$(curl -sf -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d @"$f" 2>/dev/null) || true
    if echo "$resp" | grep -q '"id"'; then
      id=$(echo "$resp" | jq -r '.id')
      echo -e "$JOB ${green}✓${off} $name -> ${cyan}$id${off}"
      count=$((count + 1))
      total_count=$((total_count + 1))
    else
      echo -e "$JOB ${red}✗${off} $name: $resp"
      failed=$((failed + 1))
      total_failed=$((total_failed + 1))
    fi
  done
  [ $count -gt 0 ] && echo -e "$JOB ${green}$subdir: $count injected${off}\n"
done

echo -e "\n$JOB ${green}Done.${off} Injected ${cyan}$total_count${off} records total${total_failed:+ (${red}$total_failed failed${off})}"
echo -e "\n${gray}Login at http://localhost:3000 with ${DUMMY_USER} / ${DUMMY_PASS}${off}"
echo -e "${gray}View resumes in Mongo Express: http://localhost:8081/db/resume_db/resume${off}\n"

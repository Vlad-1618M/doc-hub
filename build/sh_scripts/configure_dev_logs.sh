#!/usr/bin/env bash
# ==============================================================================
# configure_dev_logs.sh — Tune dev logging (API + MongoDB + PyMongo tracing)
# ==============================================================================
# Run from repo root:
#   ./build/sh_scripts/configure_dev_logs.sh
# Non-interactive:
#   ./build/sh_scripts/configure_dev_logs.sh --level 2 --targets all
#   ./build/sh_scripts/configure_dev_logs.sh --level 1 --targets 1,2 --restart-api
# After dev_run skipped log setup, run this anytime against a running stack.
# ==============================================================================

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/cfgs/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/build/docker-compose.yml" -p build)

off="\033[0m"
yellow="\033[0;33m"
green="\033[0;32m"
cyan="\033[1;36m"
gray="\033[0;37m"
red="\033[0;31m"
bold="\033[1m"

usage() {
  sed -n '1,20p' "$0" | tail -n +2
  echo ""
  echo "Options:"
  echo "  --level N          1=DEBUG 2=INFO 3=WARNING 4=ERROR (or: debug|info|warning|error)"
  echo "  --targets LIST     Comma list: 1=api 2=pymongo 3=mongo_server 4=profiler  all|5"
  echo "  --restart-api      Recreate doc-hub-api after updating cfgs/.env (default: yes)"
  echo "  --no-restart-api   Only write .env and live Mongo settings"
  echo "  --reset            Remove tuning keys from .env; set Mongo verbosity & profiler off"
  echo "  -h, --help         This help"
}

# --- cfgs/.env upsert (keys only; avoids parsing passwords) ---
upsert_env_var() {
  local key="$1" val="$2"
  [[ -f "$ENV_FILE" ]] || touch "$ENV_FILE"
  local tmp
  tmp="$(mktemp)"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    grep -v "^${key}=" "$ENV_FILE" >"$tmp" || true
  else
    cp "$ENV_FILE" "$tmp"
  fi
  printf '%s=%s\n' "$key" "$val" >>"$tmp"
  mv "$tmp" "$ENV_FILE"
}

remove_env_keys() {
  local tmp
  tmp="$(mktemp)"
  local keys=("UVICORN_LOG_LEVEL" "APP_LOG_LEVEL" "MONGO_LOG_COMMANDS")
  cp "$ENV_FILE" "$tmp"
  for k in "${keys[@]}"; do
    if grep -q "^${k}=" "$tmp" 2>/dev/null; then
      grep -v "^${k}=" "$tmp" >"${tmp}.2" || true
      mv "${tmp}.2" "$tmp"
    fi
  done
  mv "$tmp" "$ENV_FILE"
}

load_env_creds() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${red}Missing ${ENV_FILE}${off}" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

mongo_container_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'doc-hub-mongo'
}

api_container_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'doc-hub-api'
}

# Map level index / name → uvicorn, app, pymongo flag, mongo verbosities, profiler
apply_level_maps() {
  local L="$1"
  case "$L" in
    1|debug|DEBUG)
      UV=debug
      AP=DEBUG
      PM=1
      MC=2
      MW=2
      MN=1
      PROF=1
      SLOWMS=100
      ;;
    2|info|INFO)
      UV=info
      AP=INFO
      PM=1
      MC=1
      MW=1
      MN=0
      PROF=1
      SLOWMS=100
      ;;
    3|warning|WARNING|warn)
      UV=warning
      AP=WARNING
      PM=0
      MC=0
      MW=0
      MN=0
      PROF=0
      SLOWMS=100
      ;;
    4|error|ERROR)
      UV=error
      AP=ERROR
      PM=0
      MC=0
      MW=0
      MN=0
      PROF=0
      SLOWMS=100
      ;;
    *)
      echo -e "${red}Invalid level: $L${off}" >&2
      exit 1
      ;;
  esac
}

mongo_apply_verbosity() {
  local cmd_v="$1" write_v="$2" net_v="$3"
  load_env_creds
  docker exec doc-hub-mongo mongosh -u "$MONGO_ADMIN_USER" -p "$MONGO_ADMIN_PASS" \
    --authenticationDatabase admin --quiet --eval \
    "db.adminCommand({setParameter:1,logComponentVerbosity:{command:{verbosity:${cmd_v}},write:{verbosity:${write_v}},network:{verbosity:${net_v}}}})" \
    >/dev/null
  echo -e "${green}MongoDB logComponentVerbosity set: command=${cmd_v} write=${write_v} network=${net_v}${off}"
}

mongo_apply_profiler() {
  local level="$1" slow="$2"
  load_env_creds
  if [[ "$level" == "0" ]]; then
    docker exec doc-hub-mongo mongosh -u "$MONGO_ADMIN_USER" -p "$MONGO_ADMIN_PASS" \
      --authenticationDatabase admin "$MONGO_DB" --quiet --eval "db.setProfilingLevel(0)" >/dev/null
  else
    docker exec doc-hub-mongo mongosh -u "$MONGO_ADMIN_USER" -p "$MONGO_ADMIN_PASS" \
      --authenticationDatabase admin "$MONGO_DB" --quiet --eval \
      "db.setProfilingLevel(${level}, { slowms: ${slow} })" >/dev/null
  fi
  echo -e "${green}MongoDB profiler set: level=${level} slowms=${slow} (db=${MONGO_DB})${off}"
}

do_reset() {
  remove_env_keys
  if mongo_container_running; then
    mongo_apply_verbosity 0 0 0 || true
    mongo_apply_profiler 0 100 || true
  fi
  echo -e "${green}Reset: removed API log keys from .env; Mongo verbosity & profiler cleared.${off}"
  if api_container_running; then
    echo -e "${yellow}Recreating doc-hub-api to pick clean env...${off}"
    "${COMPOSE[@]}" up -d --force-recreate doc-hub-api
  fi
}

# --- interactive ---
# When stdin is not a TTY (nested from another script, pipe, IDE), read prompts from /dev/tty.
read_interactive_line() {
  local _line
  if [[ -t 0 ]]; then
    IFS= read -r _line || true
  elif [[ -r /dev/tty ]]; then
    IFS= read -r _line < /dev/tty || true
  else
    IFS= read -r _line || true
  fi
  printf '%s\n' "$_line"
}

prompt_level() {
  # Menus on stderr so LEVEL="$(prompt_level)" captures only the numeric answer.
  echo -e "\n${bold}Select log level${off} ${gray}(applies to each target you choose next)${off}" >&2
  echo "  ${cyan}1${off} = DEBUG   — noisy; PyMongo timings, Mongo command/write detail" >&2
  echo "  ${cyan}2${off} = INFO    — default dev; useful API + driver command names" >&2
  echo "  ${cyan}3${off} = WARNING — quieter" >&2
  echo "  ${cyan}4${off} = ERROR   — minimal" >&2
  echo -ne "${yellow}Level [1-4, default 2]: ${off}" >&2
  L="$(read_interactive_line)"
  L="${L:-2}"
  echo "$L"
}

prompt_targets() {
  echo -e "\n${bold}Select targets${off} ${gray}(comma-separated numbers, or ${cyan}all${gray} / ${cyan}5${gray})${off}" >&2
  echo "  ${cyan}1${off} = API — Uvicorn (${gray}UVICORN_LOG_LEVEL${off}) + Python app loggers (${gray}APP_LOG_LEVEL${off})" >&2
  echo "  ${cyan}2${off} = PyMongo — command tracing (${gray}MONGO_LOG_COMMANDS${off} → ${gray}doc-hub-api${off} logs)" >&2
  echo "  ${cyan}3${off} = MongoDB server — command/write/network verbosity (${gray}docker logs doc-hub-mongo${off})" >&2
  echo "  ${cyan}4${off} = MongoDB profiler — slow queries → ${gray}system.profile${off}" >&2
  echo "  ${cyan}5${off} / ${cyan}all${off} = all of the above" >&2
  echo -ne "${yellow}Targets: ${off}" >&2
  T="$(read_interactive_line)"
  echo "$T"
}

parse_targets() {
  local raw="$1"
  raw="${raw// /}"
  if [[ -z "$raw" || "$raw" == "all" || "$raw" == "5" ]]; then
    echo "1 2 3 4"
    return
  fi
  local out="" i
  IFS=',' read -ra parts <<<"$raw"
  for i in "${parts[@]}"; do
    [[ -z "$i" ]] && continue
    case "$i" in
      1|2|3|4) out="$out $i" ;;
      *) echo -e "${red}Unknown target segment: $i${off}" >&2; exit 1 ;;
    esac
  done
  echo "$out"
}

apply_configuration() {
  local level_in="$1"
  shift
  local targets="$*"
  apply_level_maps "$level_in"

  local t
  for t in $targets; do
    case "$t" in
      1)
        upsert_env_var UVICORN_LOG_LEVEL "$UV"
        upsert_env_var APP_LOG_LEVEL "$AP"
        echo -e "${green}Wrote UVICORN_LOG_LEVEL=${UV} APP_LOG_LEVEL=${AP} → ${ENV_FILE}${off}"
        ;;
      2)
        if [[ "$PM" == "1" ]]; then
          upsert_env_var MONGO_LOG_COMMANDS "1"
        else
          upsert_env_var MONGO_LOG_COMMANDS "0"
        fi
        echo -e "${green}Wrote MONGO_LOG_COMMANDS=${PM:-0} → ${ENV_FILE}${off}"
        ;;
      3)
        if mongo_container_running; then
          mongo_apply_verbosity "$MC" "$MW" "$MN"
        else
          echo -e "${yellow}doc-hub-mongo not running — skip live Mongo verbosity (start stack, then re-run this script for target 3).${off}"
        fi
        ;;
      4)
        if mongo_container_running; then
          mongo_apply_profiler "$PROF" "$SLOWMS"
        else
          echo -e "${yellow}doc-hub-mongo not running — skip profiler.${off}"
        fi
        ;;
    esac
  done

  local need_api_restart=0
  [[ "$targets" == *"1"* ]] && need_api_restart=1
  [[ "$targets" == *"2"* ]] && need_api_restart=1

  if [[ "$DO_RESTART" == "1" && "$need_api_restart" == "1" ]]; then
    if api_container_running; then
      echo -e "\n${yellow}Recreating doc-hub-api to load new env...${off}"
      "${COMPOSE[@]}" up -d --force-recreate doc-hub-api
      echo -e "${green}doc-hub-api recreated.${off}"
    else
      echo -e "${yellow}doc-hub-api not running — start the stack with dev_run.sh or compose up.${off}"
    fi
  fi
}

# --- main ---
DO_RESTART=1
LEVEL=""
TARGETS_RAW=""
RESET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --level)
      LEVEL="$2"
      shift 2
      ;;
    --targets)
      TARGETS_RAW="$2"
      shift 2
      ;;
    --restart-api) DO_RESTART=1; shift ;;
    --no-restart-api) DO_RESTART=0; shift ;;
    --reset) RESET=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo -e "${red}Unknown option: $1${off}"; usage; exit 1 ;;
  esac
done

cd "$ROOT"

if [[ "$RESET" == "1" ]]; then
  do_reset
  exit 0
fi

if [[ -z "$LEVEL" ]]; then
  LEVEL="$(prompt_level)"
fi
if [[ -z "$TARGETS_RAW" ]]; then
  TARGETS_RAW="$(prompt_targets)"
fi

TSET="$(parse_targets "$TARGETS_RAW")"
echo -e "\n${gray}Applying level=${LEVEL} targets=${TSET}${off}"
apply_configuration "$LEVEL" $TSET

echo -e "\n${green}Done.${off} Tail API: ${cyan}docker logs -f doc-hub-api${off}"
echo -e "Tail Mongo: ${cyan}docker logs -f doc-hub-mongo${off}"
echo -e "Run again anytime, or ${cyan}./build/sh_scripts/configure_dev_logs.sh --reset${off} to clear.\n"

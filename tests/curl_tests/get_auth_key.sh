#!/bin/bash

# ... colors:
off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

# ... decorators | used in output formatting:
decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..93})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# BASE_URL="http://127.0.0.1:8000"
BASE_URL="http://doc-hub-api:8000"

# FastAPI reads ADMIN_SECRET from container env and/or cfgs/.env (pydantic). If compose left
# ADMIN_SECRET unset in the shell but cfgs/.env defines it, load it here so X-Admin-Secret matches.
load_admin_secret_from_cfgs_env() {
    local line val
    [[ -n "${ADMIN_SECRET// }" ]] && return 0
    [[ -f "$ROOT/cfgs/.env" ]] || return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*ADMIN_SECRET[[:space:]]*= ]] || continue
        val="${line#*=}"
        val="${val#"${val%%[![:space:]]*}"}"
        val="${val%"${val##*[![:space:]]}"}"
        val="${val//$'\r'/}"
        if [[ "${val:0:1}" == '"' && "${val: -1}" == '"' ]]; then
            val="${val:1:${#val}-2}"
        elif [[ "${val:0:1}" == "'" && "${val: -1}" == "'" ]]; then
            val="${val:1:${#val}-2}"
        fi
        export ADMIN_SECRET="$val"
        return 0
    done < "$ROOT/cfgs/.env"
}

load_admin_secret_from_cfgs_env

# ... jq lib exists check:
if ! command -v jq &> /dev/null; then
    $decorator_init
    echo -e "$JOB ${red}Deps Error: ${magenta}jq${off} is not installed: Install ${magenta}jq${off} using one of the following methods:"
    echo -e "\t- For ${green}Debian/Ubuntu:\t\t${gray}--> ${yellow}sudo apt-get install jq${off}"
    echo -e "\t- For ${green}Fedora:\t\t\t${gray}--> ${yellow}sudo dnf install jq${off}"
    echo -e "\t- For ${green}CentOS/RHEL:\t\t${gray}--> ${yellow}sudo yum install jq${off}"
    echo -e "\t- For ${green}macOS (with Homebrew):\t${gray}--> ${yellow}brew install jq${off}"
    $decorator_done
    exit 1
fi

echo -e "\n$JOB Requesting ${magenta}FastAPI$gray -->\t${yellow}[${cyan} ${BASE_URL} ${yellow}]${off}: server to generate an ${magenta}API ${off}Access token ..."

# When the API has ADMIN_SECRET set, key generation requires X-Admin-Secret (or JWT).
CURL_ADMIN=()
if [[ -n "${ADMIN_SECRET// }" ]]; then
    CURL_ADMIN=(-H "X-Admin-Secret: ${ADMIN_SECRET//[$'\r\n']}")
fi

# ... Request API Key (capture HTTP status for clearer failures)
TMP_BODY=$(mktemp)
trap 'rm -f "$TMP_BODY"' EXIT
HTTP_CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X POST "${BASE_URL}/auth/generate-api-key" "${CURL_ADMIN[@]}")
RESPONSE=$(cat "$TMP_BODY")

# ... check fastAPI response:
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo -e "$JOB ${red}Error:${off} Invalid response from API (HTTP ${HTTP_CODE}): $RESPONSE"
    exit 1
fi

# ... get the API key:
API_KEY=$(echo "$RESPONSE" | jq -r '.api_key // empty')

# ... validate API key:
if [[ -z "$API_KEY" ]]; then
    echo -e "$JOB ${red}Error:${off} API did not return a valid key (HTTP ${HTTP_CODE})."
    echo -e "$JOB ${gray}Response:${off} $RESPONSE"
    if [[ "$HTTP_CODE" == "403" && -z "${CURL_ADMIN[*]}" ]]; then
        echo -e "$JOB ${yellow}Hint:${off} Set ADMIN_SECRET in cfgs/.env and/or pass the same value into the tests container (see build/docker-compose*.yml)."
    fi
    exit 1
fi

echo -e "$JOB ${green}Success:${off} API key generated:\t${yellow}[$cyan $API_KEY $yellow]${off}"

# ... store API key:
echo "$API_KEY" > /tmp/api_key.txt
chmod 600 /tmp/api_key.txt
echo -e "$JOB ${green}Success:${off} API key stored:\t${gray}[ /tmp/api_key.txt ]${off}"

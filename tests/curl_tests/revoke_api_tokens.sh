#!/bin/bash
# Colors for output formatting:
off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${gray}$(printf '.%.0s' {1..51})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..51})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# .. base URL + endpoint for revoking API keys:
BASE_URL="http://doc-hub-api:8000/auth"
REVOKE_ENDPOINT="/revoke-api-key"

# ... File paths + SCRIPT_DIR refs the file relative to this script:
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_KILL_LIST="$SCRIPT_DIR/key_kill_list.txt"
TEMP_FILE="${KEY_KILL_LIST}.tmp"

# ... URL encoding function:
urlencode() {
    local encoded=""
    local char
    for ((i = 0; i < ${#1}; i++)); do
        char="${1:i:1}"
        case "$char" in
            [a-zA-Z0-9._~-]) encoded+="$char" ;;
            *) encoded+="$(printf '%%%02X' "'$char")" ;;
        esac
    done
    echo "$encoded"
}

# ... jq exists check:
if ! command -v jq &>/dev/null; then
    echo -e "$JOB ${red}Error:${off} jq is not installed. Please install jq and retry."
    exit 1
fi

# ... check tokens:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "$JOB ${red}Error:${off} API token not found. Please run your authentication script."
    exit 1
fi
API_KEY=$(tr -d '[:space:]' < /tmp/api_key.txt)

# ... key kill list exists + non-empty check:
if [[ ! -f "$KEY_KILL_LIST" ]]; then
    echo -e "$JOB ${red}Error:${off} API key revoke list ${yellow}$KEY_KILL_LIST${off} not found."
    exit 1
fi

if [[ ! -s "$KEY_KILL_LIST" ]]; then
    echo -e "$JOB ${yellow}Notice:${off} API key revoke list ${yellow}$KEY_KILL_LIST${off} is empty. Nothing to process."
    exit 0
fi

echo -e "$JOB ${cyan}Key file contents:${off}"
cat "$KEY_KILL_LIST"
echo ""

$decorator_init
echo -e "$JOB ${cyan}Processing API keys from${off} ${yellow}$(basename "$KEY_KILL_LIST")${off} ...\n"

# ... create temp file to store failed keys:
> "$TEMP_FILE"

# ... kill list key prossess:
while IFS= read -r API_KEY_TO_REVOKE || [[ -n "$API_KEY_TO_REVOKE" ]]; do
    # ... trim whitespace:
    API_KEY_TO_REVOKE=$(echo "$API_KEY_TO_REVOKE" | tr -d '[:space:]')
    # ... skip empty lines:
    if [[ -z "$API_KEY_TO_REVOKE" ]]; then
        continue
    fi

    # ... URL-encode the key:
    ENCODED_KEY=$(urlencode "$API_KEY_TO_REVOKE")
    echo -e "$JOB ${cyan}Revoking API key:${off} ${yellow}\"$API_KEY_TO_REVOKE\"${off} ..."

    # ... DELETE endpoint call:
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${REVOKE_ENDPOINT}?api_key_to_revoke=${ENCODED_KEY}" \
      -H "accept: application/json" \
      -H "X-API-Key: ${API_KEY}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ne 200 ]; then
        echo -e "$JOB ${red}Error:${off} Failed to revoke API key (HTTP Status: $HTTP_CODE)"
        echo "$API_KEY_TO_REVOKE" >> "$TEMP_FILE"
        continue
    fi

    MESSAGE=$(echo "$BODY" | jq -r '.message // empty')
    if [[ -n "$MESSAGE" && "$MESSAGE" != "null" ]]; then
        echo -e "$JOB ${green}Success:${off} ${white}$MESSAGE${off}"
    else
        echo -e "$JOB ${red}Error:${off} API key ${cyan}\"$API_KEY_TO_REVOKE\"${off} not found or invalid response."
        echo "$API_KEY_TO_REVOKE" >> "$TEMP_FILE"
    fi
done < "$KEY_KILL_LIST"

# ... replace the kill list with temp file with failed to revoke keys:
mv "$TEMP_FILE" "$KEY_KILL_LIST"
echo -e "$JOB ${green}All API keys in${off} ${yellow}$(basename "$KEY_KILL_LIST")${off} have been processed."
$decorator_init

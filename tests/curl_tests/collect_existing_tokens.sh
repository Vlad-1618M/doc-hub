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

JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# BASE_URL="http://127.0.0.1:8000/auth"
BASE_URL="http://doc-hub-api:8000/auth"
API_KEYS_ENDPOINT="/api-keys"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_KILL_LIST="$SCRIPT_DIR/key_kill_list.txt"

# Check for API token:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "$JOB ${red}Error:${off} API token not found. Please run your authentication script."
    exit 1
fi
API_KEY=$(tr -d '[:space:]' < /tmp/api_key.txt)

# Call the GET endpoint:
RESPONSE=$(curl -s -w "\n%{http_code}" -H "accept: application/json" -H "X-API-Key: ${API_KEY}" "${BASE_URL}${API_KEYS_ENDPOINT}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "$JOB ${red}Error:${off} Failed to retrieve API keys (HTTP Status: $HTTP_CODE)"
    echo -e "$JOB Response: $BODY"
    exit 1
fi

# ... JSON response pars + extract keys:
API_KEYS=$(echo "$BODY" | jq -r '.api_keys[]')
if [ -z "$API_KEYS" ]; then
    echo -e "$JOB ${red}Error:${off} No API keys found in the response."
    exit 1
fi

TOTAL_KEYS=$(echo "$BODY" | jq -r '.api_keys | length')
echo "$API_KEYS" > "$KEY_KILL_LIST"

echo -e "$JOB ${green}Success:${off} Collected API keys saved to: ${yellow}$KEY_KILL_LIST${cyan} Total Key count: ${green}${TOTAL_KEYS}${off}"

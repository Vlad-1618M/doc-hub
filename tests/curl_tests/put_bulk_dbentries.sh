#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${red}$(printf '.%.0s' {1..105})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..73})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"
# BASE_URL="http://127.0.0.1:8000/resume/"
BASE_URL="http://doc-hub-api:8000/resume/"

# ... get payload data dir:
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ... API key exists:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call ${gray}--> ${yellow}get_auth_key.sh${off} script to get a new token."
    exit 1
fi
API_KEY=$(cat /tmp/api_key.txt)

# ... get payload dir JSON files:
echo -e "\n$JOB Searching for ${yellow}[${magenta} resumes ${yellow}]${off} directory..."
RESUME_DIR=$(find "$(dirname "${BASH_SOURCE[0]}")" -type d -name "resumes" 2>/dev/null | head -n 1)

# ... data dir exists check:
if [[ ! -d "$RESUME_DIR" ]]; then
    echo -e "\n$JOB ${red}Error:${off} Directory '$RESUME_DIR' not found."
    exit 1
fi
echo -e "$JOB PUT (bulk) request: ${cyan}Data Dir:${off} ${yellow}$(dirname "$RESUME_DIR")/${magenta}$(basename "$RESUME_DIR")${off}"
$decorator_init

count=1 
# ... iterate JSON file:
for RESUME_FILE in "$RESUME_DIR"/*.json; do
    echo -e "$JOB ${white}Processing file:${magenta}\t$(basename "$RESUME_FILE")${off}"
    
    # Read JSON.
    if ! RESUME_JSON=$(jq -c . "$RESUME_FILE" 2>/dev/null); then
        echo -e "$JOB ${red}Error:${off} Invalid JSON in $RESUME_FILE. Skipping."
        continue
    fi

    # ... get names:
    FIRST_NAME=$(jq -r '.resume.name.first_name // "Unknown"' <<< "$RESUME_JSON")
    LAST_NAME=$(jq -r '.resume.name.last_name // "Unknown"' <<< "$RESUME_JSON")
    if [[ "$FIRST_NAME" == "Unknown" || "$LAST_NAME" == "Unknown" ]]; then
        echo -e "$JOB ${red}Error: ${yellow}Data in\t${gray}$(basename $RESUME_FILE) ${white}does not match any exisitng recods: ${red}DB Record Not Found: ${gray} Skipping ${off}...\n"
        $decorator_init
        continue
    fi

    # Debug: print names from payload JSON:
    # echo -e "\t ---> DEBUG: Extracted FIRST_NAME='${FIRST_NAME}' and LAST_NAME='${LAST_NAME}'"

    # ... encode urls with python | easier this way to handle path charecters:
    FN_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$FIRST_NAME")
    LN_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$LAST_NAME")
    
    # ... setup bulk ursl + endpoint filters:
    URL="${BASE_URL}bulk?first_name=${FN_ENC}&last_name=${LN_ENC}"
    
    # ... get JSON payload: | entire file:
    UPDATED_PAYLOAD=$(jq -c '.' <<< "$RESUME_JSON")
    if ! jq empty <<< "$UPDATED_PAYLOAD" >/dev/null 2>&1; then
        echo -e "$JOB ${red}Error:${off} Malformed JSON in $RESUME_FILE. Skipping."
        continue
    fi
    
    echo -e "$JOB ${yellow}PUT (bulk) request:\t${cyan}URL: ${gray}${URL%/*}${off}/${magenta}${URL##*/}${off}"
    RESPONSE=$(curl -s -X PUT "${URL}" \
         -H "X-API-Key: ${API_KEY}" \
         -H "Content-Type: application/json" \
         -d "$UPDATED_PAYLOAD")

    # ... response check:
    if jq -e '.message' <<< "$RESPONSE" >/dev/null 2>&1; then
        echo -e "$JOB ${green}Success:${off}\t\t${cyan}$RESPONSE${gray} | request count: ${white}${count}${off}\n"
    else
        echo -e "$JOB ${red}Error:${off} API returned: $RESPONSE"
    fi
    # $decorator_done
    count=$((count + 1)) # ... increment counter :
    sleep 0.3
done
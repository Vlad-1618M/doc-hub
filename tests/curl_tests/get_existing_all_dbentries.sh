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

# ... stdout format decorators:
decorator_init="echo -e ${gray}$(printf '.%.0s' {1..51})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..51})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# BASE_URL="http://127.0.0.1:8000/resume"
BASE_URL="http://doc-hub-api:8000/resume"

# ... read API token from /tmp directory:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call ${gray}--> ${yellow}test_auth.sh${off} script to get a new token."
    exit 1
fi

API_KEY=$(cat /tmp/api_key.txt)

echo -e "\n$JOB ${cyan}Retrieving ${yellow}all existing ${gray}resumes in db${off}..."
RESUMES_JSON=$(curl -s -X GET "${BASE_URL}/?skip=0&limit=100" -H "X-API-Key: ${API_KEY}")

# ... response is a valid | check non-empty JSON array:
if ! echo "$RESUMES_JSON" | jq 'type == "array" and length > 0' 2>/dev/null | grep -q true; then
    echo -e "$JOB ${red}Error: ${white}Invalid or empty API JSON response:${red} [${yellow} $RESUMES_JSON ${red}]${off}\n"
    exit 1
fi

count=1 # ... init counter
echo "$RESUMES_JSON" | jq -c '.[]' | while IFS= read -r resume; do  
    # Extract first & last name from the nested "resume" object
    FIRST_NAME=$(echo "$resume" | jq -r '.resume.name.first_name // "Unknown"')
    LAST_NAME=$(echo "$resume" | jq -r '.resume.name.last_name // "Unknown"')
    FULL_NAME="${FIRST_NAME} ${LAST_NAME}"

    ID=$(echo "$resume" | jq -r '.["_id"] // "N/A"')
    # ...get datetime:
    CREATED_AT=$(echo "$resume" | jq -r '.created_at.t["$date"] // "Unknown Date"')

    printf "${JOB} ${white}Resume${off} ${cyan}%-30s${gray} --> ID: ${cyan}%s${off} ${gray}|${off} db entry date: ${yellow}%s${off} ${gray}|${off} entry count: ${yellow}%d${off}\n" "$FULL_NAME" "$ID" "$CREATED_AT" "$count"
    count=$((count + 1)) # ... increment counter
done
#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..123})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# BASE_URL="http://127.0.0.1:8000/resume"
BASE_URL="http://doc-hub-api:8000/resume"

if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call ${gray}--> ${yellow}get_auth_key.sh${off} script to get new token."
    exit 1
fi

API_KEY=$(cat /tmp/api_key.txt)
PRESIDENT_NAMES=("George Washington" "John Adams" "Thomas Jefferson" "James Madison" "James Monroe")

# ... using minimal payload for simplicity:
echo -e "\n$JOB ${white}Creating ${off}minimal resume sets:"
$decorator_init

count=1
for name in "${PRESIDENT_NAMES[@]}"; do
    first_name=$(echo "$name" | awk '{print $1}')
    last_name=$(echo "$name" | awk '{print $2, $3}' | sed 's/ *$//')
    EMAIL=$(echo "${first_name}_${last_name}" | sed 's/ /_/g')@whitehouse.gov

    # ... JSON payload | essential fields only:
    JSON_PAYLOAD=$(cat <<EOF
{
  "resume": {
      "name": {
          "first_name": "${first_name}",
          "last_name": "${last_name}"
      },
      "location": {
          "address": {
              "country": "",
              "state": "",
              "city": "",
              "zip_code": "",
              "timezone": ""
          }
      },
      "contact": {
          "email": "${EMAIL}",
          "phone": ""
      },
      "job_title": {
          "position": "President",
          "role": "President of the United States"
      }
  }
}
EOF
)

    RESPONSE=$(curl -s -X POST "${BASE_URL}/" \
         -H "X-API-Key: ${API_KEY}" \
         -H "Content-Type: application/json" \
         -d "$JSON_PAYLOAD")

    if jq -e '.message' <<< "$RESPONSE" >/dev/null 2>&1; then
        ID=$(echo "$RESPONSE" | jq -r '.id')
        printf "${JOB} new: ${cyan}%-27s${gray} --> ${yellow}resume${off} created: ${white}response: ${green}\"id\":${cyan}\"%s\" ${gray}| entry count: ${yellow}%d${off}\n" "$name" "$ID" "$count"
    else
        echo -e "$JOB ${red}Error:${off} API returned failure: $RESPONSE"
    fi
    
    count=$((count + 1))
done

$decorator_done

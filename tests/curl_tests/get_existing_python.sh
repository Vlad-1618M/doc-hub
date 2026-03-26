#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"

JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"
BASE_URL="http://doc-hub-api:8000/python-releases"

[[ -f /tmp/api_key.txt ]] || { echo -e "\n$JOB API token ${red}not found${off}! Call get_auth_key.sh"; exit 1; }
API_KEY=$(cat /tmp/api_key.txt)

JSON=$(curl -s -X GET "${BASE_URL}/?skip=0&limit=100" -H "X-API-Key: ${API_KEY}")
if ! echo "$JSON" | jq 'type == "array"' 2>/dev/null | grep -q true; then
    echo -e "$JOB ${red}Error:${off} Invalid response: $JSON"; exit 1
fi

n=$(echo "$JSON" | jq 'length' 2>/dev/null)
[[ "$n" -eq 0 ]] && { echo -e "$JOB ${gray}No Python releases in DB.${off}"; exit 0; }
count=1
echo "$JSON" | jq -c '.[]' 2>/dev/null | while read -r doc; do
    ver=$(echo "$doc" | jq -r '.version // "?"')
    status=$(echo "$doc" | jq -r '.status // "?"')
    id=$(echo "$doc" | jq -r '._id // "?"')
    printf "${JOB} ${cyan}Python %-6s %-10s${gray} --> id: ${yellow}%s${off} | %d\n" "$ver" "$status" "$id" "$count"
    count=$((count + 1))
done

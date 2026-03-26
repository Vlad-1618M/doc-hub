#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
green="\033[0;32m"
yellow="\033[0;33m"

JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"
BASE_URL="http://doc-hub-api:8000/python-releases"

[[ -f /tmp/api_key.txt ]] || { echo -e "\n$JOB API token ${red}not found${off}!"; exit 1; }
API_KEY=$(cat /tmp/api_key.txt)

count=0
while true; do
    JSON=$(curl -s -X GET "${BASE_URL}/?skip=0&limit=50" -H "X-API-Key: ${API_KEY}")
    ids=$(echo "$JSON" | jq -r '.[]._id // empty' 2>/dev/null)
    [[ -z "$ids" ]] && break
    while read -r id; do
        [[ -z "$id" ]] && continue
        curl -s -X DELETE "${BASE_URL}/${id}" -H "X-API-Key: ${API_KEY}" >/dev/null
        count=$((count + 1))
        echo -e "$JOB ${cyan}Deleted${off} id: ${yellow}$id${off} | total: $count"
    done <<< "$ids"
done
echo -e "$JOB ${green}Done.${off} Deleted $count Python releases."

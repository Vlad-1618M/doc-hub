#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..93})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

BASE_URL="http://doc-hub-api:8000/python-releases"

if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call ${gray}--> ${yellow}get_auth_key.sh${off} script."
    exit 1
fi
API_KEY=$(cat /tmp/api_key.txt)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data_sets/python_releases"

if [[ ! -d "$DATA_DIR" ]]; then
    echo -e "$JOB ${red}Error:${off} Directory $DATA_DIR not found."
    exit 1
fi

echo -e "\n$JOB ${white}Creating${off} Python releases from ${cyan}$DATA_DIR${off}:"
$decorator_init

count=1
for f in "$DATA_DIR"/*.json; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .json)
    if ! payload=$(jq -c . "$f" 2>/dev/null); then
        echo -e "$JOB ${red}Skip${off} invalid JSON: $name"
        continue
    fi
    RESP=$(curl -s -X POST "${BASE_URL}/" -H "X-API-Key: ${API_KEY}" -H "Content-Type: application/json" -d "$payload")
    if id=$(echo "$RESP" | jq -r '.id // empty'); [[ -n "$id" ]]; then
        printf "${JOB} ${cyan}%-12s${gray} --> ${green}created${off} id: ${yellow}%s${off} | count: %d\n" "$name" "$id" "$count"
    else
        echo -e "$JOB ${red}Error${off} $name: $RESP"
    fi
    count=$((count + 1))
    [[ $count -le 5 ]] || break
done
echo -e "$JOB ${green}Done.${off} Created up to 5 Python releases."

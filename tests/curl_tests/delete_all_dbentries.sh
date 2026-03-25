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
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# BASE_URL="http://127.0.0.1:8000/resume"
BASE_URL="http://doc-hub-api:8000/resume"

# ... read /tmp dir path for API token load:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call ${gray}--> ${yellow}test_auth.sh${off} script to get a new token."
    exit 1
fi

API_KEY=$(cat /tmp/api_key.txt)
SHOW_ERRORS=true  # Set to "false" if suppress errors is needed:

delete_all_resumes() {
    count=1
    while true; do
        echo -e "\n$JOB ${yellow}Fetching${off} all resume IDs ..."
        RESUMES_JSON=$(curl -s -X GET "${BASE_URL}/?skip=0&limit=100" -H "X-API-Key: ${API_KEY}")
        
        # Check that the API returned a JSON array
        if ! echo "$RESUMES_JSON" | jq 'type == "array"' 2>/dev/null | grep -q true; then
            echo -e "$JOB ${red}Error:${off} Invalid API JSON response: ${yellow}$RESUMES_JSON${off}"
            return
        fi

        # Extract first and last name and _id for each resume.
        RESUMES=$(echo "$RESUMES_JSON" | jq -r '.[] | "\(.resume.name.first_name) \(.resume.name.last_name)|\(.["_id"])"')

        if [[ -z "$RESUMES" || "$RESUMES" == "null" ]]; then
            echo -e "$JOB ${green}All resumes deleted. Total deleted: ${yellow}$((count-1))${off}"
            break
        fi
        
        echo -e "$JOB ${magenta}Deleting${off} all fetched resumes ...\n"
        while IFS="|" read -r NAME ID; do
            if [[ -z "$ID" || "$ID" == "null" ]]; then
                [[ "$SHOW_ERRORS" == true ]] && echo -e "$JOB ${gray}Skipping:${cyan} $NAME ${yellow}ID${off} is ${red}invalid${off}"
                continue
            fi
            
            RESPONSE=$(curl -s -X DELETE "${BASE_URL}/${ID}" -H "X-API-Key: ${API_KEY}")
            DELETE_MESSAGE=$(echo "$RESPONSE" | jq -r '.message // .detail // empty')

            if [[ -z "$DELETE_MESSAGE" ]]; then
                printf "${JOB} ${white}Attempting${off} to delete: ${cyan}%-24s${gray} --> ID: ${cyan}%s${off} ${gray}| entry count: ${yellow}%5d${off} ${red}No message returned${off}\n" "$NAME" "$ID" "$count"
            elif [[ "$DELETE_MESSAGE" == "Resume deleted successfully" ]]; then
                printf "${JOB} ${white}Deleted:${off} ${cyan}%-24s${gray} --> ID: ${cyan}%s${off} ${gray}| entry count: ${yellow}%5d${off} ${green}$DELETE_MESSAGE${off}\n" "$NAME" "$ID" "$count"
            elif [[ "$DELETE_MESSAGE" =~ "not found" ]]; then
                [[ "$SHOW_ERRORS" == true ]] && echo -e "$JOB ${red}Error:${off} Resume ${cyan}$NAME${off} with ID ${yellow}$ID${off} not found."
            else
                printf "${JOB} ${white}Response:${off} ${cyan}%-24s${gray} --> ID: ${cyan}%s${off} ${gray}| entry count: ${yellow}%5d${off} ${red}$DELETE_MESSAGE${off}\n" "$NAME" "$ID" "$count"
            fi
            
            count=$((count + 1))
        done <<< "$RESUMES"
        echo -e "\n$JOB ${magenta}DB Check:${white} Checking remaining resumes...${off}"
    done
}

delete_all_resumes

################################################################################################################################################################################################


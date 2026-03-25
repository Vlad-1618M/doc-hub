#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${magenta}$(printf '.%.0s' {1..71})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..51})${off}"
JOB="${magenta}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# $decorator_init
# ... find test dir path:
echo -e "\n$JOB searching for ${yellow}[${magenta} curl_tests ${yellow}]${off} directory:"
TEST_DIR=$(find "$(dirname "${BASH_SOURCE[0]}")" -type d -name "curl_tests" 2>/dev/null | head -n 1)

if [[ -z "$TEST_DIR" ]]; then
    echo -e "$JOB ${red}Error:${off} curl_tests directory:$gray --> ${red}not found${off}:"
    exit 1
fi

echo -e "$JOB ${green}Executing ${cyan}CURL${off} Based ${gray}test suite${off} ..."
# ... test scripts array:
TEST_SCRIPTS=(
    "get_auth_key.sh"
    "post_create_few_dbentries.sh"
    "get_existing_all_dbentries.sh"
    "delete_all_dbentries.sh"
    "get_auth_key.sh"
    "post_create_dbentries_set.sh"
    "get_existing_all_dbentries.sh"
    "put_bulk_dbentries.sh"
    "delete_all_dbentries.sh"
    "get_existing_all_dbentries.sh"
    "post_create_ubuntu_set.sh"
    "get_existing_ubuntu.sh"
    "delete_all_ubuntu.sh"
    "post_create_python_set.sh"
    "get_existing_python.sh"
    "delete_all_python.sh"
    "post_create_roman_set.sh"
    "get_existing_roman.sh"
    "delete_all_roman.sh"
    "collect_existing_tokens.sh"
    "revoke_api_tokens.sh"
    )

# ... run each test script in Bash explicitly:
for script in "${TEST_SCRIPTS[@]}"; do
    TEST_PATH="${TEST_DIR}/${script}"
    if [[ -f "$TEST_PATH" ]]; then
        $decorator_init
        echo -e "$JOB call $gray[${white} test case ${magenta} $script $gray]$off:"
        bash "$TEST_PATH"  # .. call Bash:
        # sleep 3
        # python3 src/helpers/timer.py 3

    else
        echo -e "$JOB test $gray --> $script $white script $red not found$off: $gray --> $TEST_PATH $off"
    fi
done
echo -e "$JOB script $(basename $0) call completed:"
$decorator_done

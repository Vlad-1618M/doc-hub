#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${cyan}$(printf '.%.0s' {1..93})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"



if [ $# -lt 2 ]; then
    echo -e "\n${magenta}script ${green}$(basename $0)${yellow} needs ${gray}'command' ${yellow}argument and ${gray}'iter count' ${yellow}argument${off}:"
    echo -e "\n${green}$(basename $0)${yellow} script call example:${gray} 'pytest tests/using_pytest/test_true_endpoints_sets.py::test_generate_api_key_via_request' ${yellow}10${off}"
    $decorator_done
    exit 1
fi

COMMAND="$1"
ITERATIONS="$2"
COUNT=1

echo -e "\n${JOB}: ${yellow}Starting ${yellow}[${cyan} ${COMMAND} ${yellow}] ${off}loop: ${yellow}acknowledged iteration count${green} $ITERATIONS ${off}"

while [ $COUNT -le "$ITERATIONS" ]; do
    echo -e "${JOB}: ${yellow}Processing Call:${yellow}[${gray} ${COMMAND} ${yellow}]${off}:${green} $COUNT ${off}of ${yellow}$ITERATIONS iteration total${off}:"
    $decorator_init
    
    eval "$COMMAND"
    if [ $? -ne 0 ]; then
        echo -e "${JOB}: ${magenta}Test Call: ${yellow}[${gray} ${COMMAND} ${yellow}]${red} Failed ${off}in ${magenta} $COUNT iteration${off}"
    else
        echo -e "${JOB}: ${magenta}Test Call: ${yellow}[${gray} ${COMMAND} ${yellow}]${green} Passed ${off}in ${magenta} $COUNT iteration${off}"
    fi

    COUNT=$((COUNT + 1))
done

echo -e "${JOB}: ${yellow}[${gray} ${COMMAND} ${yellow}]${off} Test loop completed:"
$decorator_done

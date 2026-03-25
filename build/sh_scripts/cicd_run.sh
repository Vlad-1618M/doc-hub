#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${cyan}$(seq -s '.' 93 | tr -d '[:digit:]')${off}"
decorator_done="echo -e ${green}$(seq -s '=' 93 | tr -d '[:digit:]')${off}"
JOB="${green}JOB:${gray} -->${off}"

pipeline_sequence_check(){
    echo -e "$JOB [$(date +'%Y-%m-%d %H:%M:%S')] Starting ${yellow}CI/CD pipeline ${green}Environment ${gray}Build:${off}"
    # set -e  # ... exit on first failure:
    $decorator_init
    echo -e "$JOB ${magenta}FastAPI server check${off}:"
    if ! ping -c 4 -W 5 doc-hub-api; then
    # if ! ping -c 4 -W 5 doc-hub-api &>/dev/null; then
        echo -e "$JOB${red}ERROR:${white} FastAPI is ${red}unreachable!${off}\n"
        $decorator_done
        exit 1
    fi

    $decorator_init
    echo -e "$JOB ${magenta}Requesting FastAPI app: ${gray}--> ${yellow}[${cyan} http://doc-hub-api:8000 ${yellow}]${off}"
    if ! curl -v http://doc-hub-api:8000/; then
    # if ! curl --silent --fail http://doc-hub-api:8000/ > /dev/null; then
        echo -e "$JOB\t${red}ERROR:${white} FastAPI server is ${red}unreachable!${off}\n"
        $decorator_done
        exit 1
    fi

    $decorator_init
    echo -e "$JOB ${magenta} Generating${green} API key for ${magenta}Pytests${off}:"
    if ! ./tests/curl_tests/get_auth_key.sh; then
        echo -e "$JOB${red}ERROR:${white} Key generation ${red}failed!${off}\n"
        $decorator_done
        exit 1
    fi

    $decorator_init
    echo -e "$JOB ${magenta} Running ${yellow}Python Tests${off}:"
    # ___________________________________________________________________________________________________________________________________________________________________
    #_____ | Muted Test Run: Reason:--> Pipeline in githiub Actions returned [ exit code 137 ] which almost always means SIGKIL by github free runners: 
    #_____ | I asusme due to an out‑of‑memory (OOM) condition. In this case the GitHub Actions free runners are on limited resources than any local machine:  ¯\_(ツ)_/¯
    #_____ | for your local setup, you can uncommen the call below and see it working as designed: 
    #_____ | Also you can use 'dev_run.sh' script wich is designed for local setup with all tests and scripts included:
    
    # echo -e "\n$JOB ${magenta} Running ${yellow}sys_test.py${off} for the fun of it: ${yellow}no real need, but usefull if on mizxed OS types:${off}"
    # pytest -v -r charts tests/py_tests/sys_test.py
    # __________________________________________________________________________________________________________________________________________________________________
    
    $decorator_init
    echo -e "\n$JOB ${magenta} Running ${yellow}test_mock_endpoints.py${off} these are mock tests ${cyan}using ${red}fake ${cyan}fastAPI ${yellow}test client ${off}with ${cyan}real app endpoints${off}:"
    pytest -v -r charts tests/py_tests/test_mock_endpoints.py
    
    $decorator_init
    echo -e "$JOB ${magenta} Test Env Prep:${yellow} Running shell script to handle authentication prerequisites${off}:"

    ./tests/curl_tests/collect_existing_tokens.sh
    ./tests/curl_tests/revoke_api_tokens.sh
    ./tests/curl_tests/get_auth_key.sh

    sleep 1
    echo -e "\n$JOB ${magenta} Running ${yellow}test_true_endpoints_sets.py${off} these are ${magenta}C.R.U.D${yellow} tests:${cyan} using ${magenta}real ${cyan}test data and ${yellow}true fastAPI client ${off}with ${cyan}actual app endpoints${off}:"
    pytest -v -r charts tests/py_tests/test_true_endpoints_sets.py
    
    $decorator_init
    echo -e "$JOB ${magenta} Test Env Prep:${yellow} Running shell script to handle authentication prerequisites${off}:"
    ./tests/curl_tests/collect_existing_tokens.sh
    ./tests/curl_tests/revoke_api_tokens.sh
    ./tests/curl_tests/get_auth_key.sh
    
    sleep 1
    echo -e "\n$JOB ${magenta} Running ${yellow}test_crud_cycle_true_endpoints.py${off} these are ${magenta}sets of tests ${yellow}grouped by test data set${magenta} per endpoint: ${cyan}using ${magenta}real ${cyan}test data and ${yellow}true fastAPI client ${off}with ${cyan}actual app endpoints${off}:"
    pytest -v -r charts tests/py_tests/test_crud_cycle_true_endpoints.py
    
    $decorator_init
    echo -e "$JOB ${magenta} Cleanup${green} API keys from ${magenta}Mongo DB${off}:"
    if ! ./tests/curl_tests/collect_existing_tokens.sh; then
    # if ! ./tests/curl_tests/collect_existing_tokens.sh &>/dev/null; then
        echo -e "$JOB\t${red}ERROR:${white} script call ${red}failed!${off}"
        $decorator_done
        exit 1
    fi
    
    sleep 1
    echo -e "$JOB ${magenta} Running ${yellow}revoke_api_tokens.sh CURL call${off}:"
    $decorator_init
    ./tests/curl_tests/revoke_api_tokens.sh
    echo -e "$JOB ${magenta} Running ${yellow}metadata_repo_cleanup.sh ${off}:"
    $decorator_init
    ./tests/dev_help_scripts/metadata_repo_cleanup.sh delete
    $decorator_done
}

pipeline_sequence_check
$decorator_init
tree .repo_archive
$decorator_done


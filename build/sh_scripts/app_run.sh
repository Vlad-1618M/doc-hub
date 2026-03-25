#!/bin/bash

set -e  # Exit script on first error

white="\033[1;37m"
red="\033[0;31m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"
grey="\033[0;37m"
off="\033[0m"

decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..63})${off}"
decorator_done="echo -e ${grey}$(printf '=%.0s' {1..63})${off}\n"
JOB="${green}JOB:${grey} --> $(printf '%.0s' {1..1})${off}"

$decorator_init
echo -e "$JOB Calling:\t${yellow}[ ${magenta}db.py ${yellow}\t\t]${off}"
python3 db/db.py || { echo -e "${red}ERROR:${off} db.py failed!"; exit 1; }

echo -e "$JOB Calling:\t${yellow}${yellow}[ ${magenta}db_init.py ${yellow}\t\t]${off}"
python3 db/db_init.py || { echo -e "${red}ERROR:${off} db_init.py failed!"; exit 1; }

echo -e "$JOB Starting FastAPI server...\n"
UVICORN_LOG_LEVEL="${UVICORN_LOG_LEVEL:-info}"
exec uvicorn server:app --host 0.0.0.0 --port 8000 --log-level "$UVICORN_LOG_LEVEL"
$decorator_done

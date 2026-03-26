#!/bin/bash

# ===============================================================================
# dev_run.sh — Doc Hub dev environment (Doc Portal UI + API + MongoDB)
# ===============================================================================
# For new team members: This script builds and runs the full dev stack in Docker.
# Run from project root: ./build/sh_scripts/dev_run.sh
# ===============================================================================

set -e
cd "$(dirname "$0")/../.."

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"
bold="\033[1m"

decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..93})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"
DUMMY_USER="dev@dev.com"
DUMMY_PASS="dev123"  
COMPOSE_ARGS="--env-file cfgs/.env -f build/docker-compose.yml -p build"

# -------------------------------------------------------------------------------
#                   Prompts
# -------------------------------------------------------------------------------
# Read one line from the real terminal when stdin is not a TTY (e.g. piped input,
# or subprocesses that would otherwise steal/consume stdin). Avoids "y" being
# eaten by a child script and prevents hangs on empty stdin.
read_user_input() {
    local __into="${1:?}"
    local __line
    if [[ -t 0 ]]; then
        IFS= read -r __line || true
    elif [[ -r /dev/tty ]]; then
        IFS= read -r __line < /dev/tty || true
    else
        IFS= read -r __line || true
    fi
    printf -v "$__into" '%s' "$__line"
}

prompt_yn() {
    local prompt="$1"
    local default="${2:-n}"
    local resp
    echo -ne "${yellow}${prompt} [y/N]: ${off}"
    read_user_input resp
    resp="${resp:-$default}"
    resp=$(printf '%s' "$resp" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ "$resp" == "y" || "$resp" == "yes" ]]
}

# -------------------------------------------------------------------------------
#                   Intro & Info (shown before any action)
# -------------------------------------------------------------------------------
show_intro() {
    echo -e "\n${bold}${cyan}═══════════════════════════════════════════════════════════════════════════════════════${off}"
    echo -e "${bold}${yellow}                *** ${cyan}Doc Hub — Dev Environment Builder ${yellow}***${off}"
    echo -e "${bold}${cyan}═══════════════════════════════════════════════════════════════════════════════════════${off}\n"
    echo -e "${white}What this script does:${off}"
    echo -e "  • Stops existing project containers (${magenta}docker compose down${off})"
    echo -e "  • Builds and starts ${magenta}6 Docker containers${off} in dependency order"
    echo -e "  • Runs MongoDB init, FastAPI startup, and optional tests\n"
    echo -e "${white}Containers (6):${off}"
    echo -e "  ${green}1.\t${yellow}doc-hub-mongo${off}   \t— MongoDB 6.0 (DB for users, resumes, API keys)     ~300–500 MB"
    echo -e "  ${green}2.\t${yellow}doc-hub-api${off}     \t- FastAPI + Uvicorn (REST API)                      ~250–400 MB"
    echo -e "  ${green}3.\t${yellow}doc-hub-ui${off}      \t— React SPA + nginx (Doc Portal at :3000)           ~50–80 MB"
    echo -e "  ${green}4.\t${yellow}mongo-express-ui${off}\t— Mongo Express (DB admin UI at :8081)              ~100–150 MB"
    echo -e "  ${green}5.\t${yellow}tests-ci${off}        \t— Runs CI pipeline (pytest + curl) then exits       ~400 MB"
    echo -e "  ${green}6.\t${yellow}tests-manual${off}    \t— Stays running for interactive pytest/curl tests   ~400 MB\n"
    echo -e "${white}Total rough usage:${off} ~1.5–2 GB RAM, ~2 GB disk (images + volumes)\n" 
    echo -e "${white}Container flow:${off}"
    echo -e "  ${gray}mongo${off}  \t--> ${gray}fastapi${off}       | ${yellow}waits for mongo healthy${off}:"
    echo -e "  ${gray}mongo${off}  \t--> ${gray}mongo-express${off} |"
    echo -e "  ${gray}fastapi${off}\t--> ${gray}doc-hub-ui${off}    | ${yellow}nginx proxies /auth, /resume to fastapi${off}:"
    echo -e "  ${gray}fastapi${off}\t--> ${gray}tests-ci${off}      | ${yellow}runs cicd_run.sh${off}:"
    echo -e "  ${gray}fastapi${off}\t--> ${gray}tests-manual${off}  | ${yellow}waits, then tail -f /dev/null${off}:\n"
    echo -e "${white}Test suites:${off}"
    echo -e "  • ${gray}Mock${off}:         mongomock, in-process:      --> test_mock_endpoints.py (resume + ubuntu + python + roman)"
    echo -e "  • ${gray}Real${off}:         live API + MongoDB:         --> test_crud_cycle_true_endpoints.py, test_true_endpoints_sets.py"
    echo -e "  • ${gray}Records${off}:      ubuntu/python/roman:        --> test_crud_cycle_records_true_endpoints.py"
    echo -e "  • ${gray}User create${off}:  100 users+keys:             --> test_user_create_suite.py"
    echo -e "  • ${magenta}Curl${off}: tests/curl_tests/run_curl_tests.sh  --> resume + ubuntu + python + roman\n"
    echo -e "${white}Access URLs (after start):${off}"
    echo -e "  • Doc Portal:    ${cyan}http://localhost:3000${off}"
    echo -e "  • FastAPI:       ${cyan}http://localhost:8000${off}"
    echo -e "  • Swagger:       ${cyan}http://localhost:8000/docs${off}"
    echo -e "  • Mongo Express: ${cyan}http://localhost:8081${off}  (user: noadmin / pass: noadmin)\n"
    echo -e "${white}Flow:${off}\n\t• Run tests first (mock=in-memory, real=live MongoDB), then\n\t• Inject data for app demo."
    echo -e "\t• Dev user after injection: ${magenta}$DUMMY_USER${off} / ${magenta}$DUMMY_PASS${off}\n"
    $decorator_done
}

# -------------------------------------------------------------------------------
# Docker: cleanup, build, run
# -------------------------------------------------------------------------------
docker_cleanup() {
    echo -e "\n$JOB ${magenta}docker compose down${off} ${gray}(this project only)${off}"
    # python3 src/helpers/timer.py 1
    docker compose $COMPOSE_ARGS down 2>/dev/null || true
}

docker_compose_run() {
    echo -e "\n$JOB ${magenta}docker compose up --build -d${off}"
    docker compose $COMPOSE_ARGS up --build -d
}

# -------------------------------------------------------------------------------
# Status / logs
# -------------------------------------------------------------------------------
mongodb_server_logs() {
    local head_lines=5
    local tail_lines=1
    echo -e "\n$JOB ${magenta}doc-hub-mongo${off} logs"
    $decorator_init
    { docker logs doc-hub-mongo 2>/dev/null | head -n "$head_lines"; echo -e "${yellow}$(printf ' %.0s' {1..100})${off}"; docker logs doc-hub-mongo 2>/dev/null | tail -n "$tail_lines"; }
}

fastapi_server_logs() {
    echo -e "\n$JOB ${magenta}doc-hub-api${off} logs"
    { docker logs doc-hub-api 2>/dev/null | head -n 50; echo -e "${gray}$(printf ' %.0s' {1..71})${off}"; }
}

resume_ui_server_logs() {
    if docker ps --format '{{.Names}}' | grep -q '^doc-hub-ui$'; then
        echo -e "\n$JOB ${magenta}doc-hub-ui${off} logs"
        { docker logs doc-hub-ui 2>/dev/null | head -n 15; echo -e "${gray}$(printf ' %.0s' {1..71})${off}"; }
    fi
}

docker_network_check() {
    $decorator_init
    echo -e "$JOB ${magenta}docker network${off}\t--> build_app-network\n"
    docker network inspect build_app-network 2>/dev/null | grep -E '"Name"|"Gateway"' || true
    $decorator_init
}

# -------------------------------------------------------------------------------
# Mongo Express notice + UI open
# -------------------------------------------------------------------------------
java_script_security_notice() {
    $decorator_init
    echo -e "\n${white}Mongo-Express${red} security${white} notice:${off}"
    echo -e "  JSON documents are parsed through a JavaScript VM. Use ${green}only for private dev${off}."
    echo -e "  Credentials (cfgs/.env): ${magenta}USER${off}=noadmin ${magenta}PASS${off}=noadmin\n"
}

open_ui_apps() {
    doc_portal_url="http://localhost:3000"
    fastapi_swagger="http://127.0.0.1:8000/docs"
    fastapi_ReDoc="http://127.0.0.1:8000/redoc"
    mongo_express="http://localhost:8081"
    java_script_security_notice
    echo -e "$JOB ${white}Opening browsers${off}: Doc Portal, Swagger, ReDoc, Mongo Express"
    open "$doc_portal_url" 2>/dev/null || true
    open "$fastapi_swagger" 2>/dev/null || true
    open "$fastapi_ReDoc" 2>/dev/null || true
    open "$mongo_express" 2>/dev/null || true
}

# -------------------------------------------------------------------------------
# MongoDB CLI help + shell session
# -------------------------------------------------------------------------------
mongodb_server_cli_help() {
    $decorator_init
    echo -e "$JOB ${gray}mongosh${off} help: show dbs | use admin | show users | use resume_db | show collections"
    $decorator_init
}

mongodb_server_access() {
    set -a
    source cfgs/.env 2>/dev/null || true
    set +a
    local user="${MONGO_ADMIN_USER:-admin}"
    local pass="${MONGO_ADMIN_PASS:-admin}"
    mongodb_server_cli_help
    echo -e "$JOB ${red}NOTE:${off} Credentials from ${magenta}cfgs/.env${off}. Press ${magenta}Ctrl+C${off} to exit."
    echo -e "$JOB Starting MongoDB shell (${user})..."
    # python3 src/helpers/timer.py 2
    eval ./build/sh_scripts/terminal_sessions.sh docker exec -it doc-hub-mongo mongosh -u "${user}" -p "${pass}" --authenticationDatabase admin
}

# -------------------------------------------------------------------------------
# Tests
# -------------------------------------------------------------------------------
docker_run_curl_tests() {
    $decorator_init
    echo -e "$JOB ${magenta}Curl tests${off}: tests-manual → run_curl_tests.sh"
    docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh
}

docker_run_pytests() {
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: sys_test.py"
    # python3 src/helpers/timer.py 2
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/sys_test.py
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: test_mock_endpoints.py"
    # python3 src/helpers/timer.py 2
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_mock_endpoints.py
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: test_crud_cycle_true_endpoints.py (fetches API key first)"
    # python3 src/helpers/timer.py 2
    docker exec -it tests-manual ./tests/curl_tests/get_auth_key.sh
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_true_endpoints.py
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: test_true_endpoints_sets.py (token setup)"
    # python3 src/helpers/timer.py 2
    docker exec -it tests-manual ./tests/curl_tests/collect_existing_tokens.sh
    docker exec -it tests-manual ./tests/curl_tests/revoke_api_tokens.sh
    docker exec -it tests-manual ./tests/curl_tests/get_auth_key.sh
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_true_endpoints_sets.py
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: test_crud_cycle_records_true_endpoints.py (ubuntu, python, roman)"
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_records_true_endpoints.py
    $decorator_init
    echo -e "$JOB ${magenta}Pytest${off}: test_user_create_suite.py (user+key validation)"
    docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_user_create_suite.py
}

# -------------------------------------------------------------------------------
# Terminal sessions for logs
# -------------------------------------------------------------------------------
docker_container_logs_tail() {
    $decorator_init
    echo -e "$JOB Opening terminal sessions for ${magenta}docker logs -f${off} (each container)"
    # python3 src/helpers/timer.py 5
    ./build/sh_scripts/container_logs_terminal_sessions.sh
}

docker_dev_container_session() {
    $decorator_init
    proj_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    echo -e "$JOB Opening ${magenta}tests-manual${off} interactive bash (for manual pytest/curl)"
    # python3 src/helpers/timer.py 3
    ./build/sh_scripts/terminal_sessions.sh "cd \"$proj_dir\" && docker compose $COMPOSE_ARGS run --rm --entrypoint bash tests-manual"
}

# -------------------------------------------------------------------------------
# Main (interactive flow)
# -------------------------------------------------------------------------------
main() {
    show_intro

    if ! prompt_yn "Continue and start dev environment?" "n"; then
        echo -e "\n$JOB ${gray}Cancelled.${off}\n"
        exit 0
    fi

    docker_cleanup
    echo -e "\n$JOB Starting ${yellow}Dev Environment${off}"
    # python3 src/helpers/timer.py 3
    docker_compose_run

    mongodb_server_logs
    fastapi_server_logs
    resume_ui_server_logs
    docker_network_check

    if prompt_yn "Configure dev logging (API / PyMongo / MongoDB)? Uses preset INFO + all targets (non-interactive). For menus, run ./build/sh_scripts/configure_dev_logs.sh later."; then
        echo -e "$JOB ${gray}configure_dev_logs.sh --level 2 --targets all${off}"
        bash ./build/sh_scripts/configure_dev_logs.sh --level 2 --targets all || true
    fi

    if prompt_yn "Run tests? (pytest + curl) — run first; mock tests use mongomock, real tests hit live MongoDB"; then
        echo -e "\n$JOB Which tests? ${gray}(1=all, 2=curl only, 3=pytest only, 4=skip)${off}"
        echo -ne "\tChoice [1-4, default 1]: "
        read_user_input choice
        choice="${choice:-1}"
        case "$choice" in
            1) docker_run_curl_tests; docker_run_pytests ;;
            2) docker_run_curl_tests ;;
            3) docker_run_pytests ;;
            *) echo -e "$JOB ${gray}Skipping tests.${off}" ;;
        esac
    fi

    if prompt_yn "Inject sample data? (resumes + dev user: $DUMMY_USER / $DUMMY_PASS) — do this after tests so app has data"; then
        echo -e "\n$JOB ${magenta}Injecting sample data${off}"
        # python3 src/helpers/timer.py 3
        docker exec tests-manual ./build/sh_scripts/inject_dev_data.sh
        $decorator_done
    fi

    if prompt_yn "Create test users? (runs user create suite — users persist, no cleanup)"; then
        echo -ne "$JOB ${gray}How many users? [default 100]: ${off}"
        read_user_input user_count
        user_count="${user_count:-100}"
        if [[ "$user_count" =~ ^[0-9]+$ ]] && [[ "$user_count" -gt 0 ]]; then
            echo -e "\n$JOB ${magenta}Creating $user_count users${off} (--no-cleanup, users persist)"
            docker exec tests-manual python3 -m tests.user_create_suite.run_user_create_suite \
                --count "$user_count" \
                --no-cleanup \
                --base-url "http://doc-hub-api:8000"
            echo -e "\n$JOB ${yellow}To cleanup test users later:${off}"
            echo -e "  ${gray}Use Mongo Express (http://localhost:8081) or delete via API.${off}"
            $decorator_done
        else
            echo -e "$JOB ${gray}Invalid count, skipping.${off}"
        fi
    fi

    if prompt_yn "Open terminal sessions for container logs (docker logs -f)?"; then
        docker_container_logs_tail
    fi

    if prompt_yn "Open UI apps in browser? (Doc Portal, Swagger, ReDoc, Mongo Express)"; then
        open_ui_apps
    fi

    if prompt_yn "Open MongoDB shell (mongosh) in new terminal?"; then
        mongodb_server_access
    fi

    if prompt_yn "Open dev container session (tests-manual bash) for manual testing?"; then
        docker_dev_container_session
    fi

    echo -e "\n$JOB ${green}Dev run complete.${off}"
    echo -e "  Doc Portal UI: ${cyan}http://localhost:3000${off}"
    echo -e "  FastAPI API:   ${cyan}http://localhost:8000${off}"  
    echo -e "  Swagger UI:    ${cyan}http://localhost:8000/docs${off}"
    echo -e "  ReDoc UI:      ${cyan}http://localhost:8000/redoc${off}"
    echo -e "  Mongo Express: ${cyan}http://localhost:8081${off}"
    echo -e "  ${gray}Logging tuner:${off}   ${cyan}./build/sh_scripts/configure_dev_logs.sh${off} ${gray}|${off} ${cyan}--reset${off}\n"
}

main

#!/bin/bash

# ===============================================================================
# Script Name: container_logs_terminal_sessions.sh
# Description: Opens a new terminal session for each running container and tails logs.
#              Works on macOS (osascript/open) and Linux (gnome-terminal/konsole).
#
# Usage Example:
#   ./container_logs_terminal_sessions.sh
#
# Compatibility: macOS, Linux (GNOME, KDE)
# ===============================================================================

off="\033[0m"
red="\033[0;31m"
yellow="\033[0;33m"
cyan="\033[1;36m"
green="\033[0;32m"
gray="\033[0;37m"
decorator="echo -e ${yellow}$(seq -s '.' 63 | tr -d '[:digit:]')${off}"

containers=$(docker ps --format "{{.ID}} {{.Names}}")               # <-- get list of all local running containers:

if [[ -z "$containers" ]]; then
    echo -e "\n${red}Error:${off} No running containers found!"
    exit 1
fi

# ... helps to position each +1 terminal window side by side with least horizontal gap as possible in between: 
# ... determine base math settings for each window's width: 
# ... new left should start at the old right, the new right should be old right + width:

# ... base position offsets: -> [ first terminal window ]
left=0          # <-- start position [ left ]:                              
top=30          # <-- vertical position fixed per row:                      
right=550       # <-- boundary init [ right ]:                              
bottom=1800     # <-- vertical boundary [ bottom ] position fixed per row:  

# ... get window width math:
window_width=$((right - left))  # <-- cheks if windows align side by side:

# ... get logs in a new terminal session:
start_terminal() {
    local container_id="$1"
    local container_name="$2"

    $decorator
    echo -e "${green}Opening logs for container:${off} ${cyan}$container_name (${container_id})${off}"
    $decorator

    local log_command="docker logs -f $container_id"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # ... macOS ONLY | MacBookPro customized Terminal dynamic position and size:
        osascript -e "tell application \"Terminal\"
            do script \"$log_command\"
            activate
            set bounds of front window to {$left, $top, $right, $bottom}
        end tell"

    elif command -v gnome-terminal &>/dev/null; then
        # .. Linux GNOME Terminal:
        gnome-terminal --geometry=120x40+$left+$top -- bash -c "$log_command; exec bash"

    elif command -v konsole &>/dev/null; then
        # ... Linux KDE Konsole:
        konsole --geometry 120x40+$left+$top -e bash -c "$log_command; exec bash" &

    else
        echo -e "\n${red}Error:${off} No supported terminal emulator found!"
        exit 1
    fi

    # ... adjust window positions | side by side [ no horizontal gaps ]
    left=$right
    right=$((right + window_width))
}

# # ... running container loop | open log session for each:
# while IFS= read -r container; do
#     container_id=$(echo "$container" | awk '{print $1}')
#     container_name=$(echo "$container" | awk '{print $2}')
#     start_terminal "$container_id" "$container_name"
# done <<< "$containers"

optional_skip=("tests-manual" "mongo-express-ui" "tests-ci")
# doc-hub-ui logs included (nginx access/error) — add "doc-hub-ui" to optional_skip to exclude
# optional_skip=("")

while IFS= read -r container; do
    container_id=$(awk '{print $1}' <<< "$container")
    container_name=$(echo "$container" | awk '{print $2}')
    
    # ... skip container names:
    if [[ " ${optional_skip[@]} " =~ " ${container_name} " ]]; then
        echo -e "\t${red}Skipping ${off}Container:${gray} --> ${cyan}$container_name${off}:"
        continue
    fi
    # echo -e "$container_id" "$container_name"
    start_terminal "$container_id" "$container_name"
done <<< "$containers"

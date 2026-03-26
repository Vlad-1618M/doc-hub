#!/bin/bash

# ===============================================================================
# Script Name: terminal_sessions.sh
# Description: Opens a new terminal session and runs a given service call.
#              Works on macOS (osascript/open) and Linux (gnome-terminal/konsole).
#
# Example Call:
#   ./terminal_sessions.sh docker ps -a
#
# Compatibility: macOS, Linux (GNOME, KDE)
# ===============================================================================

off="\033[0m"
red="\033[0;31m"
yellow="\033[0;33m"
gray="\033[0;37m"
decorator="echo -e ${yellow}$(seq -s '.' 63 | tr -d '[:digit:]')${off}"

start_terminal() {          # ... open new terminal session | execute provided cli:
    if [[ $# -eq 0 ]]; then
        echo -e "\n${red}Error:${off} No command provided!"
        exit 1
    fi
    
    local command="$*"      # ... convert cli args into a full command string:
    local left="1000"       # <-- macOS | MacBookPro customized Terminal Window Position: -> "left shift"   Size intr vars
    local top="30"          # <-- macOS | MacBookPro customized Terminal Window Position: -> "top shift"    Size intr vars
    local right="2055"      # <-- macOS | MacBookPro customized Terminal Window Position: -> "right shift"  Size intr vars
    local bottom="1800"     # <-- macOS | MacBookPro customized Terminal Window Position: -> "bottom shift" Size intr vars

    $decorator
    echo -e "Starting new terminal session::\t${gray}--> ${yellow}$command${off}"
    $decorator
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Escape double quotes and backslashes for AppleScript string
        local cmd_escaped
        cmd_escaped="${command//\\/\\\\}"
        cmd_escaped="${cmd_escaped//\"/\\\"}"
        osascript -e "tell application \"Terminal\"
        do script \"$cmd_escaped\"
            activate
            set bounds of front window to {$left, $top, $right, $bottom} -- (left, top, right, bottom)
        end tell"
    
    elif command -v gnome-terminal &>/dev/null; then
        gnome-terminal -- bash -c "$command; exec bash"                         # ... Linux GNOME Terminal
    elif command -v konsole &>/dev/null; then                                   # ... Linux KDE Konsole
        konsole -e bash -c "$command; exec bash" &
    else
        echo -e "\n${red}Error:${off} No supported terminal emulator found!"
        exit 1
    fi
}

# ... execute script + provided cli command:
start_terminal "$@"


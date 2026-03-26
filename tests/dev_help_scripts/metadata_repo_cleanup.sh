#!/bin/bash

# ... colors ascii codes:
off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

# ... for colored output:
echo_blue() { echo -e "${cyan}$1${off}"; }
echo_green() { echo -e "${green}$1${off}"; }
echo_red() { echo -e "${red}$1${off}"; }
echo_yellow() { echo -e "${yellow}$1${off}"; }

JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"                     # ... JOB call | for visual appeal:
repo_dir="/dbapp"                                                               # ... configuration & directories:
dir_list=("__pycache__" ".logs" ".benchmarks" ".coverage" ".pytest_cache")      # ... array of metadata directory names to archive | these can be either directories or files:
dest_dir_base="${repo_dir}/.repo_archive"                                       # ... destination archive location | all tar files should be here: 
current_date=$(date +"%Y-%m-%d_%H-%M-%S")
dest_dir="${dest_dir_base}/archive_${current_date}"
log_file="${dest_dir}/archive_${current_date}.log"                              # ... Log file | records details per each archive call:
METADATA_ITEMS=()                                                               # ... global array | holds found metadata items: [ directories or files ]:

# __________________________________________________________________
create_archive_dir() {                                                          # ... create archive destination dir:
    echo_blue "${JOB}: Creating archive directory: ${dest_dir} ..."
    mkdir -p "${dest_dir}"
    if [[ $? -eq 0 ]]; then
        echo_green "${JOB}: Archive directory created successfully: ${dest_dir}"
    else
        echo_red "\n${JOB}: Failed to create archive directory: ${dest_dir}"
        exit 1
    fi
}

# __________________________________________________________________:           # ... archive metadata dirs | log details:
archive_metadata() {
    echo_blue "${JOB}: Locating metadata items in ${repo_dir} ..."
    METADATA_ITEMS=()                                                           # ... reset global array:
    for pattern in "${dir_list[@]}"; do
        if [[ -z "$pattern" ]]; then                                            # ... skip if empty patterns:
            continue
        fi
        while IFS= read -r item; do
            METADATA_ITEMS+=("$item")
        done < <(find "${repo_dir}" \( -type d -o -type f \) -name "$pattern")
    done

    if [[ ${#METADATA_ITEMS[@]} -eq 0 ]]; then
         echo_yellow "\n${red}No${off} metadata items ${red}found${off} in ${repo_dir}."
         return 1
    fi

    counter=0
    for item in "${METADATA_ITEMS[@]}"; do
         [[ -z "$item" ]] && continue                                                       # ... skip empty entries: | just in case:
         ((counter++))
         base_name=$(basename "$item")
         archive_name="${base_name}_${current_date}_${counter}.tar"                         # ... create unique tar archive name: | e.g. __pycache___2023-03-15_12-30-00_1.tar:
         archive_path="${dest_dir}/${archive_name}"
         parent_dir=$(dirname "$item")
         echo_blue "${JOB}: Archiving ${item} to ${archive_path} ..."
         tar -cvf "${archive_path}" -C "${parent_dir}" "$(basename "$item")" > /dev/null    # ... archive item: | file or directory | change to parent to allow archived folder structure to be preserved:
         if [[ $? -eq 0 ]]; then
             echo_green "${JOB}: Successfully archived: ${item}"
             file_count=$(tar -tf "${archive_path}" | wc -l)                                # ... math for | file count + size of the archive:
             tar_size=$(du -h "${archive_path}" | cut -f1)
             echo "Archive: ${archive_name} | Files: ${file_count} | Size: ${tar_size}" >> "${log_file}"    # ... append to log file:
         else
             echo_red "\n${JOB}: Failed to archive: ${item}"
         fi
    done

    echo_blue "${JOB}: Processed ${counter} metadata items."
}

# _____cleanup  _____________________________________________________________: If deletion was requested |remove all found metadata items:
cleanup_metadata() {
    echo_blue "${JOB}: Cleaning up metadata items post archive ..."
    for item in "${METADATA_ITEMS[@]}"; do
        if [[ -d "$item" ]]; then
            echo_blue "${JOB}:\tAttempting to delete directory:${gray} $item:${off}"
            rm -rf "$item"
            if [[ $? -eq 0 ]]; then
                echo_green "${JOB}:\t${yellow}Deleted directory:${cyan} $item:${off}"
            else
                echo_red "${JOB}:\t${red}Failed to delete ${yellow}directory: ${cyan}$item${off}"
            fi
        elif [[ -f "$item" ]]; then
            echo_blue "${JOB}:\tAttempting to delete file:${gray} $item:${off}"
            rm -f "$item"
            if [[ $? -eq 0 ]]; then
                echo_green "${JOB}:\t${yellow}Deleted file:${gray} $item:${off}"
            else
                echo_red "${JOB}:\t${red}Failed to delete ${yellow}file: ${cyan}$item:${off}"
            fi
        else
            echo_yellow "${JOB}: Item not found (or already deleted): $item:"
        fi
    done
}

# _____Main_________________________________________________________: Create archive, archive metadata, and optionally clean up:
main() {
    create_archive_dir
    archive_metadata
    if [[ "$1" == "delete" ]]; then                                 # If "delete" arg was in script call | remove the metadata items:
         echo_blue "\n${JOB}: ${cyan}User requested ${red}deletion${off} of metadata items after archiving:\n"
         cleanup_metadata
    else
         echo_blue "\n${JOB}: ${red}No deletion ${yellow}requested: ${magenta}Metadata items remain intact${off}:"
    fi
    echo_green "\n${JOB}: Archiving complete:\n\t   ${magenta}Details${off} logged in: ${gray}$(dirname ${log_file})${off}/${cyan}$(basename ${log_file})${off}"
}

main "$@"
exit 0

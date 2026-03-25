#!/bin/bash

# ... colors:
off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

# ... decorators | used in output formatting:
decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..43})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..43})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

USER="admin"
PASS="admin"
CONTAINER="doc-hub-mongo"
DATABASE="resume_db" 
COLLECTION="resume"

run_mongo_script() {
  local script_content="$1"
  local script_name="temp_mongo_script.js"
  
  $decorator_init
  echo -e "$script_content" > "$script_name"
  docker cp "$script_name" "$CONTAINER:/tmp/$script_name"
  docker exec -i "$CONTAINER" mongosh -u "$USER" -p "$PASS" --authenticationDatabase admin --quiet --eval "
    db = db.getSiblingDB('$DATABASE');
    load('/tmp/$script_name');
  "

  docker exec -i "$CONTAINER" rm -f "/tmp/$script_name"
  rm -f "$script_name"
  $decorator_done
}

list_ids() {
  run_mongo_script "
    db.getCollection('$COLLECTION').find({}, { _id: 1 }).forEach(doc => print(doc._id));
  "
}

list_names() {
  run_mongo_script "
    db.getCollection('$COLLECTION').aggregate([
      { \$project: { full_name: { \$concat: [\"\$resume.name.first_name\", \" \", \"\$resume.name.last_name\"] } } },
      { \$group: { _id: \"\$full_name\" } }
    ]).forEach(doc => print(doc._id));
  "
}

count_documents() {
  run_mongo_script "
    print(db.getCollection('$COLLECTION').countDocuments({}));
  "
}

list_dates() {
  run_mongo_script "
    db.getCollection('$COLLECTION').aggregate([
      { \$project: { created_at: \"\$created_at.t.\$date\" } }
    ]).forEach(doc => print(doc.created_at));
  "
  }

usage() {
    $decorator_init
    echo -e "${JOB} ${white}script ${gray}args ${off}| ${green}$(basename $0) ${magenta}ids${off}|${yellow}names${off}|${cyan}count${off}|${gray}datetime ${off}"
    $decorator_init
    exit 1
    }

if [ $# -ne 1 ]; then
  usage
fi

case $1 in
  ids)
    list_ids
    ;;
  names)
    list_names
    ;;
  count)
    count_documents
    ;;
  datetime)
    list_dates
    ;;
  *)
    usage
    ;;
esac


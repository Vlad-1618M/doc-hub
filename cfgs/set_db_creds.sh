#!/bin/bash

# Colors
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

ENV_FILE=${1:-"/dbapp/cfgs/.env"}   # <-- .env check:
[ -f "$ENV_FILE" ] || ENV_FILE="$PWD/.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "$JOB${yellow}Loading Environment Variables from:${off} ${magenta}$ENV_FILE${off}"
    set -a                          # <-- export variables:
    . "$ENV_FILE"
    set +a
else
    echo -e "${red}ERROR: Environment file not found!${off}"
    exit 1
fi

# ... debugging output:
function debug_output(){
    echo -e "$JOB${magenta}MongoDB Credentials Loaded:${off}"
    echo -e "$JOBAdmin User: ${yellow}${MONGO_ADMIN_USER}${off}"
    echo -e "$JOBAdmin Pass: ${yellow}${MONGO_ADMIN_PASS}${off}"
    echo -e "$JOBDB Name: ${yellow}${MONGO_DB}${off}"
    echo -e "$JOBApp User: ${yellow}${MONGO_USER}${off}"
    echo -e "$JOBApp Pass: ${yellow}${MONGO_PASS}${off}"
    $decorator_done
    }

# ... auto-generate 'init-mongo.js' with variables from .env config:
cat <<EOF > /dbapp/init-mongo.js
// Connect to admin database
db = db.getSiblingDB("admin");

// ... create admin user:
db.createUser({
    user: "$MONGO_ADMIN_USER",
    pwd: "$MONGO_ADMIN_PASS",
    roles: [{ role: "root", db: "admin" }]
});

// ... authenticate as admin prior to app user create call:
db.auth("$MONGO_ADMIN_USER", "$MONGO_ADMIN_PASS");

// ... switch to app database:
db = db.getSiblingDB("$MONGO_DB");

db.createUser({
    user: "$MONGO_USER",
    pwd: "$MONGO_PASS",
    roles: [
        { role: "readWrite", db: "$MONGO_DB" },
        { role: "readWrite", db: "${MONGO_AUTH_DB:-resume_auth}" }
    ]
});

print(".env config users created:");
EOF

echo -e "$JOB${green}Generated init-mongo.js:${off}"        
cat /dbapp/init-mongo.js                                    # <-- show auto-generated 'init-mongo.js' details:
mongod --bind_ip_all --fork --logpath /var/log/mongodb.log  # <-- MongoDB start | no -authentication:
sleep 5                                                     # <-- wait for MongoDB to start:
mongosh < /dbapp/init-mongo.js                              # <-- MongoDB init script call:
mongod --shutdown                                           # <-- MongoDB Shutdown | to enable authentication:
exec mongod --auth --bind_ip_all                            # <-- MongoDB start | with authentication true:
debug_output
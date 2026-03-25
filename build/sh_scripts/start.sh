#!/bin/bash
# Minimal start — no cleanup, no logs. Just brings up the stack.
# Run from project root: ./build/sh_scripts/start.sh

set -e
cd "$(dirname "$0")/../.."

echo -e "\nStarting containers (doc-hub-mongo, doc-hub-api, doc-hub-ui, mongo-express, tests...)"
docker compose --env-file cfgs/.env -f build/docker-compose.yml -p build up --build -d
echo -e "\n"
echo -e "\tDone. Access:"
echo -e "\tDoc Portal:   \t--> http://localhost:3000"
echo -e "\tFastAPI:      \t--> http://localhost:8000"
echo -e "\tSwagger:      \t--> http://localhost:8000/docs"
echo -e "\tMongo-Express:\t--> http://localhost:8081"

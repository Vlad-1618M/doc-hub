# **DEV & Test Setup:**

## **Dev Environment Build Process Overview:**
This document provides a structured guide for setting up and running the _development_ and _testing_ environments for **Doc Hub** (internal records & document hub / **Doc Portal** UI) using automated [Shell Orchestration](/build/sh_scripts/dev_run.sh) with Docker and related services:

### **Prerequisites:**
Ensure the following dependencies are installed on your system:
- Docker:
- Docker Compose: 
- Python 3:
- Bash:
>Developed on: 
 `macOS 15.2`:
>- Docker Compose version v2.31.0-desktop.2:
>- Docker version 27.4.0, build bde2b89:
>- Python 3.13.1:
>- Bash version: GNU bash, version 3.2.57(1)-release (arm64-apple-darwin24):
>- You can run `echo` call ↓ in your _terminal_ to check existing OS stack: 
```bash
echo -e "\n\t--> $(docker compose version 2>/dev/null || docker-compose --version)\n\t--> $(docker --version)\n\t--> $(python3 --version)\n\t--> $(bash -version | grep -E bash)\n\t--> ZSH is optional != to prereqs as deps: | zsh version:${ZSH_VERSION}\n\nDocker Engine info:$(docker info | grep -E 'Server Version:|Kernel Version:')"
```
---
## **Development Environment Setup:**
The development environment is containerized with Docker and defined in [build/docker-compose.yml](/build/docker-compose.yml). Use the **Compose V2** CLI: `docker compose` (not the legacy `docker-compose` standalone, unless that is all you have installed).

---
#### **Build and Start Containers**:
- clone or download the `git@github.com:Vlad-1618M/doc-hub.git` repo:
```bash
git clone git@github.com:Vlad-1618M/doc-hub.git
```
To build and start all required containers, run [dev_run.sh](/build/sh_scripts/dev_run.sh) script from the `doc-hub` repository root:
```bash
./build/sh_scripts/dev_run.sh
```
Script runs sequenced orchestration setup:
1. _Function Call_: `docker_cleanup`: stop and clean up any existing containers: _you can disable this call in `main` block if you prefer to keep your existing containers intact_: 
2. _Function Call_: `docker_compose_run`: build, wait, check and start following services using [docker-compose.yml](/build/docker-compose.yml) via `docker compose`:
    - [doc-hub-mongo](/build/mongodb.Dockerfile)
    - [doc-hub-api](/build/fastapi.Dockerfile)
    - [doc-hub-ui](/build/ui.Dockerfile) — React **Doc Portal** (nginx + static SPA)
    - [mongo-express](https://hub.docker.com/_/mongo-express)
    - [tests-ci](/build/test.Dockerfile)
    - [tests-manual](/build/test.Dockerfile)
    - _Alternatively_ you can manually start the environment: ↓
```bash
# From project root:
docker compose --env-file cfgs/.env -f build/docker-compose.yml -p build up --build -d
```
- For a _minimal start_ (no cleanup, no logs): `./build/sh_scripts/start.sh`
---
3. _Function Call_: `mongodb_server_logs`: checks `MongoDB` server status: <br>
>Note: `MongoDB` server setup:
>- The MongoDB server setup involves configuring credentials defined in the [env](/cfgs/.env) file: 
>   - These credentials are automatically injected by [set_db_creds.sh](/cfgs/set_db_creds.sh) script, which is `executed` during _MongoDB [container's](/build/mongodb.Dockerfile)_ initialization to set up _users_ and _databases_ as well as handles _auto-generation_ of the `init-mongo.js` file: 
>   - More on Mongo Auth and Settings see → [mongodb.com/docs/](https://www.mongodb.com/docs/mongodb-shell/write-scripts/)
>   - `init-mongo.js` example: ↓
```bash
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
    roles: [{ role: "readWrite", db: "$MONGO_DB" }]
});

print(".env config users created:");
EOF
``` 
---
4. _Function Call_ `fastapi_server_logs`: checks `FastAPI` server logs: 
- Display the latest logs from the FastAPI server.
- Perform a filesystem check inside the container.
---
5. _Function Call_ `ui_client_sessions`: this is optional and _nice to have_ web-app session view for:
    - **Doc Portal** (React UI): → [http://localhost:3000](http://localhost:3000) — login, manage resumes, records, API keys
    - web-app for: → [fastapi_swagger](http://127.0.0.1:8000/docs)
    - web-app for: → [fastapi_ReDoc](http://127.0.0.1:8000/redoc)
    - web-app for: → [mongo_express](http://localhost:8081)
    - and finaly performs network validation for running services on your local OS: 
---
6. _Function Call_ `docker_network_check`: this is to output existing containers connected to the same docker network defined in [docker-compose.yml](/build/docker-compose.yml)
    - _Alternatively_ you can manually run `docker network inspect` in your terminal: ↓
```bash
docker network inspect build_app-network | grep Name 
```
---
7. _Function Call_ `docker_container_logs_tail`: launches a new terminal session for each running container and continuously tails logs:
    - This is automated by [container_logs_terminal_sessions.sh](/build/sh_scripts/container_logs_terminal_sessions.sh) script: 
    - Supported on macOS `osascript/open` and Linux `gnome-terminal/konsole` ONLY:
    - _Optional_, but `manually checking logs` for _each container_ was _tedious_, so I automated it to monitor the entire framework in real time:

---
8. _Function Call_ `docker_run_curl_tests`: To execute [cURL](/tests/curl_tests/) shell-based API tests inside the `tests-manual` container:
    - Runs [run_curl_tests.sh](/tests/curl_tests/run_curl_tests.sh) which executes resume, ubuntu, python, and roman create/list/delete flows plus API key collect/revoke:
    - _Alternatively_ you can manually run `docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh` in your terminal: ↓
```bash
docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh
```
---
9. _Function Call_ `docker_run_pytests`: To execute [pytest](/tests/py_tests) suites along with: 
    - [cURL get_auth_key.sh](/tests/curl_tests/get_auth_key.sh)
    - [cURL collect_existing_tokens.sh](/tests/curl_tests/collect_existing_tokens.sh)
    - [cURL revoke_api_tokens.sh](/tests/curl_tests/revoke_api_tokens.sh)
    - **Key Features:**:
        - **Verifies FastAPI availability** using `ping` and `curl` calls:
        - [Generates API keys](/tests/curl_tests/get_auth_key.sh) authentication token prior to test init (if `ADMIN_SECRET` is set in `cfgs/.env`, Compose passes it into `tests-manual` / `tests-ci` and the script sends `X-Admin-Secret`):
        - Executes [Pytest](/tests/py_tests/) test flow:
        - **Mock Tests [test_mock_endpoints.py](/tests/py_tests/test_mock_endpoints.py)** → runs `fastapi.testclient` with `mongomock` to enable mock testing without requiring a real application setup: <br>
        Overrides actual dependencies, allowing unit tests to run with predefined _FastAPI_ [models](/src/models/base_models.py): <br>
        Provides a quick isolated unit tests by removing external dependencies while testing API request/response flows: <br>
        Useful for testing during developmnet of an endpoint logic validation with no need on infrastructure or real database response:
        - **True API Tests [test_true_endpoints_sets.py](/tests/py_tests/test_true_endpoints_sets.py)** → Uses real test data: <br>
        Executes a full suite of API tests using real test data: <br>
        This includes _authentication_, CRUD operations for resumes: <br>
        _API_ key validation and database integrity checks: <br>
        Tests designed to check endpoints correctly handle expected and edge-case scenarios, with dependency-based execution and assertions for API responses:
        - **CRUD Cycle Tests [test_crud_cycle_true_endpoints.py](/tests/py_tests/test_crud_cycle_true_endpoints.py)** → Grouped test cases per dataset: <br>
        Executes a structured set of tests for each dataset, covering the full _lifecycle_ of a resume entry: <br>
        Tests include _health_ checks, data _creation_ and _retrieval_, _full_ and _partial_ updates as well as _deletion_ / cleaup:<br> Tests designed to validate database integrity is maintained and verifies _MongoDB_ authentication cleanup by _revoking_ API keys and _removing_ test data post-execution:
        - **Records CRUD [test_crud_cycle_records_true_endpoints.py](/tests/py_tests/test_crud_cycle_records_true_endpoints.py)** → CRUD cycle for ubuntu_releases, python_releases, roman_leaders:
        - **User Create Suite [test_user_create_suite.py](/tests/py_tests/test_user_create_suite.py)** → User registration, API keys per user, duplicate email, age tracking, delete user+keys:

> **Full test documentation:** → [docs/tests_readme.md](/docs/tests_readme.md)

- _Alternatively_ you can manually run `docker exec -it tests-manual pytest` in your terminal: ↓
```bash
docker exec -it tests-manual pytest -v -r charts tests/py_tests/sys_test.py
docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_mock_endpoints.py
docker exec -it tests-manual ./tests/curl_tests/get_auth_key.sh
docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_true_endpoints.py
docker exec -it tests-manual ./tests/curl_tests/collect_existing_tokens.sh
docker exec -it tests-manual ./tests/curl_tests/revoke_api_tokens.sh
docker exec -it tests-manual ./tests/curl_tests/get_auth_key.sh 
docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_true_endpoints_sets.py
docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_records_true_endpoints.py
docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_user_create_suite.py
```
---
10. _Function Call_ `mongodb_server_access`: to access `MongoDB` server CLI which allows to query database in real time:
    - _Alternatively_ to enter the `MongoDB` shell inside the container run in your terminal: ↓
```bash
docker exec -it doc-hub-mongo mongosh -u admin -p admin --authenticationDatabase admin
```
---
11. _Function Call_ `docker_dev_container_session` (Optional) — Launches new `tests-manual` container session autiomated by [terminal_sessions.sh](/build/sh_scripts/terminal_sessions.sh): <br>
***Notes on accessing containers with _Proper Docker Network_ settings:***
    - In order to access `tests-manual` container while ensuring it connects to correct Docker network, you'll need to restart it with settings defined in [docker-compose.yml](/build/docker-compose.yml), and you have few options:<br> 

---
- option `1`: _Basic Container Access:_ ↓
```bash
docker run -it --network build_app-network build-tests-manual bash
```
- - Runs `build-tests-manual` container interactively with the shared `build_app-network` Docker network:
- - Pros: _Allows interaction with other containers in the network (e.g., FastAPI and MongoDB)_:
- - Cons: _Changes made inside the container `won’t persist` after exiting unless committed to an image_:
---
- option `2`: Access with Local Directory Mounting: ↓
```bash
docker run -it --network build_app-network -v $(pwd):/dbapp build-tests-manual bash
```
- -  Runs `build-tests-manual` container with a direct mount to your local repo or path directory (pwd): _syncing files between your local machine and the container_:
- - Pros: _Enables real-time development—any code changes in your local repo reflect inside the container_
- - Cons: _Requires `careful handling` of file permissions and syncing, especially if using different operating systems_
---
When to Use Which?
- - `option 1`:  →  _if you just need to test the existing container environment:_
- - `option 2`:  →  _if you are actively developing, modifying, or debugging code inside the container:_
___
### For some fun or if needed _you can use_ `terminal_sessions.sh` shell script to call or run any process in new terminal session: ↓
```bash
./build/sh_scripts/terminal_sessions.sh docker run -it --network build_app-network build-tests-manual bash
```
```bash
./build/sh_scripts/terminal_sessions.sh docker run -it --network build_app-network -v $(pwd):/dbapp build-tests-manual bash
```
```bash
./build/sh_scripts/terminal_sessions.sh cal 
./build/sh_scripts/terminal_sessions.sh uptime
./build/sh_scripts/terminal_sessions.sh networksetup -listallhardwareports
```
---

## **Additional Notes:**
- **Doc Portal (React UI):** → [http://localhost:3000](http://localhost:3000) — create account, sign in, manage resumes and records
- OpenAPI JSON: → [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json) (schema for tooling; also via Doc Portal / Vite proxy)
- FastAPI Swagger: → [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- FastAPI ReDoc: → [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Fastapi ReDoc Resume Tag: → [http://127.0.0.1:8000/redoc#tag/resume](http://127.0.0.1:8000/redoc#tag/resume)
- Fastapi Tutorial Docs: → [https://fastapi.tiangolo.com/tutorial/path-params/#data-validation](https://fastapi.tiangolo.com/tutorial/path-params/#data-validation)

- Mongo-Express: → [http://localhost:8081](http://localhost:8081)
- Mongo-Express resume_db → [http://localhost:8081/db/resume_db/](http://localhost:8081/db/resume_db/)
- Mongo-Express existing resumes → [http://localhost:8081/db/resume_db/resume](http://localhost:8081/db/resume_db/resume)
- Mongo-Express api_keys → [http://localhost:8081/db/resume_db/api_keys](http://localhost:8081/db/resume_db/api_keys)
- Mongo-Express Docker Hub: → [https://hub.docker.com/_/mongo-express](https://hub.docker.com/_/mongo-express)
- MongoDB Compatibility Docs: → [https://www.mongodb.com/resources/products/compatibilities/docker](https://www.mongodb.com/resources/products/compatibilities/docker)

- MongoDB authentication credentials are stored in: → [cfgs/.env](/cfgs/.env)
- Collection Schema: → [db_collection_schema.yml](/cfgs/db_collection_schema.yml)
- Fastapi Models: → [base_models.py](/src/models/base_models.py)
- Fastapi key authentication: → [auth_endpoints.py](/src/auth/auth_endpoints.py) 
- FastAPI routes: → [crud_endpoints.py](/src/routes/crud_endpoints.py) (resumes), [records_endpoints.py](/src/routes/records_endpoints.py) (ubuntu / python / roman), [dashboard_endpoints.py](/src/routes/dashboard_endpoints.py)

__Ensure all services are up and running before executing tests:__
#### This setup is designed to help with seamless development and testing workflow by automating: 
- container builds: 
- log inspections: 
- test execution:
- environment cleanup:
___

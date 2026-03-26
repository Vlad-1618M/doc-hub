# **Test Documentation**

This document describes all test suites in the project: **Pytest** (mock and true-endpoint), **cURL-based** API tests, and the **User Create Suite**.

**Detailed readmes:**
- [PyTests](../tests/py_tests/py_test_readme.md) — Pytest suites, fixtures, run commands
- [cURL Tests](../tests/curl_tests/curl_test_readme.md) — Shell scripts, prerequisites, quick start

---

## **Test Structure Overview**

```
tests/
├── py_tests/                        # Pytest suites
│   ├── py_test_readme.md
│   ├── conftest.py                  # Fixtures, mongomock overrides
│   ├── test_mock_endpoints.py       # Mock tests (resume + ubuntu + python + roman)
│   ├── test_true_endpoints_sets.py
│   ├── test_crud_cycle_true_endpoints.py
│   ├── test_crud_cycle_records_true_endpoints.py
│   └── test_user_create_suite.py
├── curl_tests/                      # Shell-based API tests
│   ├── curl_test_readme.md
│   ├── run_curl_tests.sh            # Main orchestrator
│   ├── get_auth_key.sh
│   ├── post_create_*.sh, get_existing_*.sh, delete_all_*.sh
│   └── ...
├── user_create_suite/               # User creation and validation
│   ├── run_user_create_suite.py
│   ├── run_user_create_suite.sh
│   └── README.md
└── data_sets/                       # JSON fixtures
    ├── resumes/
    ├── ubuntu_releases/
    ├── python_releases/
    └── roman_leaders/
```

---

## **1. Pytest Suites** (`tests/py_tests/`)

### **1.1 Mock Tests** — `test_mock_endpoints.py`

- **Dependencies:** `mongomock`, `fastapi.testclient` — **no live server or MongoDB**
- **Fixtures:** `conftest.py` overrides all DB collections (resume, api_keys, ubuntu_releases, python_releases, roman_leaders) with mongomock

| Scope | Endpoints | Tests |
|-------|-----------|-------|
| **Resume** | `/resume/*` | Health, create, get, list, PUT/PATCH (incl. bulk, deprecated), delete |
| **WebSocket** | `/ws/dashboard` | Connect for real-time dashboard refresh |
| **Ubuntu** | `/ubuntu-releases/*` | List, create, get, update, delete, invalid ID (400) |
| **Python** | `/python-releases/*` | List, create, get, update, delete, invalid ID (400) |
| **Roman** | `/roman-leaders/*` | List, create, get, update, delete, invalid ID (400) |

**Run:**
```bash
pytest tests/py_tests/test_mock_endpoints.py -v
```

---

### **1.2 True Endpoint Tests** — `test_true_endpoints_sets.py`

- **Requires:** Running FastAPI server, MongoDB, API key in `/tmp/api_key.txt`
- **Data:** `tests/data_sets/resumes/*.json`
- **Flow:** Create → validate in DB → PATCH → PUT → verify → DELETE

**Run:**
```bash
./tests/curl_tests/get_auth_key.sh   # Generate key to /tmp/api_key.txt
pytest tests/py_tests/test_true_endpoints_sets.py -v
```

---

### **1.3 CRUD Cycle (Resume)** — `test_crud_cycle_true_endpoints.py`

- **Requires:** Live API + MongoDB
- **Flow per resume:** Health → POST → GET → PUT → PATCH → DELETE → GET 404
- **Data:** Parametrized over `tests/data_sets/resumes/*.json`

**Run:**
```bash
pytest tests/py_tests/test_crud_cycle_true_endpoints.py -v
```

---

### **1.4 CRUD Cycle (Records)** — `test_crud_cycle_records_true_endpoints.py`

- **Requires:** Live API + MongoDB
- **Collections:** ubuntu_releases, python_releases, roman_leaders
- **Flow per record:** POST → GET → PUT → DELETE → GET 404
- **Data:** Up to 5 JSON files per collection from `tests/data_sets/{ubuntu_releases,python_releases,roman_leaders}/`

**Run:**
```bash
pytest tests/py_tests/test_crud_cycle_records_true_endpoints.py -v
```

---

### **1.5 User Create Suite** — `test_user_create_suite.py`

- **Requires:** Live API + MongoDB
- **Scope:** User registration, API key per user, auth validation, duplicate email, age tracking
- **User count:** Controlled by `USER_CREATE_COUNT` env (default: 20 for pytest)

| Test | Description |
|------|-------------|
| `test_user_count` | Verifies number of created users |
| `test_user_with_key_works` | Key returns correct `user_id` via `GET /auth/me` |
| `test_user_without_key_fails` | Protected endpoint returns 403 without auth |
| `test_api_key_user_mismatch` | Each key maps to correct user |
| `test_duplicate_email_rejected` | Second registration with same email returns 400 |
| `test_account_and_key_age_tracked` | `account_created_at`, `key_created_at` present |
| `test_delete_user_removes_keys` | Deleting user revokes all associated keys |

**Run:**
```bash
USER_CREATE_COUNT=50 pytest tests/py_tests/test_user_create_suite.py -v
```

---

## **2. cURL Tests** (`tests/curl_tests/`)

Shell-based tests against a live API. Require API key in `/tmp/api_key.txt` (from `get_auth_key.sh`).

### **Scripts**

| Script | Purpose |
|--------|---------|
| `get_auth_key.sh` | Generates API key via `POST /auth/generate-api-key` → stores in `/tmp/api_key.txt` |
| `post_create_few_dbentries.sh` | Creates few resume entries (president names) |
| `post_create_dbentries_set.sh` | Creates resume set from JSON files |
| `get_existing_all_dbentries.sh` | Lists resumes via `GET /resume/?skip=0&limit=100` |
| `put_bulk_dbentries.sh` | Bulk update resumes by first/last name |
| `delete_all_dbentries.sh` | Deletes all resume entries |
| `post_create_ubuntu_set.sh` | Creates up to 5 ubuntu releases from `data_sets/ubuntu_releases/` |
| `get_existing_ubuntu.sh` | Lists ubuntu releases |
| `delete_all_ubuntu.sh` | Deletes all ubuntu releases |
| `post_create_python_set.sh` | Creates up to 5 python releases |
| `get_existing_python.sh` | Lists python releases |
| `delete_all_python.sh` | Deletes all python releases |
| `post_create_roman_set.sh` | Creates up to 5 roman leaders |
| `get_existing_roman.sh` | Lists roman leaders |
| `delete_all_roman.sh` | Deletes all roman leaders |
| `collect_existing_tokens.sh` | Lists API keys |
| `revoke_api_tokens.sh` | Revokes API keys |

### **Execution Order** (`run_curl_tests.sh`)

1. `get_auth_key.sh`  
2. Create few resumes → list → delete  
3. `get_auth_key.sh`  
4. Create resume set → list → bulk put → delete → list  
5. Ubuntu: create → list → delete  
6. Python: create → list → delete  
7. Roman: create → list → delete  
8. `collect_existing_tokens.sh`  
9. `revoke_api_tokens.sh`  

**Run (in Docker):**
```bash
docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh
```

**Run (local, API on host):**
```bash
./tests/curl_tests/get_auth_key.sh
BASE_URL=http://127.0.0.1:8000 ./tests/curl_tests/run_curl_tests.sh
```

---

## **3. User Create Suite** (`tests/user_create_suite/`)

Standalone suite that creates many users with API keys and validates constraints. Writes credentials CSV for manual verification.

### **CLI arguments** (Python module)

| Argument | Short | Default | Meaning |
|----------|-------|---------|---------|
| `--count` | — | 100 | Number of users to create |
| `--extra` | — | 0 | Extra users (total = count + extra) |
| `--no-cleanup` | — | off | Skip user deletion after tests |
| `--base-url` | — | `$BASE_URL` | API base URL |
| `--verbose` | `-v` | off | Per-user progress (create + delete) |
| `--output` | `-o` | `.logs/user_create_credentials_<ts>.csv` | Credentials CSV path |

### **Shell script** (`run_user_create_suite.sh`)

| Arg | Default | Meaning |
|-----|---------|---------|
| `$1` (COUNT) | 100 | Number of users |
| `$2` (EXTRA) | 0 | Extra users |

**Env:** `BASE_URL` — API URL.

### **Pytest** (`test_user_create_suite.py`)

| Env | Default | Meaning |
|-----|---------|---------|
| `USER_CREATE_COUNT` | 20 | Users to create |

### **Commands**

```bash
# Python (100 users)
python -m tests.user_create_suite.run_user_create_suite

# Python with options
python -m tests.user_create_suite.run_user_create_suite --count 50 -v -o ./creds.csv

# Shell
./tests/user_create_suite/run_user_create_suite.sh 100 50

# Pytest
USER_CREATE_COUNT=50 pytest tests/py_tests/test_user_create_suite.py -v
```

See [tests/user_create_suite/README.md](../tests/user_create_suite/README.md) for full usage.

---

## **4. Environment Variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://doc-hub-api:8000` | API base URL |
| `ADMIN_SECRET` | — | Must match API when set; `get_auth_key.sh` sends `X-Admin-Secret` (Compose injects from `cfgs/.env`) |
| `USER_CREATE_COUNT` | `20` (pytest) / `100` (standalone) | Number of users for user-create suite |
| `API_KEY` | — | Fallback if `/tmp/api_key.txt` missing |

---

## **5. Data Sets**

| Path | Description |
|------|-------------|
| `tests/data_sets/resumes/` | Resume JSON (e.g. Abraham_Lincoln.json) |
| `tests/data_sets/ubuntu_releases/` | Ubuntu version/codename JSON |
| `tests/data_sets/python_releases/` | Python version JSON |
| `tests/data_sets/roman_leaders/` | Roman leader JSON |

---

## **6. Docker CLI Cheat Sheet**

When the dev stack is running (`./build/sh_scripts/dev_run.sh` or `docker compose ... up`), run these inside the `tests-manual` container to test the app:

### **Pytest (per suite)**

| Test Type | Suite | Command |
|-----------|-------|---------|
| System | sys_test | `docker exec -it tests-manual pytest -v -r charts tests/py_tests/sys_test.py` |
| Mock | mock endpoints | `docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_mock_endpoints.py` |
| Live | resume CRUD | `docker exec -it tests-manual ./tests/curl_tests/get_auth_key.sh` then `docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_true_endpoints.py` |
| Live | resume sets | `docker exec -it tests-manual ./tests/curl_tests/collect_existing_tokens.sh` then `revoke_api_tokens.sh` then `get_auth_key.sh` then `docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_true_endpoints_sets.py` |
| Live | records CRUD | `docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_crud_cycle_records_true_endpoints.py` |
| Live | user create | `docker exec -it tests-manual pytest -v -r charts tests/py_tests/test_user_create_suite.py` |

### **cURL (all-in-one)**

| Test Type | Command |
|-----------|---------|
| Full cURL suite | `docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh` |

### **User Create Suite (standalone)**

| Test Type | Command |
|-----------|---------|
| 100 users (default) | `docker exec -it tests-manual python -m tests.user_create_suite.run_user_create_suite` |
| Custom count | `docker exec -it tests-manual python -m tests.user_create_suite.run_user_create_suite --count 150` |

---

## **7. Quick Reference** (local, no Docker)

| Goal | Command |
|------|---------|
| Mock tests (no server) | `pytest tests/py_tests/test_mock_endpoints.py -v` |
| Resume CRUD (live) | `pytest tests/py_tests/test_crud_cycle_true_endpoints.py -v` |
| Records CRUD (live) | `pytest tests/py_tests/test_crud_cycle_records_true_endpoints.py -v` |
| User create (live) | `python -m tests.user_create_suite.run_user_create_suite` |
| All cURL tests | `./tests/curl_tests/run_curl_tests.sh` |
| Full pytest (with auth) | See [dev_setup_readme.md](dev_setup_readme.md) §9 |

---

## **8. Related Documentation**

- [dev_setup_readme.md](/docs/dev_setup_readme.md) — Dev and test setup, Docker, manual commands
- [cicd_pipeline_readme.md](/docs/cicd_pipeline_readme.md) — CI/CD and GitHub Actions
- [endpoints_README.md](/docs/endpoints_README.md) — API endpoint reference

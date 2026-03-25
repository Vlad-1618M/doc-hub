# Tests

Test suites for **Doc Hub** (FastAPI + MongoDB + Doc Portal).

## Structure

| Directory | Description |
|-----------|-------------|
| **py_tests/** | Pytest suites (mock + true-endpoint) |
| **curl_tests/** | Shell-based API tests (cURL) |
| **user_create_suite/** | User creation and validation suite |
| **data_sets/** | JSON fixtures (resumes, ubuntu, python, roman) |
| **dev_help_scripts/** | Helper scripts (MongoDB access, stress load, metadata cleanup) |

## Quick Start

```bash
# Mock tests (no server, no MongoDB)
pytest tests/py_tests/test_mock_endpoints.py -v

# Full cURL suite (requires running API)
./tests/curl_tests/get_auth_key.sh
./tests/curl_tests/run_curl_tests.sh

# User create suite (100 users with API keys)
python -m tests.user_create_suite.run_user_create_suite
```

## Full Documentation

See [docs/tests_readme.md](../docs/tests_readme.md) for comprehensive coverage. Quick links:

- [py_test_readme.md](py_tests/py_test_readme.md) — Pytest suites, fixtures, run commands, env vars
- [curl_test_readme.md](curl_tests/curl_test_readme.md) — cURL scripts, prerequisites
- [user_create_suite/README.md](user_create_suite/README.md) — CLI args, credentials file, shell script args

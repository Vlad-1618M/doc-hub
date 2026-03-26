# Pytest Suites

Pytest-based tests for the FastAPI application.

## Suites

| File | Type | Requires Server |
|------|------|-----------------|
| `test_mock_endpoints.py` | Mock (mongomock) | No — incl. WebSocket connect |
| `test_true_endpoints_sets.py` | Live API | Yes |
| `test_crud_cycle_true_endpoints.py` | Live API | Yes |
| `test_crud_cycle_records_true_endpoints.py` | Live API | Yes |
| `test_user_create_suite.py` | Live API | Yes |

## Fixtures (conftest.py)

- `api_mock_headers` — X-API-Key for mock tests
- `api_true_headers` — X-API-Key from `/tmp/api_key.txt` for live tests
- `created_resume`, `created_ubuntu_release`, `created_python_release`, `created_roman_leader`
- Payload fixtures: `ubuntu_release_payload`, `python_release_payload`, `roman_leader_payload`

## Run

```bash
# Mock only (no server)
pytest tests/py_tests/test_mock_endpoints.py -v

# Live (API + MongoDB)
./tests/curl_tests/get_auth_key.sh
pytest tests/py_tests/test_crud_cycle_true_endpoints.py -v
pytest tests/py_tests/test_crud_cycle_records_true_endpoints.py -v
pytest tests/py_tests/test_user_create_suite.py -v
```

## Env vars (live tests)

| Var | Default | Meaning |
|-----|---------|---------|
| `USER_CREATE_COUNT` | 20 | Users to create in `test_user_create_suite.py` |
| `BASE_URL` | `http://doc-hub-api:8000` | API base URL |
| `ADMIN_SECRET` | — | If the API has `ADMIN_SECRET` set, export the same value so `test_true_endpoints_sets.py` can call `POST /auth/generate-api-key` (sent as `X-Admin-Secret`). Compose injects this into `tests-manual` / `tests-ci`. |

Full docs: [docs/tests_readme.md](../../docs/tests_readme.md)

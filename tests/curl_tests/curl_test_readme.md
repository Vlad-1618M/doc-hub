# cURL-based API Tests

Shell scripts that test the FastAPI API using `curl` and `jq`.

## Prerequisites

- API must be running
- API key stored in `/tmp/api_key.txt` (run `get_auth_key.sh` first)

## Env vars

| Var | Default | Meaning |
|-----|---------|---------|
| `BASE_URL` | `http://doc-hub-api:8000` | API base URL |

## Quick Start

```bash
./tests/curl_tests/get_auth_key.sh
./tests/curl_tests/run_curl_tests.sh
```

In Docker:

```bash
docker exec -it tests-manual ./tests/curl_tests/run_curl_tests.sh
```

## Scripts

| Script | Purpose |
|--------|---------|
| `get_auth_key.sh` | Generate API key → `/tmp/api_key.txt` |
| `post_create_few_dbentries.sh` | Create few resumes |
| `post_create_dbentries_set.sh` | Create resumes from JSON |
| `get_existing_all_dbentries.sh` | List resumes |
| `put_bulk_dbentries.sh` | Bulk update resumes |
| `delete_all_dbentries.sh` | Delete all resumes |
| `post_create_ubuntu_set.sh` | Create ubuntu releases |
| `get_existing_ubuntu.sh` | List ubuntu |
| `delete_all_ubuntu.sh` | Delete ubuntu |
| `post_create_python_set.sh` | Create python releases |
| `get_existing_python.sh` | List python |
| `delete_all_python.sh` | Delete python |
| `post_create_roman_set.sh` | Create roman leaders |
| `get_existing_roman.sh` | List roman |
| `delete_all_roman.sh` | Delete roman |
| `collect_existing_tokens.sh` | List API keys |
| `revoke_api_tokens.sh` | Revoke API keys |

Full docs: [docs/tests_readme.md](../../docs/tests_readme.md)

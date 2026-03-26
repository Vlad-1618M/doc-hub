# User Create Test Suite

Creates N users with API keys, validates constraints (duplicate email, key mismatch, age tracking), and tests user+key removal.

## Requirements

- Running FastAPI server and MongoDB
- `BASE_URL` env (default: `http://doc-hub-api:8000`)

> Full test docs: [docs/tests_readme.md](../../docs/tests_readme.md)

## CLI Arguments (Python module)

| Argument | Short | Type | Default | Meaning |
|----------|-------|------|---------|---------|
| `--count` | — | int | 100 | Number of users to create |
| `--extra` | — | int | 0 | Additional users on top of count (total = count + extra) |
| `--no-cleanup` | — | flag | off | Do not delete users after tests (keep them for manual verification) |
| `--base-url` | — | str | `$BASE_URL` or `http://doc-hub-api:8000` | API base URL |
| `--verbose` | `-v` | flag | off | Print progress for each user (create + delete) |
| `--output` | `-o` | str | `.logs/user_create_credentials_<timestamp>.csv` | Path for credentials CSV (email, password, name, user_id) |

## Usage

### Python module (100 users by default)

```bash
python -m tests.user_create_suite.run_user_create_suite
```

### With custom count

```bash
python -m tests.user_create_suite.run_user_create_suite --count 150
python -m tests.user_create_suite.run_user_create_suite --count 100 --extra 50   # 150 total
```

### Credentials file (for manual verification)

By default, a CSV file with `email,password,name,user_id` for each user is written to `.logs/user_create_credentials_<timestamp>.csv`. Use `-o FILE` to specify a different path.

```bash
python -m tests.user_create_suite.run_user_create_suite --count 50 -o ./my_credentials.csv
```

### Watching API / UI logs

This suite uses the API only (no UI). To watch FastAPI logs in another terminal:

```bash
docker logs -f doc-hub-api
```

For UI logs (when manually testing login in the browser):

```bash
docker logs -f doc-hub-ui
```

### Shell script

| Positional | Meaning |
|------------|---------|
| `$1` (COUNT) | Number of users (default: 100) |
| `$2` (EXTRA) | Extra users on top of count (default: 0) |

**Env:** `BASE_URL` overrides API URL (default: `http://doc-hub-api:8000`).

```bash
./tests/user_create_suite/run_user_create_suite.sh           # 100 users
./tests/user_create_suite/run_user_create_suite.sh 150      # 150 users
./tests/user_create_suite/run_user_create_suite.sh 100 50   # 100 + 50 = 150
```

### Pytest (20 users by default for speed)

| Env | Default | Meaning |
|-----|---------|---------|
| `USER_CREATE_COUNT` | 20 | Number of users to create in pytest run |

```bash
USER_CREATE_COUNT=50 pytest tests/py_tests/test_user_create_suite.py -v
```

## Tests covered

- Create 100 users (configurable) with API key per user
- User + API key: key returns correct user_id via GET /auth/me
- User without API key: protected endpoint returns 403
- API key user mismatch: each key returns its owner's user_id
- Duplicate email: second registration with same email returns 400
- Account/key age: `account_created_at` and `key_created_at` tracked
- Delete user: removes user and all associated API keys

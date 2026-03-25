# Scripts

## live_data_control.py

Inject, remove, and update data for manual UI testing (glow, recent records sort, search, WebSocket, logs).

### Quick start

```bash
# Local (API at http://127.0.0.1:8000)
python3 scripts/live_data_control.py inject resumes --count 3
python3 scripts/live_data_control.py inject roman --from-json --count 2
python3 scripts/live_data_control.py update resumes --count 2   # Touch → glow
python3 scripts/live_data_control.py remove resumes --count 1

# Docker
docker exec -it tests-manual python3 scripts/live_data_control.py inject resumes --count 1
BASE_URL=http://doc-hub-api:8000 python3 scripts/live_data_control.py inject keys --count 5
```

### Actions

| Action  | Description                                      |
|---------|--------------------------------------------------|
| inject  | Add users, API keys, resumes, or records        |
| remove  | Delete by count or `--all`                        |
| update  | Touch records (refresh `updated_at`) → triggers glow |

### Data types

| Type     | inject                 | remove   | update |
|----------|------------------------|----------|--------|
| users    | Create N test users    | *(limited)* | —      |
| keys     | Generate N API keys    | Revoke N | —      |
| resumes  | From JSON or fake      | By count | Touch N |
| ubuntu   | From JSON or fake      | By count / `--all` | Touch N |
| python   | From JSON or fake      | By count / `--all` | Touch N |
| roman    | From JSON or fake      | By count / `--all` | Touch N |

### Options

- `--count N` — Number of items (default: 1)
- `--all` — Remove all of type (remove only)
- `--from-json` — Use `tests/data_sets/*/` JSON templates (inject only)
- `--base-url URL` — API base (default: `$BASE_URL` or `http://127.0.0.1:8000`)

### Requirements

- API running and reachable
- Dev user `dev@dev.com` / `dev123` (created by `inject_dev_data.sh` or on first run)
- For JSON templates: `tests/data_sets/{resumes,ubuntu_releases,python_releases,roman_leaders}/*.json`

# Migration Plan — Doc Hub Rebrand & Renaming

**Status:** Naming in this repository has been applied for **doc-hub** (containers `doc-hub-mongo`, `doc-hub-api`, `doc-hub-ui`). This document remains as a record of the migration steps and rationale.

This document outlines a safe migration from the former `fastapi-to-mongodb` naming to the `doc-hub` identity, aligned with the app’s branding as **Doc Portal** and **Internal Records & Document Hub**.

---

## Naming Options

| Name | Pros | Cons |
|------|------|------|
| **doc-hub** | Short, memorable, matches the UI, good for GitHub | Very generic |
| **doc-portal** | Matches the UI brand exactly | May be confused with docs-as-code tools |
| **internal-doc-hub** | Describes purpose well | Longer |
| **record-hub** | Emphasizes records (resumes, releases, etc.) | Not clearly document-focused |
| **doc-hub-app** | Clear it's an application | Slightly redundant |

**Recommendation:** `doc-hub` — short, URL-friendly, and aligned with "Document Hub".

---

## What Needs to Change

### 1. Container / Service Names (High Impact)

References to `resume-mongo`, `resume-fastapi`, `resume-ui`:

- `build/docker-compose.yml` — service names, `container_name`, `depends_on`, health checks
- `build/docker-compose-github.yml`
- `build/nginx-ui.conf` — `proxy_pass` targets
- `build/mongodb.Dockerfile` — if paths reference containers
- Test scripts — `BASE_URL`, `resume-fastapi:8000`
- Docs — README, architecture, dev setup, CI/CD

**Suggested mapping:**

| Current | New |
|---------|-----|
| `resume-mongo` | `doc-hub-mongo` (or `doc-hub-db`) |
| `resume-fastapi` | `doc-hub-api` |
| `resume-ui` | `doc-hub-ui` |

### 2. Workdir `/dbapp`

Used in:

- `build/fastapi.Dockerfile`, `build/mongodb.Dockerfile`, `build/test.Dockerfile` — `WORKDIR /dbapp`
- `build/mongodb.Dockerfile` — `COPY` paths
- `tests/py_tests/conftest.py` — `Path("/dbapp")`
- `tests/py_tests/test_crud_cycle_*.py`
- `cfgs/set_db_creds.sh`
- `build/sh_scripts/inject_dev_data.sh`

**Options:**

- **Keep `/dbapp`** — minimal change (just update docs).
- **Standardize to `/app`** — common convention, but more edits.

### 3. Package / Project Metadata

- `package-lock.json` — root `"name": "doc-hub"` (done)
- `ui/package.json` — if it has a `name` field

### 4. Documentation

- `docs/dev_setup_readme.md` — git clone URL
- Any README mentions of `fastapi-to-mongodb`

---

## Migration Approach

### Option A: New Repo, Copy + Bulk Replace

1. Create a new GitHub repo (e.g. `doc-hub`).
2. Copy the full `fastapi-to-mongodb` tree into it (without `.git`).
3. Run search-and-replace for:
   - `resume-mongo` → `doc-hub-mongo`
   - `resume-fastapi` → `doc-hub-api`
   - `resume-ui` → `doc-hub-ui`
   - `fastapi-to-mongodb` → `doc-hub` (where it’s a project/repo name)
4. Update `package.json` / `package-lock.json` names.
5. Run tests and Docker build.
6. Optionally keep `/dbapp` for now and migrate to `/app` in a follow-up.

### Option B: Migration Script

Create a script that:

- Performs the replacements above in a controlled way
- Skips binaries, lockfiles, and `.git`
- Optionally backs up original files

### Option C: Rename In-Place First, Then Push to New Repo

1. Do all replacements inside `fastapi-to-mongodb`.
2. Run tests and Docker locally.
3. Change git remote origin and push to the new repo.
4. Leave `fastapi-to-mongodb` as a separate, clean template repo.

---

## Order of Operations

1. **Decide:** container names and workdir (keep `/dbapp` or switch to `/app`).
2. **Dry-run:** search-replace (e.g. `grep -r` to confirm targets).
3. **Apply replacements** (prefer one PR/commit per concern: compose, nginx, tests, docs).
4. **Run:**
   - `docker compose up --build`
   - Pytest and cURL tests
5. Update README and other docs.
6. Push to the new repo and adjust remotes.

---

## Files to Touch (Summary)

| Category | Files |
|----------|-------|
| **Docker Compose** | `build/docker-compose.yml`, `build/docker-compose-github.yml` |
| **Nginx** | `build/nginx-ui.conf` |
| **Dockerfiles** | `build/fastapi.Dockerfile`, `build/mongodb.Dockerfile`, `build/test.Dockerfile` |
| **Config** | `cfgs/set_db_creds.sh` |
| **Tests** | `conftest.py`, `test_*_endpoints.py`, `curl_tests/*.sh`, `user_create_suite/*` |
| **Scripts** | `build/sh_scripts/*`, `inject_dev_data.sh` |
| **Docs** | README, `docs/*.md`, `ui/README.md` |
| **Package** | `package-lock.json`, `ui/package.json` |
| **CI/CD** | `.github/workflows/cicd-build.yml` *(not present in this repo yet — add when wiring GitHub Actions)* |

---

## Automation

To have this migration automated (scripts, exact replacements, and dry-run checks), switch to **Agent mode** and request migration script generation for your chosen names and paths.

# CI/CD: GitHub Actions and Docker Compose

## Overview

This document explains how automated CI is wired for **Doc Hub** (FastAPI + MongoDB + Doc Portal UI), how the **full** Compose stack differs from the **GitHub-optimized** file, and how it relates to [dev_setup_readme.md](./dev_setup_readme.md).

For a **workflow-by-workflow** reference (triggers, permissions, failures, gaps, suggestions), see [github_workflows_readme.md](./github_workflows_readme.md).

---

## Why two Compose files?

### 1. [build/docker-compose.yml](../build/docker-compose.yml) — full local dev

- Intended for **daily development and manual testing**.
- Brings up **six** services:
  - `doc-hub-mongo`
  - `doc-hub-api`
  - `doc-hub-ui` — React **Doc Portal** (http://localhost:3000)
  - `mongo-express-ui`
  - `tests-ci` — runs the integration script then exits
  - `tests-manual` — stays up for interactive pytest / cURL
- Uses normal MongoDB settings; includes **mongo-express** and helper test containers.
- Orchestrated end-to-end by [build/sh_scripts/dev_run.sh](../build/sh_scripts/dev_run.sh).

### 2. [build/docker-compose-github.yml](../build/docker-compose-github.yml) — CI-optimized

- Intended **only for GitHub Actions** (smaller footprint on free-tier runners).
- **Omits** `mongo-express` and `tests-manual`.
- **Adds** `shm_size: "256m"` and a **512M** memory cap hint on MongoDB to reduce OOM risk.
- Same service names for DB/API: `doc-hub-mongo`, `doc-hub-api`, plus `tests-ci`.

---

## GitHub Actions workflows (`.github/workflows/`)

| Workflow | Role |
|----------|------|
| [cicd-build.yml](../.github/workflows/cicd-build.yml) | **Docker Compose CI** — validates Compose, builds images, runs `tests-ci` with **`--exit-code-from tests-ci`**, uses committed **[cfgs/.env.ci](../cfgs/.env.ci)** (not gitignored `cfgs/.env`). |
| [pr-checks.yml](../.github/workflows/pr-checks.yml) | Fast path: mock pytest + UI `lint` / `build` (no Docker). |
| [codeql.yml](../.github/workflows/codeql.yml) | CodeQL static analysis (Python + JavaScript in `ui/`). |
| [dependency-review.yml](../.github/workflows/dependency-review.yml) | Dependency review on pull requests (requires Dependency graph). |
| [security-scan.yml](../.github/workflows/security-scan.yml) | Gitleaks secret scanning. |

Dependabot config: [.github/dependabot.yml](../.github/dependabot.yml).

---

## `cicd-build.yml` — actual flow

**Triggers:** `push` / `pull_request` on `main`, `master`, `repo_init`, `v.tools_main`, plus **workflow_dispatch**.

**Steps (summary):**

1. **Checkout** — `actions/checkout@v4`
2. **Docker Buildx** — `docker/setup-buildx-action@v3`
3. **Validate** — `docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci config --quiet`
4. **Integration** — bring up `doc-hub-mongo`, `doc-hub-api`, and `tests-ci`, propagate exit code from `tests-ci`:

```bash
docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci \
  up --build --abort-on-container-exit --exit-code-from tests-ci \
  doc-hub-mongo doc-hub-api tests-ci
```

5. **Teardown** — `docker compose ... down -v --remove-orphans` (runs even if the job fails)

Inside **`tests-ci`**, the container command already runs `ping` / `curl` against **`doc-hub-api`** and then **[build/sh_scripts/cicd_run.sh](../build/sh_scripts/cicd_run.sh)** (pytest + cURL helpers). You do **not** need a separate `docker compose exec tests-ci …` step in the workflow for that.

---

## [cicd_run.sh](../build/sh_scripts/cicd_run.sh) — what it does

- Verifies the API is reachable (`ping`, `curl`).
- Runs [get_auth_key.sh](../tests/curl_tests/get_auth_key.sh) (uses **`X-Admin-Secret`** when `ADMIN_SECRET` is set in the environment — provided via Compose from `.env.ci`).
- Runs the configured pytest and cURL sequences, then cleanup helpers.

> **More on tests:** [docs/tests_readme.md](tests_readme.md)

---

## Final notes

- CI uses **`.env.ci`** so builds do not depend on a local **`cfgs/.env`** (gitignored).
- The **MongoDB image** ([build/mongodb.Dockerfile](../build/mongodb.Dockerfile)) runs [set_db_creds.sh](../cfgs/set_db_creds.sh) with **`cfgs/.env` if present**, otherwise **`cfgs/.env.ci`**, so the image initializes correctly on GitHub runners (where `.env` is never in the build context).
- The slimmer **`docker-compose-github.yml`** exists to **avoid SIGKILL / OOM (exit 137)** on small runners.
- For local parity with CI, you can run the same Compose file manually with `--env-file cfgs/.env.ci`.

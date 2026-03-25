# GitHub Workflows — full guide

Reference for **what** runs in CI, **why** it exists, **when** it triggers, **how** to run or debug it locally, **common failures**, and **suggested improvements**.

For Docker Compose layout (full vs GitHub-optimized) and how `tests-ci` fits the stack, see [cicd_pipeline_readme.md](cicd_pipeline_readme.md).

---

## Table of contents

1. [Big picture](#big-picture)
2. [Branch and trigger matrix](#branch-and-trigger-matrix)
3. [Workflow reference](#workflow-reference)
   - [PR checks](#1-pr-checks-pr-checksyml)
   - [Docker Compose CI](#2-docker-compose-ci-cicd-buildyml)
   - [CodeQL](#3-codeql-codeqlyml)
   - [Dependency review](#4-dependency-review-dependency-reviewyml)
   - [Security scan (Gitleaks)](#5-security-scan-gitleaks-security-scanyml)
4. [Dependabot](#dependabot-not-a-workflow-but-related)
5. [Required files and secrets](#required-files-and-secrets)
6. [How to reproduce locally](#how-to-reproduce-locally)
7. [Common failures and how to fix](#common-failures-and-how-to-fix)
8. [What is not covered today](#what-is-not-covered-today)
9. [Suggestions and backlog](#suggestions-and-backlog)
10. [Related documentation](#related-documentation)

---

## Big picture

Doc Hub uses **GitHub Actions** to:

| Goal | How |
|------|-----|
| Fast feedback on every PR/push | **PR checks** — Python mock pytest + UI lint/build (no Docker). |
| Real API + Mongo + integration tests | **Docker Compose CI** — builds images, runs `tests-ci` with exit code propagation. |
| Security posture | **CodeQL** (static analysis), **Gitleaks** (secret scan), **Dependency review** (vulnerable deps on PRs). |
| Up-to-date tooling | **Dependabot** opens weekly PRs for Actions, pip, and npm. |

Workflows intentionally **split** “fast, no Docker” from “slow, full stack” so contributors get quick signal while main still proves integration.

---

## Branch and trigger matrix

All workflows below filter **base/target** branches to:

`main`, `master`, `repo_init`, `v.tools_main`

**Implication:** Pushes and pull requests against **other** branches (for example `develop` or a long-lived feature branch as default) **do not** run these workflows unless you extend the `on:` block in each YAML file.

| Workflow | `push` | `pull_request` | `schedule` | `workflow_dispatch` |
|----------|--------|----------------|------------|---------------------|
| PR checks | Yes* | Yes* | No | No |
| Docker Compose CI | Yes* | Yes* | No | Yes |
| CodeQL | Yes* | Yes* | Weekly Mon 05:39 UTC | No |
| Dependency review | No | Yes* | No | No |
| Security scan | Yes* | Yes* | No | Yes |

\*Only for the branch list above.

---

## Workflow reference

### 1. PR checks (`pr-checks.yml`)

**What:** Two parallel jobs on `ubuntu-latest`.

| Job | Steps (summary) |
|-----|-----------------|
| `python-mock-tests` | Checkout → Python **3.13** + pip cache from `deps/requirements-dev.txt` → `pip install -r deps/requirements-dev.txt` → `pytest tests/py_tests/test_mock_endpoints.py` with strict markers, 60s timeout, max 3 failures. |
| `ui` | Checkout → Node **22** + npm cache from `ui/package-lock.json` → `cd ui` → `npm ci` → `npm run lint` → `npm run build`. |

**Why:** Catches regressions in the FastAPI app **without** MongoDB (TestClient mocks) and ensures the **Doc Portal** (`ui/`) type-checks and bundles.

**When:** On every qualifying `push` / `pull_request` to the configured branches.

**How it works technically:**

- Concurrency group `pr-checks-…` with **cancel-in-progress** so newer commits supersede stale runs on the same ref.
- Permissions: `contents: read` only.

**Permissions / secrets:** Uses default `GITHUB_TOKEN` implicitly; no repository secrets required.

---

### 2. Docker Compose CI (`cicd-build.yml`)

**What:** Single job `compose-integration` with a **45-minute** timeout.

1. Checkout  
2. **Docker Buildx** (`docker/setup-buildx-action@v3`)  
3. **Validate** Compose:  
   `docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci config --quiet`  
4. **Run stack:**  
   `docker compose … up --build --abort-on-container-exit --exit-code-from tests-ci doc-hub-mongo doc-hub-api tests-ci`  
5. **Always** tear down: `… down -v --remove-orphans` (even on failure)

**Why:** Proves Dockerfiles, service wiring, and the **real** pytest + cURL pipeline inside the `tests-ci` container (see [build/sh_scripts/cicd_run.sh](../build/sh_scripts/cicd_run.sh)).

**When:** Same branches as PR checks, plus **manual** re-run via **Actions → Docker Compose CI → Run workflow**.

**How** `tests-ci` gets a green/red exit code: `--exit-code-from tests-ci` maps the container’s exit status to the job outcome.

**Key files:**

- [build/docker-compose-github.yml](../build/docker-compose-github.yml) — CI-slim Compose (no mongo-express / tests-manual; Mongo `shm_size` / memory hints).  
- [cfgs/.env.ci](../cfgs/.env.ci) — **Committed** placeholders (Mongo, JWT, `ADMIN_SECRET`, ports). Local `cfgs/.env` is gitignored.  
- [.gitleaks.toml](../.gitleaks.toml) — Allowlists `cfgs/.env.ci` so intentional placeholders do not fail secret scan.

---

### 3. CodeQL (`codeql.yml`)

**What:** Two **separate** jobs (each full clone + analyze):

| Job | Language | Notable steps |
|-----|----------|----------------|
| `python` | Python | `codeql-action/init` → **autobuild** → `analyze` (category `/language:python`). Ignores `ui/node_modules` and `**/node_modules/**`. |
| `javascript` | JavaScript | Node 22 + npm cache → `init` with `paths: [ui]` → `npm ci` + `npm run build` in `ui/` → `analyze` (category `/language:javascript`). |

**Why:** GitHub’s static analysis for security-relevant patterns; complements lint/tests.

**When:** Push/PR on configured branches, plus **weekly** schedule `cron: "39 5 * * 1"` (Monday 05:39 UTC).

**Permissions:** `contents: read`, `security-events: write` (uploads SARIF to the Security tab).

**Private repositories:** CodeQL often requires **GitHub Advanced Security** (org/repo policy). Public repos typically work without extra purchase.

---

### 4. Dependency review (`dependency-review.yml`)

**What:** On **pull requests** only — checkout → `actions/dependency-review-action@v4`.

**Why:** Compares base vs head dependency manifests and flags known-vulnerable versions using GitHub’s dependency graph.

**When:** PRs targeting the configured branches.

**Permissions:** `contents: read`, `pull-requests: write` (comments / annotations).

**Requirements:** **Dependency graph** must be enabled for the repo (and available for your plan). Public repos are usually fine; private orgs may need settings enabled.

---

### 5. Security scan — Gitleaks (`security-scan.yml`)

**What:** Checkout with **`fetch-depth: 0`** (full history for accurate secret baseline) → `gitleaks/gitleaks-action@v2` with `GITHUB_TOKEN`.

**Why:** Blocks accidental commits of keys, tokens, and passwords.

**When:** Push/PR on configured branches + **workflow_dispatch**.

**Configuration:** [.gitleaks.toml](../.gitleaks.toml) — path allowlist includes `cfgs/.env.ci` because those values are **documented CI placeholders**, not production secrets.

---

## Dependabot (not a workflow, but related)

**File:** [.github/dependabot.yml](../.github/dependabot.yml)

| Ecosystem | Directory | Schedule |
|-----------|-----------|----------|
| `github-actions` | `/` (repo root) | Weekly |
| `pip` | `/deps` | Weekly |
| `npm` | `/ui` | Weekly |

**Why:** Keeps Actions versions, Python deps, and UI deps current with PRs you can review.

**Not automatic:** Merging Dependabot PRs still runs your workflows; fix breakages like any other change.

---

## Required files and secrets

### Must exist in the repo for CI to pass

| Path | Used by |
|------|---------|
| `deps/requirements-dev.txt` | PR checks (Python) |
| `tests/py_tests/test_mock_endpoints.py` | PR checks |
| `ui/package-lock.json` | PR checks, CodeQL JS |
| `ui/eslint.config.js` (flat config) | PR checks `npm run lint` (ESLint 9) |
| `cfgs/.env.ci` | Docker Compose CI |
| `.gitignore` exception `!cfgs/.env.ci` | So `.env.ci` is not ignored by `.env.*` |

### Secrets

| Secret | Workflows |
|--------|-----------|
| `GITHUB_TOKEN` (built-in) | All; Gitleaks passes it explicitly |

No custom repository secrets are **required** for the current workflows.

---

## How to reproduce locally

### PR checks — Python

```bash
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r deps/requirements-dev.txt
pytest tests/py_tests/test_mock_endpoints.py \
  --override-ini="addopts=-q --strict-markers --timeout=60 --maxfail=3"
```

### PR checks — UI

```bash
cd ui && npm ci && npm run lint && npm run build
```

### Docker Compose CI (parity with Actions)

From repo root:

```bash
docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci config --quiet
docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci \
  up --build --abort-on-container-exit --exit-code-from tests-ci \
  doc-hub-mongo doc-hub-api tests-ci
docker compose --env-file cfgs/.env.ci -f build/docker-compose-github.yml -p doc-hub-ci down -v --remove-orphans
```

---

## Common failures and how to fix

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| ESLint: cannot find `eslint.config.js` | ESLint 9 defaults to flat config | Add `ui/eslint.config.js` (and commit). |
| `tsc` / Vite: missing module (e.g. `../lib/…`) | File not committed or wrong path | Add or fix source files; run `npm run build` locally. |
| `couldn't find env file: …/cfgs/.env.ci` | File missing or not pushed | Add [cfgs/.env.ci](../cfgs/.env.ci) and ensure `.gitignore` has `!cfgs/.env.ci`. |
| Compose CI **exit 137** | OOM on runner | Already mitigated by `docker-compose-github.yml` (lighter stack, Mongo limits). If it persists, reduce parallel work or split jobs. |
| Mongo / `set_db_creds`: **Environment file not found** | Image expected `cfgs/.env` inside the build context; CI has no gitignored `.env` | [mongodb.Dockerfile](../build/mongodb.Dockerfile) falls back to **`cfgs/.env.ci`**; ensure that file is committed. |
| `get_auth_key.sh` / admin routes fail in CI | `ADMIN_SECRET` mismatch | Ensure `cfgs/.env.ci` sets `ADMIN_SECRET` and Compose passes it to `doc-hub-api` and `tests-ci`. |
| Dependency review skipped or errors | Graph disabled or plan limits | Enable dependency graph; check org settings for private repos. |
| CodeQL fails on private repo | Advanced Security not available | Enable GHAS or accept disabling/analyzing fewer languages per org policy. |
| Gitleaks flags `cfgs/.env.ci` | Allowlist missing or wrong path | Confirm [.gitleaks.toml](../.gitleaks.toml) lists `cfgs/.env.ci`. |
| **No workflow runs at all** | Branch not in `on:` list | Add your default branch name to `branches: […]` in each workflow YAML. |

---

## What is not covered today

These are **gaps by design** until you add them (see also [TODO.md](TODO.md)):

- **UI unit tests** (Vitest / RTL) — not in any workflow.  
- **Python lint/format** (e.g. Ruff) — not in PR checks.  
- **E2E** (Playwright, Cypress) — not present.  
- **Coverage gates** for Python or JS — mock pytest runs without coverage in CI.  
- **Deploy / release** — no CD workflow to staging or production.  
- **Path filters** — workflows do not use `paths:` / `paths-ignore:`; every change runs the full matrix for that event (except dependency review, PR-only).

---

## Suggestions and backlog

1. **Path filters** — Run `ui` job only when `ui/**` changes, and Python mock tests when `src/**`, `tests/**`, or `deps/**` change (still run both on `main` if you want a safety net).  
2. **Pin third-party Actions** — Consider full commit SHAs for `actions/*` and `github/*` for supply-chain hardening (Dependabot still bumps them).  
3. **Job timeouts** — `pr-checks` has no explicit `timeout-minutes`; add one (e.g. 15) to avoid hung runners.  
4. **Artifacts** — On Compose failure, upload API or `tests-ci` logs if you add `docker compose logs` to a step `if: failure()`.  
5. **Merge queue** — If you use GitHub merge queue, confirm workflows satisfy required checks and concurrency groups behave as expected.  
6. **README link** — Repository [README.md](../README.md) should link **Security scan** to `.github/workflows/security-scan.yml` (not `dependency-review.yml`).

---

## Related documentation

| Doc | Topic |
|-----|--------|
| [cicd_pipeline_readme.md](cicd_pipeline_readme.md) | Two Compose files, `cicd_run.sh`, `.env.ci` rationale |
| [tests_readme.md](tests_readme.md) | Pytest layouts, curl suites, env vars |
| [dev_setup_readme.md](dev_setup_readme.md) | Local Docker and `dev_run.sh` |
| [TODO.md](TODO.md) | Planned UI tests, Python lint, Playwright |
| [frontend_stack_readme.md](frontend_stack_readme.md) | `ui/` stack |

**Workflow sources (source of truth):** [.github/workflows/](../.github/workflows/)

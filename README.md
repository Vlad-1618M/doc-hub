# Doc Hub:

Internal **records and document hub**: <br>
FastAPI backend, MongoDB, and a React (**Doc Portal**) UI for resumes, release records, and related data.<br> 

## Stack:
- **API:** [FastAPI](/src/) build on Python 3.13  
- **Database:** MongoDB 6  
- **UI:** React + Vite + TypeScript + Tailwind [UI](/ui/)  
- **Runtime:** Docker Compose under [build](/build/)

## How To / start (Docker):

1. Copy environment template and edit secrets:
   ```bash
   cp cfgs/.env.example cfgs/.env
   ```

2. From the repo root, start the stack (or use [dev_run.sh](/build/sh_scripts/dev_run.sh)):

   ```bash
   docker compose --env-file cfgs/.env -f build/docker-compose.yml -p build up --build -d
   ```

3. Typical URLs (ports from `.env`):

   - UI: `http://localhost:3000` (default `UI_PORT`)
   - API docs: `http://localhost:8000/docs` (default `FASTAPI_PORT`)
   - OpenAPI schema: `http://localhost:8000/openapi.json` (also proxied at `http://localhost:3000/openapi.json` through Doc Portal)
   - Mongo Express: `http://localhost:8081` (if enabled)

### Compose service names:

| Service        | Role              |
|----------------|-------------------|
| `doc-hub-mongo` | MongoDB           |
| `doc-hub-api`   | FastAPI           |
| `doc-hub-ui`    | Static UI + nginx |

Inside the Compose network, the API reaches MongoDB at host **`doc-hub-mongo`** (see `MONGO_HOST` in  [cfgs](cfgs/.env.example)).

## Local development (without full stack):
- **Python:** create a venv, install `deps/requirements-dev.txt`, run pytest from the repo root.  
- **UI:** `cd ui && npm ci && npm run dev` (or `npm run build` for production assets).

## Tests:
- **Mock / unit (no real MongoDB):**  
  `pytest tests/py_tests/test_mock_endpoints.py`
- **Full guides:** 
 - [docs/tests_readme.md](docs/tests_readme.md)
 - [tests/py_tests/py_test_readme.md](tests/py_tests/py_test_readme.md)
 - [tests/curl_tests/curl_test_readme.md](tests/curl_tests/curl_test_readme.md)

## GitHub Actions:
Workflows under [.github/workflows](.github/workflows):

| Workflow | Purpose |
|----------|---------|
| [pr-checks.yml](.github/workflows/pr-checks.yml) | Fast path: mock pytest + UI `lint` / `build` |
| [cicd-build.yml](.github/workflows/cicd-build.yml) | Docker Compose build + `tests-ci` integration (uses committed [cfgs/.env.ci](cfgs/.env.ci), not `cfgs/.env`) |
| [codeql.yml](.github/workflows/codeql.yml) | CodeQL for Python + JavaScript (`ui/`) |
| [dependency-review.yml](.github/workflows/dependency-review.yml) | PR dependency review (requires Dependency graph; public repos OK) |
| [security-scan.yml](.github/workflows/security-scan.yml) | Gitleaks secret scan ([.gitleaks.toml](.gitleaks.toml) allowlists `cfgs/.env.ci`) |
| [Dependabot](.github/dependabot.yml) opens weekly PRs for GitHub Actions, pip (`deps/`), and npm (`ui/`)
----------

## Scripts:
- **Live data helpers (needs a running API):** from repo root  
  `python -m scripts.live_data_control --help`

- **User create suite:** [tests/user_create_suite/README.md](tests/user_create_suite/README.md)

## Documentation:

| Doc | Purpose |
|-----|---------|
| [docs/README.md](docs/README.md) | **Index** of all docs |
| [docs/dev_setup_readme.md](docs/dev_setup_readme.md) | Dev environment and orchestration |
| [docs/architecture.md](docs/architecture.md) | System layout |
| [docs/migration_plan.md](docs/migration_plan.md) | Rebrand and naming migration notes |
| [docs/endpoints_README.md](docs/endpoints_README.md) | API overview |
| [ui/README.md](ui/README.md) | Frontend dev notes |

## License:
This project is licensed under the [MIT License](LICENSE).

## Contributing:
* TBD:

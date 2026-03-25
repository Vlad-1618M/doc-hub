# Doc Hub — documentation index

Start here for setup, architecture, API notes, and tests.

| Document | What it covers |
|----------|----------------|
| [dev_setup_readme.md](dev_setup_readme.md) | Docker Compose, `dev_run.sh`, local URLs, MongoDB shell, test flow |
| [architecture.md](architecture.md) | System diagram, request flows, container names (`doc-hub-*`) |
| [endpoints_README.md](endpoints_README.md) | REST/WebSocket overview; **`/openapi.json`**, `/docs`, `/redoc` |
| [websocket_realtime_readme.md](websocket_realtime_readme.md) | **`/ws/dashboard`** — push → refetch flow, debugging, caching, scaling, enhancements |
| [frontend_stack_readme.md](frontend_stack_readme.md) | Vite, React, dev proxy, `ui/` layout |
| [pydantic_models_readme.md](pydantic_models_readme.md) | Resume, record, and auth models |
| [tests_readme.md](tests_readme.md) | Pytest, cURL suites, env vars, Docker cheat sheet |
| [cicd_pipeline_readme.md](cicd_pipeline_readme.md) | GitHub Actions, `docker-compose-github.yml`, `cfgs/.env.ci` |
| [mongo_cli_notes.md](mongo_cli_notes.md) | `mongosh` examples against `resume_db` |
| [mongo_logging_readme.md](mongo_logging_readme.md) | Richer Mongo logs; **`configure_dev_logs.sh`** (API + PyMongo + Mongo verbosity) |
| [migration_plan.md](migration_plan.md) | Historical rebrand from `fastapi-to-mongodb` → **doc-hub** |
| [dashboard_nav_customization_readme.md](dashboard_nav_customization_readme.md) | **Add/remove** dashboard tiles, sidebar sections, and record types (vs cosmetic HR/Test links) |
| [new_feature_roadmap/](new_feature_roadmap/) | **Planned work:** org taxonomy, RBAC, dynamic nav — per-feature testing, CI/CD, and tech prerequisites ([ROADMAP.md](new_feature_roadmap/ROADMAP.md)) |

**Repository root:** [README.md](../README.md)

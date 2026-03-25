# Doc Hub — new feature roadmap (org structure & platform growth)

**Status:** planning · **Tracking:** use GitHub Issues / Projects with label `roadmap` (see [README.md](README.md)).

This roadmap assumes the **current stack** (baseline for every feature):

| Layer | Existing tech |
|-------|----------------|
| API | Python 3.10+ (Docker), FastAPI, Uvicorn, Pydantic v2, PyMongo |
| Data | MongoDB 6.x, collections: `resume`, record types, `api_keys`, `users` (auth DB), `audit_events` |
| Auth | JWT + `X-API-Key`, optional `ADMIN_SECRET` |
| UI | React 18, Vite, TypeScript, Tailwind, React Router |
| Proxy | nginx (`doc-hub-ui`), path rules for API + `/audit` |
| Realtime | WebSocket `/ws/dashboard`, debounced refetch |
| Tests | pytest + mongomock (`test_mock_*`), Docker `tests-ci` / `tests-manual`, curl suites |
| CI/CD | `pr-checks.yml` (mock pytest + UI build), `cicd-build.yml` (Compose + integration), CodeQL, Dependabot, etc. |

Each feature below adds **new prerequisites** only where needed.

---

## Phase 0 — Baseline hardening (optional but recommended before org work)

These tighten the foundation so later features do not fight tech debt.

### F-0.1 OpenAPI / contract tests for new routes

| | |
|--|--|
| **Goal** | Freeze public API shape; catch drift on PRs. |
| **New tech / prereqs** | `schemathesis`, `openapi-spec-validator`, or diff against committed `openapi.json` snapshot. |
| **Work** | Snapshot or validate `/openapi.json` in CI; optional schemathesis against running API in compose job. |
| **Testing** | CI step only or pytest wrapper. |
| **CI/CD** | Extend `pr-checks.yml` or add job under `cicd-build.yml` after API healthy. |
| **Done** | Failing PR if OpenAPI breaks without intent. |

- [ ] **TODO F-0.1**

### F-0.2 Frontend unit / component tests (selective)

| | |
|--|--|
| **Goal** | Safer refactors when sidebar/dashboard become dynamic. |
| **New tech / prereqs** | Vitest + React Testing Library (already common with Vite). |
| **Work** | Configure Vitest; 1–2 smoke tests on `Layout` / `Sidebar`. |
| **Testing** | `npm run test` in `pr-checks.yml` `ui` job. |
| **CI/CD** | Add script to [pr-checks.yml](../../.github/workflows/pr-checks.yml). |
| **Done** | CI runs Vitest; docs updated in `frontend_stack_readme.md`. |

- [ ] **TODO F-0.2**

---

## Phase 1 — Organization taxonomy (data + API + read UI)

**Product intent:** Represent “Executive, Operations, HR, Engineering, …” as **data**, not hardcoded nav.

### F-1.1 Org unit model & Mongo collection

| | |
|--|--|
| **Goal** | Hierarchical org nodes: `name`, `slug`, `parent_id`, `kind` (function / team), `sort_order`, optional `description`. |
| **New tech / prereqs** | None beyond Mongo + Pydantic; consider **MongoDB indexes** on `parent_id`, `slug` (unique). |
| **Work** | New collection `org_units`; Pydantic models; migration/seed script from static JSON/YAML of your taxonomy. |
| **Testing** | pytest: CRUD + tree query; mongomock fixture for `org_units`. |
| **CI/CD** | Mock tests in `pr-checks`; optional seed smoke in `tests-ci` if endpoints mounted. |
| **Done** | Stable schema + seed loads without manual hacks. |

- [ ] **TODO F-1.1**

### F-1.2 Org units REST API (admin + read)

| | |
|--|--|
| **Goal** | `GET /org/units` (tree or flat + assemble client-side), `POST/PATCH/DELETE` (admin or role-gated later). |
| **New tech / prereqs** | FastAPI dependencies; align with OpenAPI tags. |
| **Work** | Router `src/routes/org_endpoints.py`; register in `server.py`; audit `record_audit` on mutations. |
| **Testing** | Mock auth tests + integration in compose against real Mongo. |
| **CI/CD** | Extend `cicd_run.sh` / pytest discovery if new test file pattern. |
| **Done** | Documented in `endpoints_README.md`; Swagger shows org tag. |

- [ ] **TODO F-1.2**

### F-1.3 Read-only org browser in UI

| | |
|--|--|
| **Goal** | Page or drawer: expandable tree from API; deep link by `slug`. |
| **New tech / prereqs** | None; optional **headless tree** component or plain nested `<ul>`. |
| **Work** | `ui/src/api/orgApi.ts`, new route e.g. `/app/org`, sidebar link. |
| **Testing** | Vitest for tree builder util; manual / Playwright later (F-0.2 follow-up). |
| **CI/CD** | UI build must pass (`pr-checks`). |
| **Done** | Non-admin users can view org tree. |

- [ ] **TODO F-1.3**

---

## Phase 2 — Link existing entities to org

### F-2.1 Attach resumes to org units

| | |
|--|--|
| **Goal** | `org_unit_id` (or multiple tags) on resume; filter list/dashboard by unit. |
| **New tech / prereqs** | Backfill strategy (script); optional **Mongo aggregation** for counts per unit. |
| **Work** | Extend `FullResume` / storage; PATCH support; dashboard stat breakdown optional. |
| **Testing** | pytest for PATCH + list filter; migration test on copy of data. |
| **CI/CD** | Mock + compose jobs. |
| **Done** | HR can assign candidate pipeline to “Talent Acquisition” node. |

- [ ] **TODO F-2.1**

### F-2.2 Demo record collections (Ubuntu / Python / Roman) — strategy

| | |
|--|--|
| **Goal** | Either tag as **“Technology / Platform / examples”** org metadata, hide from prod nav, or replace with org-relevant templates. |
| **New tech / prereqs** | Feature flags or `env` (`SHOW_DEMO_COLLECTIONS`). |
| **Work** | Config-driven sidebar; doc decision in ADR. |
| **Testing** | Snapshot or env-matrix test so prod build hides demos. |
| **CI/CD** | `cfgs/.env.ci` documents default for CI. |
| **Done** | Clear story for customers vs internal demo. |

- [ ] **TODO F-2.2**

### F-2.3 Audit log enrichment

| | |
|--|--|
| **Goal** | Audit rows include `org_unit_id` / `org_path` when mutation touches scoped resources. |
| **New tech / prereqs** | None. |
| **Work** | Extend `record_audit` call sites or central wrapper. |
| **Testing** | Assert audit payload in pytest after resume/org change. |
| **CI/CD** | Existing suites. |
| **Done** | Activity panel filterable by org (UI optional in same phase or F-3). |

- [ ] **TODO F-2.3**

---

## Phase 3 — Authorization (RBAC / scoped access)

**Warning:** Largest security surface; design before coding.

### F-3.1 Role & permission model

| | |
|--|--|
| **Goal** | Roles (e.g. `org_admin`, `hr`, `employee`) + permissions (`org:read`, `resume:read`, `resume:write`, …). |
| **New tech / prereqs** | Optional **Casbin**, **oso**, or lightweight custom allow-list in Mongo (`roles` collection). |
| **Work** | Schema for roles; map JWT user → roles; store `org_unit_scopes[]`. |
| **Testing** | Table-driven pytest: allow/deny matrix; security regression tests. |
| **CI/CD** | Mandatory in `pr-checks` + compose. |
| **Done** | No endpoint returns cross-org PII without permission. |

- [ ] **TODO F-3.1**

### F-3.2 FastAPI dependencies for scoped auth

| | |
|--|--|
| **Goal** | `Depends(require_permission("resume:read", org_scope=True))` pattern. |
| **New tech / prereqs** | Same as F-3.1. |
| **Work** | Refactor routers incrementally; default-deny for new routes. |
| **Testing** | 403 tests for wrong org; token without role. |
| **CI/CD** | Fail build on coverage drop for auth module (optional). |
| **Done** | All sensitive routes use dependency. |

- [ ] **TODO F-3.2**

### F-3.3 UI guards & navigation by permission

| | |
|--|--|
| **Goal** | Hide sidebar items / actions user cannot use; friendly 403 page. |
| **New tech / prereqs** | Context from `/auth/me` extended with `roles` + `scopes`. |
| **Work** | `AuthContext` extension; conditional routes. |
| **Testing** | Vitest for guard helpers; E2E later. |
| **CI/CD** | UI build. |
| **Done** | No dead links to forbidden pages (or read-only messaging). |

- [ ] **TODO F-3.3**

---

## Phase 4 — Dynamic shell (dashboard & navigation)

### F-4.1 Config-driven sidebar & dashboard tiles

| | |
|--|--|
| **Goal** | Sidebar sections from API (`/org/nav` or feature config); dashboard widgets per role. |
| **New tech / prereqs** | Optional **JSON Schema** for nav config validation. |
| **Work** | Replace static `navItems` with fetched config + fallbacks. |
| **Testing** | API contract tests; UI story for empty config. |
| **CI/CD** | Mock + integration. |
| **Done** | [dashboard_nav_customization_readme.md](../dashboard_nav_customization_readme.md) updated. |

- [ ] **TODO F-4.1**

### F-4.2 “My teams” / scoped dashboard

| | |
|--|--|
| **Goal** | Dashboard defaults to user’s org units; global admin sees all. |
| **New tech / prereqs** | Aggregation pipelines or cached counters collection. |
| **Work** | New `GET /dashboard/stats?org_unit_id=` or server-side filter from JWT. |
| **Testing** | Integration tests with two users in different orgs. |
| **CI/CD** | Compose job with seeded users. |
| **Done** | Stats and recent lists respect scope. |

- [ ] **TODO F-4.2**

---

## Phase 5+ — Domain modules (optional epics)

Pick **one** vertical per quarter; each is a mini-product.

### F-5.1 HR / hiring workflow (beyond resume storage)

| | |
|--|--|
| **Goal** | Stages, interviews, hiring manager views tied to org units. |
| **New tech / prereqs** | State machine lib or explicit `status` + transitions; possibly **temporal** later for reminders. |
| **Work** | New collections; UI pipelines; email/webhook out of scope v1. |
| **Testing** | Transition matrix tests; RBAC from Phase 3. |
| **CI/CD** | Longer compose job; optional nightly. |
| **Done** | Single happy-path hire flow E2E. |

- [ ] **TODO F-5.1**

### F-5.2 Policy / document library per function

| | |
|--|--|
| **Goal** | Legal/Compliance docs with version, owner org unit, review dates. |
| **New tech / prereqs** | **GridFS** or S3-compatible storage if files > 16MB; virus scan in prod. |
| **Work** | Upload API, metadata collection, UI list/detail. |
| **Testing** | Upload size limits; MIME checks; permission tests. |
| **CI/CD** | Artifact storage secrets in GitHub Environments. |
| **Done** | MVP upload + list per org unit. |

- [ ] **TODO F-5.2**

### F-5.3 Directory / people (not full HRIS)

| | |
|--|--|
| **Goal** | Optional profiles: name, title, `org_unit_id`, contact (opt-in). |
| **New tech / prereqs** | Sync from IdP later (SCIM/OIDC claims)—out of scope v1. |
| **Work** | `people` or extend `users` with public fields; privacy review. |
| **Testing** | Field-level visibility tests. |
| **CI/CD** | Standard. |
| **Done** | Read-only directory for employees. |

- [ ] **TODO F-5.3**

---

## CI/CD checklist (apply per feature)

When merging any roadmap feature, tick the boxes that apply:

| Step | Where | Notes |
|------|--------|------|
| Mock pytest | [pr-checks.yml](../../.github/workflows/pr-checks.yml) | New tests under `tests/py_tests/` included in job or glob updated |
| UI build | `pr-checks.yml` | `npm run build` |
| Compose config | [cicd-build.yml](../../.github/workflows/cicd-build.yml) | `docker compose … config` still valid |
| Integration / cicd_run | `tests-ci` | New env vars in `cfgs/.env.ci` if needed |
| OpenAPI / docs | manual | `endpoints_README.md` + `/docs` |
| Security | CodeQL / dependency-review | New deps reviewed |
| Migrations | ops | Document one-off scripts in PR description |

---

## Suggested issue titles (copy-paste)

Use as GitHub issue **title**; body = table rows from this doc.

1. `[roadmap] F-0.1 OpenAPI / contract tests`
2. `[roadmap] F-0.2 Vitest + RTL smoke tests`
3. `[roadmap] F-1.1 Org unit Mongo model + seed`
4. `[roadmap] F-1.2 Org units REST API`
5. `[roadmap] F-1.3 Org browser UI`
6. `[roadmap] F-2.1 Resume ↔ org unit assignment`
7. `[roadmap] F-2.2 Demo collections strategy + feature flag`
8. `[roadmap] F-2.3 Audit log org context`
9. `[roadmap] F-3.1 Role & permission model`
10. `[roadmap] F-3.2 FastAPI scoped auth dependencies`
11. `[roadmap] F-3.3 UI permission guards`
12. `[roadmap] F-4.1 Dynamic nav & dashboard config`
13. `[roadmap] F-4.2 Scoped dashboard stats`
14. `[roadmap] F-5.1 HR hiring workflow MVP`
15. `[roadmap] F-5.2 Policy library + storage`
16. `[roadmap] F-5.3 Employee directory MVP`

---

*Last updated: roadmap folder creation — adjust phases as product direction firms.*

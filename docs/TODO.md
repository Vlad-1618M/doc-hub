# TODO — testing, lint, and automation memos

Working notes for **follow-up work** not yet in CI. Check items off here or mirror them into GitHub Issues when you start.

---

## UI unit tests

- **Stack:** Prefer **Vitest** (native Vite integration) + **React Testing Library** + **jsdom**. Matches `ui/` today without a second bundler story.
- **First targets:** Pure helpers (`src/lib/recentGlow.ts`), small hooks, and context providers with minimal wrapping; then presentational components with mocked router/auth.
- **API boundaries:** Consider **MSW** (Mock Service Worker) if tests need stable HTTP behavior without spinning the real API.
- **Scripts:** Add `npm test` / `npm run test:unit` in `ui/package.json`; keep `npm run lint` + `npm run build` as the fast gate.
- **CI:** Extend [`.github/workflows/pr-checks.yml`](../.github/workflows/pr-checks.yml) `ui` job with `npm test` (or a separate job with `if:` paths filter on `ui/**` only if runtime becomes an issue).
- **Coverage:** Turn on Vitest coverage later with a low threshold, then tighten; avoid blocking PRs on day one.

---

## Python lint (and format)

- **Tooling:** **Ruff** for lint + format is the lowest-friction choice with Python 3.13; alternative is **Black** + **Ruff** (lint only) or flake8 plugins.
- **Config:** Single `pyproject.toml` `[tool.ruff]` section (or `ruff.toml`) at repo root; align `src/` + `tests/` include/exclude with how you run pytest.
- **Rules:** Start with defaults + common extensions (`E`, `F`, `I`, `UP`); add `ANN` or `D` only if the team wants typing/docstring enforcement.
- **CI:** New step in `pr-checks` (or a small dedicated workflow): `ruff check .` and `ruff format --check .` from repo root after `pip install ruff` or dev extras.
- **Pre-commit:** Optional local hook so CI rarely fails on style-only diffs.

---

## Playwright E2E (after UI + flows stabilize)

- **When:** Add after main navigation, auth, and a couple of record flows are unlikely to churn weekly—otherwise tests become noise.
- **Scope (smoke first):** Login (or test user), dashboard load, one list → detail → back; optional single “create record” happy path if CI has seed data.
- **Environment:** Prefer **`webServer`** in `playwright.config.ts` pointing at `vite preview` + mocked API, **or** full stack via `docker compose` + `BASE_URL`—document which in [tests_readme.md](tests_readme.md).
- **Secrets:** Reuse patterns from [cfgs/.env.ci](../cfgs/.env.ci) for non-production credentials; never commit real secrets. Consider a `PLAYWRIGHT_*` prefix in `.env.ci` if the API needs a dedicated test admin secret.
- **CI placement:** Nightly workflow or `workflow_dispatch` first; promote to PR-gating only when stable and fast (target under ~10 minutes). Keeps [pr-checks](../.github/workflows/pr-checks.yml) snappy.
- **Artifacts:** On failure, upload Playwright report/trace as Actions artifacts for debugging.

---

## Other thoughts (short list)

| Idea | Note |
|------|------|
| **ESLint strictness** | Once `react-refresh/only-export-components` warnings on contexts are resolved or scoped, consider `eslint . --max-warnings 0` in CI. |
| **UI a11y** | Optional: `eslint-plugin-jsx-a11y` in `ui/eslint.config.js` when you have bandwidth for fixes. |
| **Type-aware ESLint** | `typescript-eslint` type-checked configs need `tsconfig` coverage for all linted files (e.g. `vite.config.ts`); add when the benefit outweighs config cost. |
| **Compose integration** | [Docker Compose CI](cicd_pipeline_readme.md) already runs heavy integration; E2E can complement, not duplicate, curl/pytest coverage. |
| **Dependabot / lockfiles** | Keep `ui/package-lock.json` committed; Playwright adds its own deps—pin in `package.json` like the rest. |
| **Seed data** | If E2E hits real MongoDB in Compose, document a minimal seed script or fixture API so tests don’t depend on manual DB state. |

---

## Related docs

- [tests_readme.md](tests_readme.md) — pytest, curl suites, env vars  
- [cicd_pipeline_readme.md](cicd_pipeline_readme.md) — GitHub Actions overview  
- [frontend_stack_readme.md](frontend_stack_readme.md) — `ui/` stack  
- [new_feature_roadmap/ROADMAP.md](new_feature_roadmap/ROADMAP.md) — product-phase TODOs (orthogonal to this file)

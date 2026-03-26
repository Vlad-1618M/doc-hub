# Customizing dashboard sections and app navigation

This guide explains how to **add** a new area that appears on the **Dashboard** (stat tile, recent records, activity links) and in the **sidebar**, or how to **remove** an existing one (for example Resumes or a record type such as Roman Leaders).

It also clarifies what is **not** a separate dashboard: labels like **“HR Management”** in the sidebar header or **mailto** links for HR / Test / DevOps in the footer are **static UI copy** only. Changing those does not create a new data section; see [Cosmetic-only changes](#cosmetic-only-changes-hr-test-team-etc).

---

## Concepts

| Piece | Role |
|--------|------|
| **Stat tiles** | Top row on `Dashboard.tsx`: counts + links to list routes. |
| **Recent records** | Merged list of newest items from each source (resumes + record collections). |
| **Activity** | Server **audit log** (`GET /audit/events`). Deep links depend on `resource` names matching backend conventions. |
| **WebSocket** | After mutations, API broadcasts `{"event":"refresh","collection":"<name>"}`. Dashboard refetches data when it receives that message. The `collection` string must stay **consistent** across backend and `Dashboard.tsx` (for the green flash on the matching tile). |
| **Generic “record” types** | Ubuntu / Python / Roman: share the same backend **factory** pattern (`records_endpoints.py`), UI **schemas** (`recordSchemas.ts`), and similar list/detail pages. |
| **Resumes** | Special case: own Mongo collection shape, `crud_endpoints.py`, `resumeApi.ts`, `ResumeList` / `ResumeDetail` / `AddResume`. |

Use **one internal id** everywhere you can (for example `ubuntu_releases`, `roman_leaders`). That id is the Mongo “tag”, OpenAPI tag, WebSocket `collection` value, and audit `resource` field.

---

## Add a new record-based section (recommended pattern)

Follow this order so the API exists before the UI calls it.

### 1. Backend: model and Mongo access

1. Add a **Pydantic model** for documents in `src/models/record_models.py` (or a new module if the shape is large).
2. In `db/db.py`, add `get_<your_collection>_collection()` returning `get_db_client()["<collection_name>"]`.
3. In `db/db_init.py`, add **indexes** for fields you will search/sort on (optional but recommended for production).
4. Register the router in `src/server.py`:
   - `create_records_router(...)` in `src/routes/records_endpoints.py` is the template.
   - Add an **OpenAPI tag** in `_OPENAPI_TAGS_METADATA` if you want a clean `/docs` section.

### 2. Backend: CRUD + realtime + audit

The factory in `records_endpoints.py` already:

- Exposes `GET/POST /`, `GET/PUT/DELETE /{id}` under your `prefix`.
- Calls `ws_manager.broadcast("refresh", {"collection": tag})` where **`tag` must match** the string you will use on the dashboard (e.g. `ubuntu_releases`).
- Records **audit** rows via `record_audit` with `resource=<tag>`.

If you add a **new** router with `create_records_router`, choose:

- `prefix` (URL path, e.g. `/hr-widgets`),
- `tag` (logical id, e.g. `hr_widgets`) — **this is the WebSocket and audit resource id**.

### 3. Backend: dashboard counts

In `src/routes/dashboard_endpoints.py`, add:

- A `count_documents` (or equivalent) for the new collection.
- A **new key** in the JSON response (e.g. `"hr_widgets": 42`).

Keep the key **stable**; the UI will read it by name.

### 4. Frontend: API client

In `ui/src/api/recordsApi.ts` (or a dedicated module if you prefer):

- Add `fetchXList`, `fetchXById`, and create/update/delete helpers mirroring existing record types.
- Use the same **path** as the FastAPI `prefix` (trailing slashes should match how other list calls are written).

### 5. Frontend: forms and “Add new”

1. In `ui/src/config/recordSchemas.ts`, append a **`RecordSchemaConfig`** entry (`id`, `title`, `listPath`, `addPath`, `fields`).  
   The file header already lists the usual steps.
2. In `ui/src/pages/AddRecord.tsx`, wire **`CREATE_FNS[schema.id]`** to your create API function.

### 6. Frontend: routes and pages

1. In `ui/src/App.tsx`, add **nested routes** under `/app`:
   - List: `path="your-segment"`,
   - New: `path="your-segment/new"` with `<AddRecord schemaId="your_tag" />`,
   - Detail: `path="your-segment/:id"`.
2. Implement **list** and **detail** pages (copy an existing pair such as `UbuntuReleaseList` / `UbuntuReleaseDetail` and rename fields to your model).
3. Register **TypeScript types** in `ui/src/types` if needed.

### 7. Frontend: sidebar

In `ui/src/components/Sidebar.tsx`, add an entry to **`navItems`**:

```ts
{ to: '/app/your-segment', label: 'Your label', icon: '📌' },
```

### 8. Frontend: Dashboard wiring (important)

In `ui/src/pages/Dashboard.tsx`, update **every** place that is tied to the old set of sources:

1. **`load()`** — add your `fetchXList` (and any new stats) to the `Promise.all` (or follow-up fetches) so data is loaded on mount and on WebSocket refresh.
2. **`statItems`** — add a tile: `label`, `value` from `stats?.your_key ?? localArray.length`, `to`, and `collection: 'your_tag'` (must match **`ws_manager.broadcast`** `collection`).
3. **`RecentItem` type + merge loop** — add a variant (e.g. `hr_widget`), push items with `ts` from `updated_at` / `created_at`, and **`getLink()`** for `/app/your-segment/:id`.
4. **`auditEventLink()`** — add a `case 'your_tag':` so Activity rows deep-link correctly.

If you skip step 4, the dashboard still loads, but **Activity** links for that resource may fall through to “no link”.

### 9. Tests and mocks

- **`tests/py_tests/conftest.py`**: if tests patch Mongo accessors, add `get_<your>_collection` → same `mock_db` bucket as other collections.
- Add or extend pytest tests for list/create and, if you rely on it, **`GET /dashboard/stats`** including the new key.

### 10. Deploy / database

- New collections appear in Mongo when **first written**; run **`db_init`** (or your migration process) so **indexes** exist in each environment.

---

## Add a section similar to Resumes (non-generic)

Resumes do **not** use `AddRecord` / `RECORD_SCHEMAS`. To add another “big” document type like resumes:

1. Define **Pydantic** models in `src/models/base_models.py` (or a new file).
2. Add a **router** under `src/routes/` with its own prefix; mount it in `src/server.py`.
3. Use **`ws_manager.broadcast("refresh", {"collection": "..."})`** with a **new** collection name (e.g. `policies`).
4. Extend **`dashboard_endpoints.py`** with a count for that collection.
5. Add **`record_audit`** on create/update/delete (see `crud_endpoints.py`).
6. Build **dedicated** UI: `*Api.ts`, list/detail/add pages, `App.tsx` routes, **Sidebar**, and **Dashboard** sections as in the record checklist (stats, recent, `auditEventLink`).

This is more work than cloning the **records factory**; prefer the factory when documents are **flat** and CRUD-shaped like Ubuntu/Python/Roman.

---

## Remove an existing section (e.g. Resumes or Roman Leaders)

Work **backwards** from the UI to the API, and decide what to do with **data** in Mongo.

### 0. Data and product decision

- **Drop data**: remove documents from the Mongo collection (or drop the collection) when safe.
- **Keep data, hide UI**: stop linking from the app but leave the API (not usually desirable long term).

### 1. Frontend

1. **`Sidebar.tsx`** — remove the `navItems` entry.
2. **`App.tsx`** — remove `Route`s for list/new/detail (and imports).
3. **`Dashboard.tsx`** — remove:
   - fetches from `load()`,
   - `useState` for that dataset,
   - `statItems` entry,
   - `RecentItem` branch and `getLink` case,
   - `auditEventLink` case for that `resource`.
4. Delete or orphan **pages** and **API** modules if nothing else imports them.
5. **`recordSchemas.ts` / `AddRecord.tsx` / `recordsApi.ts`** — remove entries for that type if it was generic.

### 2. Backend

1. **`server.py`** — `app.include_router(...)` remove the router (or stop exporting it).
2. **`dashboard_endpoints.py`** — remove the count and response key.
3. **`records_endpoints.py` or `crud_endpoints.py`** — remove routes or the factory instance.
4. **`db/db.py`** — remove collection getter (after nothing imports it).
5. **`audit_service` / audit UI** — old audit rows may still reference `resource` you removed; that is fine (links simply won’t resolve unless you keep `auditEventLink` mapping or migrate audit data).

### 3. WebSocket contract

- Nothing to delete globally: simply **stop broadcasting** that `collection` when the routes are gone.

### 4. Tests

- Remove or adjust tests that hit the deleted paths.
- Update **`conftest.py`** mocks if the collection helper is removed.

---

## Cosmetic-only changes (“HR”, “Test team”, etc.)

These **do not** add or remove dashboard data:

| Location | What to change |
|----------|----------------|
| `Sidebar.tsx` | Subtitle under the logo (e.g. “HR Management”) — edit the static text. |
| `Sidebar.tsx` (footer) | `mailto:hr@...`, `test@...` — edit `href` or labels. |
| `Landing.tsx` / marketing copy | Same idea: static text and links. |

To make “HR” or “Test team” a **real** section with its own lists and counts, follow **[Add a new record-based section](#add-a-new-record-based-section-recommended-pattern)** (or the resume-like path).

---

## Quick reference: strings that must align

When you add a generic record type, keep these **in sync**:

| Layer | Example |
|--------|---------|
| FastAPI `create_records_router(..., tag="roman_leaders")` | `roman_leaders` |
| `ws_manager.broadcast(..., {"collection": "roman_leaders"})` | same |
| Audit `record_audit(..., resource="roman_leaders", ...)` | same |
| Dashboard `statItems[].collection` | same |
| Dashboard `auditEventLink` `case` | same |
| `RECORD_SCHEMAS[].id` | same (underscore style) |

URL segments (e.g. `/app/roman-leaders`) can differ from the tag; just keep **routes and `listPath` / `to`** consistent.

---

## Related docs

- [endpoints_README.md](endpoints_README.md) — API and OpenAPI.
- [websocket_realtime_readme.md](websocket_realtime_readme.md) — dashboard refetch behavior.
- [frontend_stack_readme.md](frontend_stack_readme.md) — `ui/` layout and Vite proxy.

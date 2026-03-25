# Doc Portal — React UI (Doc Hub)

A React SPA for the **Doc Hub** FastAPI backend: internal records, **resumes**, release-style **record** collections, and API keys. Designed for authenticated staff to search, view, and manage data from the browser.

## What's Included

- **Login / Register** — Create account, sign in with email + password (JWT)
- **Dashboard** — Overview stats and recent candidates
- **Resumes** — Searchable list with filter, table view
- **Resume Detail** — Full profile view (summary, experience, education, contact)
- **API Keys** — Manage API keys for programmatic access

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **React Router** for navigation

---

## Run Options

### Option 1: Docker — quick start (recommended)

From project root, with `cfgs/.env` present:

```bash
./build/sh_scripts/start.sh
```

Opens Doc Portal at **http://localhost:3000**.

### Option 2: Docker (full compose)

From project root:

```bash
docker compose -f build/docker-compose.yml up -d doc-hub-mongo doc-hub-api doc-hub-ui
```

Open **http://localhost:3000** — the UI is served by nginx and proxies API calls to FastAPI.

Port can be changed via `UI_PORT` in `cfgs/.env` (default 3000).

### Option 3: Local development

**1. Start the backend** (Docker or local):

```bash
# Docker:
docker compose -f build/docker-compose.yml up -d doc-hub-mongo doc-hub-api

# Or local uvicorn (MongoDB must be running):
uvicorn server:app --reload
```

**2. Start the UI dev server:**

```bash
cd ui
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite proxy forwards `/auth` and `/resume` to the FastAPI server.

---

## Build for Production

```bash
npm run build
```

Output in `dist/`. The Docker build uses this and serves via nginx.

---

## Design Notes

- **Typography:** DM Sans (body), Outfit (headings)
- **Accent:** Primary blue (`#0c8ee7`)
- **Layout:** Sidebar navigation, header with search, scrollable content area

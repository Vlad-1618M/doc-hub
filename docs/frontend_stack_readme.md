# Frontend Stack: Vite & React

This document describes the frontend build and UI stack for Doc Portal.

---

## Vite

**Role:** Build tool and development server

### What Vite Does

| Responsibility | Description |
|----------------|-------------|
| **Dev server** | Runs `npm run dev` → serves app at `http://localhost:5173` (or configured port) |
| **Bundling** | Compiles TypeScript, JSX, CSS; bundles modules with Rollup (production) |
| **Static assets** | Files in `ui/public/` are served at root (e.g. `/favicon.svg`) |
| **Proxy** | In dev, forwards `/api` (strip prefix), `/auth`, `/resume`, `/ubuntu-releases`, `/python-releases`, `/roman-leaders`, `/docs`, `/redoc`, `/openapi.json`, `/ws` → FastAPI (`http://localhost:8000`) — see `ui/vite.config.ts` |
| **HMR** | Hot Module Replacement — edits reflect without full page reload |
| **Build** | `npm run build` → outputs to `dist/` (HTML, JS, CSS) |

### Key Config (`ui/vite.config.ts`)

```ts
server: {
  proxy: {
    '/auth': { target: 'http://localhost:8000', changeOrigin: true },
    '/resume': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
```

Requests to `/auth/login` or `/resume/?skip=0&limit=25` go to the FastAPI backend during development.

### Public Folder

Files in `ui/public/` are copied to the build output and served as-is:

- `favicon.svg` → `/favicon.svg` (browser tab icon)

---

## React

**Role:** UI library and application framework

### What React Does

| Responsibility | Description |
|----------------|-------------|
| **Components** | Renders UI (Landing, Dashboard, Login, ResumeList, etc.) |
| **State** | Manages user/auth, loading, error, pagination |
| **Routing** | React Router for `/`, `/login`, `/app`, `/app/resumes`, etc. |
| **API calls** | `fetch()` to `/auth` and `/resume` with JWT in `Authorization` header |
| **Interactivity** | Forms, search, pagination, navigation |

### Key Modules

| Module | Purpose |
|--------|---------|
| `App.tsx` | Route definitions, `AuthProvider` |
| `AuthContext.tsx` | Login, register, logout; stores JWT and user in state/localStorage |
| `resumeApi.ts` | `fetchResumeList()`, `fetchResumeById()` — calls backend with token |
| `ProtectedRoute` | Redirects unauthenticated users to `/login` |
| `Layout` | Sidebar + Header + main content area for `/app` |

### Data Flow

```
User action → Component state/effect → fetch(API, { Authorization: Bearer <token> })
    → FastAPI → MongoDB → JSON response → setState → re-render
```

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────────────────────┐
│  npm run dev                                                            │
└─────────────────────────────────────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────┐     loads      ┌─────────────────┐
 │ Vite dev server │ ─────────────► │  index.html     │
 │  (port 5173)    │                │  <script src=   │
 │                 │                │  /src/main.tsx> │
 └───────┬─────────┘                └────────┬────────┘
         │                                   │
         │  proxies /auth, /resume           │  entry point
         │  to FastAPI:8000                  │
         │                                   ▼
         │                         ┌─────────────────┐
         │                         │  main.tsx       │
         │                         │  ReactDOM.render│
         └──────────────────────── │  <App />        │
                                   └────────┬────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │  React app      │
                                   │  Routes, pages, │
                                   │  API calls      │
                                   └─────────────────┘
```

- **Vite** serves the app and proxies API requests.
- **React** powers the UI and talks to the backend via `fetch`.

---

## Production Build

1. `npm run build` (Vite) → `ui/dist/` with `index.html`, JS bundles, CSS, `favicon.svg`
2. `ui.Dockerfile` copies `dist/` into nginx image
3. nginx serves static files and proxies `/auth` and `/resume` to FastAPI
4. No Vite in production — only the built static output

---

## File Structure (Relevant to This Stack)

```
ui/
├── public/
│   └── favicon.svg          # Served by Vite at /favicon.svg
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Routes, AuthProvider
│   ├── api/
│   │   └── resumeApi.ts     # API client
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state
│   ├── components/          # Layout, Sidebar, Header, etc.
│   ├── pages/               # Landing, Dashboard, ResumeList, etc.
│   └── types.ts
├── index.html               # Loads main.tsx
└── vite.config.ts           # Proxy, build config
```

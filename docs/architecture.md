# Doc Hub / Doc Portal — Architecture

## Overview

**Doc Hub** is the repository and platform; **Doc Portal** is the React UI. Together they provide internal records, **resumes**, and extra **record** collections (Ubuntu / Python / Roman datasets), backed by FastAPI and MongoDB.

---

## Architecture Diagram

### Mermaid (renders in GitHub, VS Code, etc.)

```mermaid
flowchart TB
    subgraph User["User / Browser"]
        Browser[HTTP Request]
    end

    subgraph Frontend["Frontend"]
        Nginx[nginx / Vite dev server]
        React[React SPA]
        Nginx --> React
    end

    subgraph Backend["FastAPI"]
        Auth[/auth/*]
        CRUD[/resume/*]
        Rec["/ubuntu-releases, /python-releases, /roman-leaders"]
        Dash[/dashboard/*]
    end

    subgraph DB["MongoDB"]
        ResumeDB[(resume_db)]
        AuthDB[(resume_auth)]
    end

    Browser --> Nginx
    Nginx --> Auth
    Nginx --> CRUD
    Nginx --> Rec
    Nginx --> Dash
    Auth --> AuthDB
    CRUD --> ResumeDB
    Rec --> ResumeDB
    Dash --> ResumeDB
```

### ASCII Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER / BROWSER                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            │ HTTP (HTTPS in prod)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  nginx (prod) / Vite dev server (dev)                                            │   │
│  │  • Serves static: index.html, JS, CSS, favicon.svg                               │   │
│  │  • Proxies /auth, /resume, record paths, /docs, /redoc, /openapi.json, /ws → API │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                            │                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  React SPA                                                                       │   │
│  │  • Routes: / (Landing), /login, /register, /app/* (Dashboard, Resumes, API Keys) │   │
│  │  • AuthContext (JWT in localStorage)                                             │   │
│  │  • resumeApi.ts → fetch /resume/ with Bearer token                               │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                         /auth/*, /resume/*   (JSON, Bearer JWT or X-API-Key)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  auth_endpoints.py                                                               │   │
│  │  • POST /auth/register, /auth/login → JWT                                        │   │
│  │  • POST /auth/generate-api-key → API key (X-Admin-Secret)                        │   │
│  │  • validate_api_key_or_jwt → Bearer JWT or X-API-Key                             │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  crud_endpoints.py                                                               │   │
│  │  • GET /resume/ (paginated, search q)                                            │   │
│  │  • GET /resume/{id}, POST /resume/, PUT /resume/{id}, PATCH, DELETE              │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                    pymongo   (MongoDB driver)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONGODB                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐                                     │
│  │  resume_db           │  │  resume_auth         │                                     │
│  │  • resume            │  │  • users             │                                     │
│  │  • api_keys          │  │                      │                                     │
│  │  • ubuntu_releases   │  │                      │                                     │
│  │  • python_releases   │  │                      │                                     │
│  │  • roman_leaders     │  │                      │                                     │
│  │  Indexes:            │  │Index: email (unique) │                                     │
│  │  • resume.name.*     │  └──────────────────────┘                                     │
│  │  • resume.job_title  │                                                               │
│  └──────────────────────┘                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Summary

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | React + Vite | Doc Portal SPA: auth, resumes, records, API keys |
| **API** | FastAPI | REST endpoints, JWT + API key auth, validation |
| **Database** | MongoDB | Documents (resumes, users, api_keys) |
| **Proxy** | nginx / Vite | Serve static assets, proxy API in prod/dev |

---

## Request Flow Examples

### Login
1. User submits email/password on `/login`
2. React → `POST /auth/login` → FastAPI
3. FastAPI validates against `resume_auth.users`, returns JWT
4. React stores JWT in localStorage, redirects to `/app`

### List Resumes
1. User opens `/app/resumes`
2. React → `GET /resume/?skip=0&limit=25&q=...` with `Authorization: Bearer <jwt>`
3. FastAPI validates JWT or X-API-Key → MongoDB query with pagination/search
4. React renders table with Previous/Next

### Programmatic API (curl, scripts)
1. Obtain API key via `POST /auth/generate-api-key` (send `X-Admin-Secret` when `ADMIN_SECRET` is configured)
2. `GET /resume/` with `X-API-Key: <key>`
3. Same FastAPI/MongoDB path as web UI

---

## Docker Deployment

```
doc-hub-mongo ──────► doc-hub-api ──────► doc-hub-ui (nginx + built SPA)
     │                      │
     └──────────────────────┼─────────────► mongo-express-ui
                            │
                            └─────────────► tests-ci, tests-manual
```

See [dev_setup_readme.md](./dev_setup_readme.md) for setup details.

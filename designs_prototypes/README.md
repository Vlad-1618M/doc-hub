# Designs & Prototypes

HTML POCs for the **Doc Portal** home page and UI concepts. Open in a browser — no build step.

## Files

### Home page (no sidebar)
| File | Description |
|------|-------------|
| **index.html** | Dark theme — slate/cyan, grid background |
| **theme-terracotta.html** | Terracotta theme — amber/orange, serif titles |
| **theme-light.html** | Light theme — sky blue, Inter font |

### Sidebar + hamburger variants
| File | Description |
|------|-------------|
| **sidebar-v1.html** | Dark, slim sidebar (220px → 56px collapsed) |
| **sidebar-v2.html** | Terracotta, wider sidebar (260px → 64px collapsed) |
| **sidebar-v3.html** | Light, icon-first (72px → 200px expanded) |

### Dashboard variants
| File | Description |
|------|-------------|
| **dashboard-v1.html** | Dark theme — stats cards, recent records, activity feed |
| **dashboard-v2.html** | Light theme — welcome banner, tile cards, quick actions, mini table |
| **dashboard-v3.html** | Compact / Terracotta — slim sidebar, inline stats, quick row, compact table |

### Create account variants
| File | Description |
|------|-------------|
| **register.html** | Default — Terracotta theme (same as register-v3) |
| **register-v1.html** | Dark theme — DM Sans, slate/cyan, centered card form |
| **register-v2.html** | Light theme — Inter, sky blue, clean minimal layout |
| **register-v3.html** | Terracotta theme — Source Serif + IBM Plex Sans, amber/orange |

### Data retrieval maps (different layouts)
| File | Description |
|------|-------------|
| **retrieval-map.html** | Vertical — 7 flows (GET, POST, PUT, PATCH, DELETE, search), dynamic grid `minmax(200px,1fr)`, Request/Response labels |
| **retrieval-map-horizontal.html** | Horizontal pipeline — left→right request, right→left response |
| **retrieval-map-sequence.html** | Sequence diagram — swimlanes (User\|UI\|API\|DB), message lines |
| **retrieval-map-pills.html** | Compact pills — minimal horizontal badges, req/res rows |

### Other
| File | Description |
|------|-------------|
| **flow-animated.html** | Standalone animated data flow diagram |

## Preview

From project root:

```bash
open designs_prototypes/index.html
# or
python3 -m http.server 3333
# then open http://localhost:3333/designs_prototypes/
```

## Footer contact links

All pages include: Contact dev team, Contact admin, DevOps team, HR, Test team, Management (mailto placeholders).

## Home Page Contents (all themes)

- **Hero** — App name and tagline
- **Purpose** — HR, employee records, team data (Research, Tests, IT, Marketing), work logs, internal document servers
- **Data flow** — Step-by-step diagram with descriptions:
  - Step 1: User (Browser) — Submits login/form over HTTPS
  - Step 2: React UI — Renders SPA, proxies /auth & /resume
  - Step 3: FastAPI — JWT auth, validation, CRUD
  - Step 4: MongoDB — Stores users, resumes, api_keys
- **Auth** — Tabbed dialog: Sign in | Create account

## Themes

- **Dark** — Professional, dev-friendly
- **Terracotta** — Friendly, org/HR feel
- **Light** — Clean, minimal

#!/usr/bin/env python

import traceback
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.crud_endpoints import router as resume_router
from routes.records_endpoints import ubuntu_router, python_router, roman_router
from routes.dashboard_endpoints import router as dashboard_router
from routes.audit_endpoints import router as audit_router
from auth.auth_endpoints import router as auth_router
from websocket_manager import manager as ws_manager

_OPENAPI_TAGS_METADATA = [
    {"name": "auth", "description": "Accounts, JWT login, API keys, user admin."},
    {"name": "dashboard", "description": "Aggregated collection counts for the Doc Portal dashboard."},
    {"name": "resume", "description": "Resume CRUD, health, bulk and partial updates."},
    {
        "name": "ubuntu_releases",
        "description": "Ubuntu release records (version, codename, LTS, EOL).",
    },
    {
        "name": "python_releases",
        "description": "Python version release records.",
    },
    {"name": "roman_leaders", "description": "Roman / Byzantine leader records."},
    {"name": "audit", "description": "Append-only activity log for the dashboard (mutations and account events)."},
]

app = FastAPI(
    title="Doc Hub API",
    summary="Internal records, resumes, and document hub backend.",
    description=(
        "FastAPI service for **Doc Hub** / **Doc Portal**: JWT and API-key auth, resume CRUD, "
        "record collections (Ubuntu / Python / Roman), dashboard stats, and dashboard WebSocket. "
        "Use **`/docs`** (Swagger) or **`/redoc`** for interactive exploration; **`/openapi.json`** "
        "is the machine-readable OpenAPI 3 schema for codegen and tooling."
    ),
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=_OPENAPI_TAGS_METADATA,
    license_info={"name": "MIT", "identifier": "MIT"},
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log full traceback; return generic message to client."""
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:80", "http://127.0.0.1:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(resume_router)
app.include_router(ubuntu_router)
app.include_router(python_router)
app.include_router(roman_router)


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """WebSocket for real-time dashboard updates. Broadcasts when data changes."""
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/", summary="API Root", response_description="Welcome message")
async def root():
    return {"message": "Welcome to the Doc Hub API"}


if __name__ == "__main__":
    pass

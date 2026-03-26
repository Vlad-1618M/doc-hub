"""Audit log API and mutation-side inserts."""

import os
import sys

from fastapi.testclient import TestClient

_sys_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if _sys_path not in sys.path:
    sys.path.insert(0, _sys_path)
_src = os.path.join(_sys_path, "src")
if _src not in sys.path:
    sys.path.insert(0, _src)

from src.server import app

client = TestClient(app)


def test_audit_events_empty_initially(api_mock_headers):
    r = client.get("/audit/events", headers=api_mock_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_audit_events_after_resume_create(api_mock_headers, mock_payload):
    c = client.post("/resume/", json=mock_payload, headers=api_mock_headers)
    assert c.status_code == 200
    rid = c.json()["id"]
    r = client.get("/audit/events", headers=api_mock_headers)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 1
    top = rows[0]
    assert top["action"] == "create"
    assert top["resource"] == "resume"
    assert top["resource_id"] == rid
    assert "Resume created" in top["summary"]
    assert "at" in top and top["id"]


def test_audit_events_require_auth():
    r = client.get("/audit/events")
    assert r.status_code == 403

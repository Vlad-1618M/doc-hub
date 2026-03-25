#!/usr/bin/env python
"""
True-endpoint CRUD cycle tests for ubuntu_releases, python_releases, roman_leaders.
Requires running FastAPI server and MongoDB. Uses X-API-Key from /tmp/api_key.txt.
"""

import os
import sys
import json
import pytest
import requests
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")


def _data_dir():
    """Resolve data_sets path: /dbapp (container) or project root."""
    for base in [Path("/dbapp"), Path(__file__).resolve().parent.parent.parent]:
        p = base / "tests" / "data_sets"
        if p.exists():
            return p
    return Path(__file__).resolve().parent.parent.parent / "tests" / "data_sets"


def load_record_data(subdir: str):
    """Load JSON files from tests/data_sets/{subdir}/. Returns (name, payload) tuples."""
    data_dir = _data_dir() / subdir
    if not data_dir.exists():
        return []
    records = []
    for f in data_dir.glob("*.json"):
        try:
            with f.open("r", encoding="utf-8") as fp:
                records.append((f.stem, json.load(fp)))
        except (json.JSONDecodeError, OSError):
            continue
    return records


ubuntu_params = load_record_data("ubuntu_releases")
python_params = load_record_data("python_releases")
roman_params = load_record_data("roman_leaders")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_true_headers():
    key_file = Path("/tmp/api_key.txt")
    if key_file.exists():
        with key_file.open("r", encoding="utf-8") as f:
            api_key = f.read().strip()
    else:
        api_key = os.getenv("API_KEY", "testkey")
    return {"X-API-Key": api_key}


@pytest.fixture(autouse=True)
def debug_delay():
    yield
    import time
    time.sleep(0.05)


# --- Ubuntu Releases ---
@pytest.mark.parametrize(
    "name,payload",
    ubuntu_params[:5] or [("_skip", {})],
    ids=[p[0] for p in (ubuntu_params[:5] or [("_skip", {})])],
)
def test_crud_cycle_ubuntu(base_url, api_true_headers, name, payload):
    if name == "_skip":
        pytest.skip("No ubuntu_releases data")
    prefix = "/ubuntu-releases"
    create_resp = requests.post(f"{base_url}{prefix}/", json=payload, headers=api_true_headers)
    assert create_resp.status_code == 200, f"Create failed for {name}: {create_resp.text}"
    rid = create_resp.json().get("id")
    assert rid, f"No id for {name}"

    get_resp = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert get_resp.status_code == 200, f"Get failed for {name}"
    assert get_resp.json()["version"] == payload["version"]
    assert get_resp.json()["codename"] == payload["codename"]

    upd = payload.copy()
    upd["summary"] = f"Updated for {name}"
    put_resp = requests.put(f"{base_url}{prefix}/{rid}", json=upd, headers=api_true_headers)
    assert put_resp.status_code == 200, f"Update failed for {name}"

    get2 = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert get2.json()["summary"] == f"Updated for {name}"

    del_resp = requests.delete(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert del_resp.status_code == 200, f"Delete failed for {name}"

    confirm = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert confirm.status_code == 404, f"{name} still exists"


# --- Python Releases ---
@pytest.mark.parametrize(
    "name,payload",
    python_params[:5] or [("_skip", {})],
    ids=[p[0] for p in (python_params[:5] or [("_skip", {})])],
)
def test_crud_cycle_python(base_url, api_true_headers, name, payload):
    if name == "_skip":
        pytest.skip("No python_releases data")
    prefix = "/python-releases"
    create_resp = requests.post(f"{base_url}{prefix}/", json=payload, headers=api_true_headers)
    assert create_resp.status_code == 200, f"Create failed for {name}: {create_resp.text}"
    rid = create_resp.json().get("id")
    assert rid, f"No id for {name}"

    get_resp = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert get_resp.status_code == 200, f"Get failed for {name}"
    assert get_resp.json()["version"] == payload["version"]

    upd = payload.copy()
    upd["summary"] = f"Updated for {name}"
    put_resp = requests.put(f"{base_url}{prefix}/{rid}", json=upd, headers=api_true_headers)
    assert put_resp.status_code == 200, f"Update failed for {name}"

    del_resp = requests.delete(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert del_resp.status_code == 200, f"Delete failed for {name}"

    confirm = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert confirm.status_code == 404, f"{name} still exists"


# --- Roman Leaders ---
@pytest.mark.parametrize(
    "name,payload",
    roman_params[:5] or [("_skip", {})],
    ids=[p[0] for p in (roman_params[:5] or [("_skip", {})])],
)
def test_crud_cycle_roman(base_url, api_true_headers, name, payload):
    if name == "_skip":
        pytest.skip("No roman_leaders data")
    prefix = "/roman-leaders"
    create_resp = requests.post(f"{base_url}{prefix}/", json=payload, headers=api_true_headers)
    assert create_resp.status_code == 200, f"Create failed for {name}: {create_resp.text}"
    rid = create_resp.json().get("id")
    assert rid, f"No id for {name}"

    get_resp = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert get_resp.status_code == 200, f"Get failed for {name}"
    assert get_resp.json()["name"] == payload["name"]

    upd = payload.copy()
    upd["summary"] = f"Updated for {name}"
    put_resp = requests.put(f"{base_url}{prefix}/{rid}", json=upd, headers=api_true_headers)
    assert put_resp.status_code == 200, f"Update failed for {name}"

    del_resp = requests.delete(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert del_resp.status_code == 200, f"Delete failed for {name}"

    confirm = requests.get(f"{base_url}{prefix}/{rid}", headers=api_true_headers)
    assert confirm.status_code == 404, f"{name} still exists"

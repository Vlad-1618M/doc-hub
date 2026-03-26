#!/usr/bin/env python
"""
==================================================================================================
Mocked PyTests: conftest.py
- This file sets up fixtures for pytest, including overriding the real MongoDB connection with an
  in-memory mongomock instance. This way, your tests run in a stable, controlled environment.
- It also instantiates the FastAPI TestClient and provides common fixtures (e.g. a sample payload,
  created_resume) for use in your endpoint tests.
  
Author    : 
Date      : 2025-03-04
Version   : 1.0
Contact   : @gmail.com
==================================================================================================
"""

import os
import sys
import json
import pytest
import mongomock
from time import sleep
from pathlib import Path
from functools import wraps
from fastapi.testclient import TestClient

# ... application modules import:
_proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
_src_dir = os.path.join(_proj_root, 'src')
for p in (_proj_root, _src_dir):
    if p not in sys.path:
        sys.path.insert(0, p)
from src.server import app
from db import db as real_db

# BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")
# @pytest.fixture(scope="session")
# def base_url():
#     return BASE_URL


# ... shared mock client/db for all collections:
def _make_mock_collections():
    mock_client = mongomock.MongoClient()
    mock_db = mock_client['test_db']
    fake_api_keys = mock_db['api_keys']
    fake_api_keys.insert_one({"key": "testkey"})
    return mock_db


# ... override all collections to use mongomock (single shared db):
@pytest.fixture(autouse=True)
def override_all_collections(monkeypatch):
    mock_db = _make_mock_collections()
    monkeypatch.setattr(real_db, "db_collections", lambda: mock_db["resume"])
    monkeypatch.setattr(real_db, "get_api_keys_collection", lambda: mock_db['api_keys'])
    monkeypatch.setattr(real_db, "get_ubuntu_releases_collection", lambda: mock_db['ubuntu_releases'])
    monkeypatch.setattr(real_db, "get_python_releases_collection", lambda: mock_db['python_releases'])
    monkeypatch.setattr(real_db, "get_roman_leaders_collection", lambda: mock_db['roman_leaders'])
    monkeypatch.setattr(real_db, "get_audit_events_collection", lambda: mock_db['audit_events'])

client = TestClient(app)

# ... fixed API key and headers for testing:
API_KEY = "testkey"
HEADERS = {"X-API-Key": API_KEY}

# ... a resume payload example for mock tests:
@pytest.fixture(scope="session")
def mock_payload():
    return {
        "resume": {
            "name": {"first_name": "Mock", "last_name": "Test"},
            "location": {
                "address": {
                    "country": "USA",
                    "state": "CA",
                    "city": "San Francisco",
                    "zip_code": "94105",
                    "timezone": "PST"
                }
            },
            "contact": {"email": "mock.test.user@example.com", "phone": "+1-415-123-4567"},
            "job_title": {"position": "Developer", "role": "Software Engineer"},
            "summary": "Test resume summary.",
            "skills": {"Python": {"Expert": True}},
            "Programming_Languages": {},
            "Automation": {},
            "Testing": {},
            "Development_Tools": {},
            "Web_Technologies": {},
            "Build_Tools": {},
            "DevOps": {},
            "Microservices": {},
            "Databases": {},
            "Version_Control": {},
            "OS_Architecture": {},
            "Virtualization_Compute": {},
            "Network_Protocols": {},
            "Management_Tools": {}
        },
        "Work_Experience": [
            {
                "org_name": "Test Org",
                "location": "Test City",
                "employment_length": "2020-2021",
                "role": "Engineer",
                "job_description": "Did engineering work."
            }
        ],
        "education": {
            "degree": "BSc",
            "location": "Test University",
            "majored_in": "Computer Science"
        },
        "work_authorization": "US Citizen",
        "reference": {},
        "links": {},
        "notes": "Test notes."
    }

# ... fixture | create resume | clean up after:
@pytest.fixture
def created_resume(mock_payload):
    response = client.post("/resume/", json=mock_payload, headers=HEADERS)
    assert response.status_code == 200, f"Create failed: {response.text}"
    data = response.json()
    resume_id = data.get("id")
    yield resume_id
    client.delete(f"/resume/{resume_id}", headers=HEADERS)

# ... expose client, API key and payload as fixtures:
@pytest.fixture
def test_client():
    return client

@pytest.fixture(scope="session")
def api_mock_headers():
    return {"X-API-Key": "testkey"}

# ... dummy_payload --> returns the actual payload dictionary:
@pytest.fixture(scope="session")
def dummy_payload(mock_payload):
    return mock_payload

def _data_sets_path():
    """Resolve data_sets path: container /dbapp or local project root."""
    for base in [Path("/dbapp"), Path(__file__).resolve().parent.parent.parent]:
        p = base / "tests" / "data_sets"
        if p.exists():
            return p
    return Path(__file__).resolve().parent.parent.parent / "tests" / "data_sets"


@pytest.fixture(scope="session")
def get_mocked_json():
    data_sets = _data_sets_path()
    json_file = data_sets / "resumes" / "Abraham_Lincoln.json"
    if not json_file.exists():
        json_file = next((data_sets / "resumes").glob("*.json"), None)
    if not json_file:
        pytest.skip("No resume JSON found in tests/data_sets/resumes/")
    with json_file.open("r", encoding="utf-8") as mock_json:
        return json.load(mock_json)


# --- Record payload fixtures for ubuntu, python, roman ---
@pytest.fixture(scope="session")
def ubuntu_release_payload():
    return {
        "version": "9.10",
        "codename": "Karmic Koala",
        "release_date": "2009-10-29",
        "support_type": "Interim",
        "eol_date": "2011-04-30",
        "summary": "Ubuntu 9.10 (Karmic Koala) test summary.",
        "notes": "Test notes.",
    }


@pytest.fixture(scope="session")
def python_release_payload():
    return {
        "version": "3.12",
        "release_date": "2023-10-02",
        "eol_date": "2028-10-31",
        "status": "security",
        "summary": "Python 3.12 test summary.",
        "notes": "Test notes.",
    }


@pytest.fixture(scope="session")
def roman_leader_payload():
    return {
        "name": "Augustus",
        "title": "Princeps",
        "reign_start": "27 BC",
        "reign_end": "14 AD",
        "dynasty": "Julio-Claudian",
        "summary": "First Roman emperor.",
        "notes": "Test notes.",
    }


@pytest.fixture
def created_ubuntu_release(ubuntu_release_payload, api_mock_headers):
    r = client.post("/ubuntu-releases/", json=ubuntu_release_payload, headers=api_mock_headers)
    assert r.status_code == 200, f"Create ubuntu failed: {r.text}"
    rid = r.json().get("id")
    yield rid
    if rid:
        client.delete(f"/ubuntu-releases/{rid}", headers=api_mock_headers)


@pytest.fixture
def created_python_release(python_release_payload, api_mock_headers):
    r = client.post("/python-releases/", json=python_release_payload, headers=api_mock_headers)
    assert r.status_code == 200, f"Create python failed: {r.text}"
    rid = r.json().get("id")
    yield rid
    if rid:
        client.delete(f"/python-releases/{rid}", headers=api_mock_headers)


@pytest.fixture
def created_roman_leader(roman_leader_payload, api_mock_headers):
    r = client.post("/roman-leaders/", json=roman_leader_payload, headers=api_mock_headers)
    assert r.status_code == 200, f"Create roman failed: {r.text}"
    rid = r.json().get("id")
    yield rid
    if rid:
        client.delete(f"/roman-leaders/{rid}", headers=api_mock_headers)

@pytest.fixture
def tag_id(request):
    tag = getattr(request, "param", {})
    tag.setdefault("test_name", request.node.name)
    return tag

@pytest.fixture(scope="session")
def api_true_headers():
    key_file = Path("/tmp/api_key.txt")
    if key_file.exists():
        with key_file.open("r", encoding="utf-8") as f:
            api_key = f.read().strip()
    else:
        # Optionally, trigger a request to obtain a new key here.
        api_key = "testkey"
    return {"X-API-Key": api_key}


@pytest.fixture(autouse=True)
def debug_delay_between_tests():
    yield
    sleep(0.07)
    # sleep(1)

# @pytest.fixture(autouse=True)
def run_benchmark(test_name):
    def decorator(func):
        @wraps(func)
        @pytest.mark.benchmark(group=test_name)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator


if __name__ == "__main__":
    pass
    # [print(_) for _ in get_mocked_json().items()]
    # [print(f'count:\t --> {_indx}, file name:\t --> {name}', end="\n\n") for _indx, name in enumerate(load_all_resume_data(), start=1)]

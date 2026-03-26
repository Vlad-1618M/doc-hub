#!/usr/bin/env python
"""
Pytest User Create Suite

Runs user creation and validation tests. Requires live API.
Default: 100 users. Override with pytest -k or USER_CREATE_COUNT env.
"""

import os
import sys
import pytest
import requests
from pathlib import Path

_proj = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_proj))
sys.path.insert(0, str(_proj / "src"))

BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")
USER_COUNT = int(os.getenv("USER_CREATE_COUNT", "20"))  # Lower default for pytest


def make_user(i: int) -> tuple[str, str, str]:
    base = f"pytestuser{i:04d}"
    return f"{base}@usercreate.example.com", f"Pytest User {i}", "TestPass123!"


@pytest.fixture(scope="module")
def base_url():
    return BASE_URL


@pytest.fixture(scope="module")
def created_users(base_url):
    """Create USER_COUNT users with API keys. Yields list of (user_id, email, api_key)."""
    users = []
    for i in range(USER_COUNT):
        email, name, password = make_user(i)
        r = requests.post(f"{base_url}/auth/register", json={"email": email, "password": password, "name": name})
        assert r.status_code == 200, f"Register failed: {r.text}"
        user_id = r.json()["user"]["id"]
        token = r.json()["access_token"]
        kr = requests.post(f"{base_url}/auth/generate-api-key", headers={"Authorization": f"Bearer {token}"})
        assert kr.status_code == 200, f"Generate key failed: {kr.text}"
        api_key = kr.json()["api_key"]
        users.append((user_id, email, api_key, token))
    yield users
    # Teardown: delete users
    for uid, email, _, token in users:
        try:
            requests.delete(f"{base_url}/auth/users/{uid}", headers={"Authorization": f"Bearer {token}"})
        except Exception:
            pass


def test_user_count(created_users):
    """Verify we created the expected number of users."""
    assert len(created_users) == USER_COUNT


def test_user_with_key_works(base_url, created_users):
    """User + API key must allow access to /auth/me and return correct user_id."""
    uid, email, api_key, _ = created_users[0]
    r = requests.get(f"{base_url}/auth/me", headers={"X-API-Key": api_key})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("user_id") == uid
    assert data.get("email") == email


def test_user_without_key_fails(base_url):
    """User with no API key must get 403 on protected endpoint."""
    email, name, password = make_user(99999)
    r = requests.post(f"{base_url}/auth/register", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200
    uid = r.json()["user"]["id"]
    token = r.json()["access_token"]
    rr = requests.get(f"{base_url}/auth/me")  # No auth header
    assert rr.status_code == 403
    # Cleanup
    requests.delete(f"{base_url}/auth/users/{uid}", headers={"Authorization": f"Bearer {token}"})


def test_api_key_user_mismatch(base_url, created_users):
    """Each user's key must return that user's id, not another user's."""
    for i, (uid, _, api_key, _) in enumerate(created_users[:5]):
        r = requests.get(f"{base_url}/auth/me", headers={"X-API-Key": api_key})
        assert r.status_code == 200
        assert r.json().get("user_id") == uid


def test_duplicate_email_rejected(base_url, created_users):
    """Same email must not be allowed for a second registration."""
    uid, email, _, token = created_users[0]
    r = requests.post(
        f"{base_url}/auth/register",
        json={"email": email, "password": "OtherPass1!", "name": "Other Name"},
    )
    assert r.status_code == 400
    assert "already" in r.json().get("detail", "").lower()


def test_account_and_key_age_tracked(base_url, created_users):
    """account_created_at and key_created_at must be present."""
    _, _, api_key, _ = created_users[0]
    r = requests.get(f"{base_url}/auth/me", headers={"X-API-Key": api_key})
    assert r.status_code == 200
    data = r.json()
    assert data.get("account_created_at"), "account_created_at missing"
    assert data.get("key_created_at"), "key_created_at missing"


def test_delete_user_removes_keys(base_url, created_users):
    """Deleting a user must also remove their API keys."""
    if len(created_users) < 2:
        pytest.skip("Need at least 2 users")
    uid, _, api_key, token = created_users[-1]
    r = requests.delete(f"{base_url}/auth/users/{uid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    keys_revoked = r.json().get("keys_revoked", 0)
    assert keys_revoked >= 1
    rr = requests.get(f"{base_url}/auth/me", headers={"X-API-Key": api_key})
    assert rr.status_code == 403  # Key no longer valid
    created_users.pop()  # Already deleted, don't delete again in teardown

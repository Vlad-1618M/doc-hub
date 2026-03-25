#!/usr/bin/env python
"""
Live Data Control — Inject, remove, update data for manual UI testing

Use for: Dashboard glow, recent records sort, search, WebSocket updates, logs.

Usage:
  # Inject
  python -m scripts.live_data_control inject users --count 5
  python -m scripts.live_data_control inject keys --count 10
  python -m scripts.live_data_control inject resumes --count 3
  python -m scripts.live_data_control inject resumes --from-json --count 5
  python -m scripts.live_data_control inject ubuntu --from-json --count 3
  python -m scripts.live_data_control inject python --from-json --count 2
  python -m scripts.live_data_control inject roman --from-json --count 4

  # Remove
  python -m scripts.live_data_control remove users --count 3
  python -m scripts.live_data_control remove keys --count 5
  python -m scripts.live_data_control remove resumes --count 2
  python -m scripts.live_data_control remove ubuntu --all
  python -m scripts.live_data_control remove python --all
  python -m scripts.live_data_control remove roman --all

  # Update (touch records to refresh updated_at → triggers glow)
  python -m scripts.live_data_control update resumes --count 2
  python -m scripts.live_data_control update roman --count 1

  # Docker
  docker exec -it tests-manual python -m scripts.live_data_control inject resumes --count 1
  BASE_URL=http://doc-hub-api:8000 python -m scripts.live_data_control inject keys --count 5

Env: BASE_URL (default: http://127.0.0.1:8000), ADMIN_SECRET (for user delete)
"""

import os
import sys
import json
import random
import argparse
from pathlib import Path

# Project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
# List routes use Query(..., le=100) — larger limit returns 422.
API_LIST_PAGE_MAX = 100
DATA_BASE = ROOT / "tests" / "data_sets"
DEV_EMAIL = os.getenv("DEV_EMAIL", "dev@dev.com")
DEV_PASS = os.getenv("DEV_PASS", "dev123")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def get_token() -> str:
    """Login as dev user, return JWT."""
    r = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": DEV_EMAIL, "password": DEV_PASS},
        timeout=10,
    )
    if r.status_code != 200:
        raise SystemExit(f"Login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


def get_api_key(token: str) -> str:
    """Generate or reuse API key."""
    r = requests.post(
        f"{BASE_URL}/auth/generate-api-key",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if r.status_code != 200:
        raise SystemExit(f"API key failed: {r.status_code} {r.text}")
    return r.json()["api_key"]


def ensure_dev_user():
    """Create dev user if missing."""
    r = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": DEV_EMAIL, "password": DEV_PASS, "name": "Dev User"},
        timeout=10,
    )
    if r.status_code == 400 and "already" in r.text.lower():
        return
    if r.status_code != 200:
        raise SystemExit(f"Register failed: {r.status_code} {r.text}")


# ---------------------------------------------------------------------------
# List helpers (for remove/update)
# ---------------------------------------------------------------------------

def list_resume_ids(api_key: str) -> list[str]:
    return _paginate_list_ids(api_key, "/resume/")


def list_record_ids(api_key: str, path: str) -> list[str]:
    return _paginate_list_ids(api_key, path)


def _paginate_list_ids(api_key: str, path: str) -> list[str]:
    """Fetch all document IDs from a paginated GET list (max limit=100 per request)."""
    ids: list[str] = []
    skip = 0
    while True:
        r = requests.get(
            f"{BASE_URL}{path}",
            headers={"X-API-Key": api_key},
            params={"skip": skip, "limit": API_LIST_PAGE_MAX},
            timeout=30,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        ids.extend(str(x["_id"]) for x in batch)
        if len(batch) < API_LIST_PAGE_MAX:
            break
        skip += API_LIST_PAGE_MAX
    return ids


def list_user_ids() -> list[tuple[str, str]]:
    """Requires ADMIN_SECRET or we use login+me. Returns (user_id, email)."""
    token = get_token()
    r = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    r.raise_for_status()
    data = r.json()
    uid = data.get("user_id")
    if uid:
        return [(uid, DEV_EMAIL)]
    return []


def list_api_keys(api_key: str) -> list[str]:
    r = requests.get(
        f"{BASE_URL}/auth/api-keys",
        headers={"X-API-Key": api_key},
        timeout=10,
    )
    if r.status_code == 404:
        return []
    r.raise_for_status()
    return r.json().get("api_keys", [])


# ---------------------------------------------------------------------------
# Inject
# ---------------------------------------------------------------------------

def inject_users(count: int, token: str) -> int:
    created = 0
    for i in range(count):
        email = f"liveuser{i:04d}@live.example.com"
        r = requests.post(
            f"{BASE_URL}/auth/register",
            json={"email": email, "password": "LivePass123!", "name": f"Live User {i}"},
            timeout=10,
        )
        if r.status_code == 200:
            created += 1
            print(f"  ✓ User {email}")
        else:
            print(f"  ✗ {email}: {r.text[:80]}")
    return created


def inject_keys(count: int, token: str) -> int:
    created = 0
    for _ in range(count):
        r = requests.post(
            f"{BASE_URL}/auth/generate-api-key",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if r.status_code == 200:
            key = r.json()["api_key"]
            print(f"  ✓ Key ...{key[-8:]}")
            created += 1
        else:
            print(f"  ✗ Key: {r.text[:80]}")
    return created


def load_json_templates(collection: str, limit: int) -> list[dict]:
    if collection == "resumes":
        dir_path = DATA_BASE / "resumes"
    else:
        dir_path = DATA_BASE / collection
    if not dir_path.exists():
        return []
    files = sorted(f for f in dir_path.glob("*.json") if f.name != "dummy_pyaload.json")
    items = []
    for f in random.sample(files, min(limit, len(files))):
        items.append(json.loads(f.read_text()))
    return items


def make_fake_resume(i: int) -> dict:
    first = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"]
    last = ["Smith", "Jones", "Lee", "Brown", "Wilson", "Taylor", "Clark", "White"]
    f, l = random.choice(first), random.choice(last)
    return {
        "resume": {
            "name": {"first_name": f, "last_name": l},
            "job_title": {"position": f"Role {i}", "role": "Test"},
            "contact": {"email": f"{f.lower()}.{l.lower()}@test.com", "phone": ""},
            "summary": f"Generated resume {i} for live testing.",
        },
        "Work_Experience": [],
        "education": {"degree": "", "location": "", "majored_in": ""},
    }


def inject_resumes(count: int, from_json: bool, api_key: str) -> int:
    if from_json:
        items = load_json_templates("resumes", count)
    else:
        items = [make_fake_resume(i) for i in range(count)]
    created = 0
    for payload in items:
        r = requests.post(
            f"{BASE_URL}/resume/",
            headers={"Content-Type": "application/json", "X-API-Key": api_key},
            json=payload,
            timeout=10,
        )
        if r.status_code == 200:
            created += 1
            title = f"{payload.get('resume',{}).get('name',{}).get('first_name','')} {payload.get('resume',{}).get('name',{}).get('last_name','')}".strip()
            print(f"  ✓ Resume: {title or 'Created'} -> {r.json().get('id','')[:8]}...")
        else:
            print(f"  ✗ Resume: {r.text[:80]}")
    return created


def inject_records(collection: str, count: int, from_json: bool, api_key: str) -> int:
    path_map = {
        "ubuntu": "/ubuntu-releases/",
        "python": "/python-releases/",
        "roman": "/roman-leaders/",
    }
    path = path_map.get(collection)
    if not path:
        return 0
    key = f"{collection}_releases" if collection != "roman" else "roman_leaders"
    if from_json:
        items = load_json_templates(key, count)
    else:
        items = _make_fake_records(collection, count)
    created = 0
    for payload in items:
        r = requests.post(
            f"{BASE_URL}{path}",
            headers={"Content-Type": "application/json", "X-API-Key": api_key},
            json=payload,
            timeout=10,
        )
        if r.status_code == 200:
            created += 1
            title = payload.get("name") or payload.get("version") or "Created"
            print(f"  ✓ {collection}: {str(title)[:40]} -> {r.json().get('id','')[:8]}...")
        else:
            print(f"  ✗ {collection}: {r.text[:80]}")
    return created


def _make_fake_records(collection: str, count: int) -> list[dict]:
    items = []
    for i in range(count):
        if collection == "ubuntu":
            items.append({
                "version": f"99.{i}.0", "codename": f"Test{i}",
                "release_date": "2025-01-01", "support_type": "LTS",
                "eol_date": "2030-01-01", "summary": f"Fake Ubuntu {i}",
            })
        elif collection == "python":
            items.append({
                "version": f"9.{i}", "release_date": "2025-01-01",
                "eol_date": "2030-01-01", "status": "security",
                "summary": f"Fake Python 9.{i}",
            })
        else:
            items.append({
                "name": f"Test Emperor {i}", "title": "Emperor",
                "reign_start": "1 AD", "reign_end": "10 AD",
                "dynasty": "Test", "summary": f"Fake roman {i}",
            })
    return items


# ---------------------------------------------------------------------------
# Remove
# ---------------------------------------------------------------------------

def remove_users(count: int, token: str) -> int:
    """Delete users. Requires login as each or ADMIN_SECRET."""
    # We only have our own user_id from /me. For multi-user delete we'd need
    # a list endpoint or ADMIN_SECRET to delete by id from DB.
    print("  Note: User delete requires user_id. Use run_user_create_suite --no-cleanup then cleanup.")
    return 0


def remove_keys(count: int, api_key: str, token: str) -> int:
    keys = list_api_keys(api_key)
    # Don't revoke the key we're using
    to_revoke = [k for k in keys if k != api_key][:count]
    revoke_path = f"{BASE_URL}/auth/revoke-api-key"
    headers = {"Authorization": f"Bearer {token}"}
    deleted = 0
    for k in to_revoke:
        r = requests.delete(revoke_path, headers=headers, params={"api_key_to_revoke": k}, timeout=10)
        if r.status_code == 200:
            deleted += 1
            print(f"  ✓ Revoked ...{k[-8:]}")
        else:
            print(f"  ✗ Revoke {k[-8:]}: {r.text[:60]}")
    return deleted


def remove_resumes(count: int, api_key: str) -> int:
    ids = list_resume_ids(api_key)
    headers = {"X-API-Key": api_key}
    deleted = 0
    for rid in ids[:count]:
        r = requests.delete(f"{BASE_URL}/resume/{rid}", headers=headers, timeout=10)
        if r.status_code == 200:
            deleted += 1
            print(f"  ✓ Deleted resume {rid[:8]}...")
        else:
            print(f"  ✗ Delete {rid[:8]}: {r.text[:60]}")
    return deleted


def remove_records(collection: str, count: int, all_flag: bool, api_key: str) -> int:
    path_map = {"ubuntu": "/ubuntu-releases", "python": "/python-releases", "roman": "/roman-leaders"}
    path = path_map.get(collection)
    if not path:
        return 0
    ids = list_record_ids(api_key, path + "/")
    if all_flag:
        count = len(ids)
    headers = {"X-API-Key": api_key}
    deleted = 0
    for rid in ids[:count]:
        r = requests.delete(f"{BASE_URL}{path}/{rid}", headers=headers, timeout=10)
        if r.status_code == 200:
            deleted += 1
            print(f"  ✓ Deleted {collection} {rid[:8]}...")
        else:
            print(f"  ✗ Delete {rid[:8]}: {r.text[:60]}")
    return deleted


# ---------------------------------------------------------------------------
# Update (touch for glow)
# ---------------------------------------------------------------------------

def update_resumes(count: int, api_key: str) -> int:
    ids = list_resume_ids(api_key)
    headers = {"Content-Type": "application/json", "X-API-Key": api_key}
    updated = 0
    for rid in ids[:count]:
        r = requests.get(f"{BASE_URL}/resume/{rid}", headers={"X-API-Key": api_key}, timeout=10)
        if r.status_code != 200:
            continue
        doc = r.json()
        payload = {
            "resume": doc.get("resume", {}),
            "Work_Experience": doc.get("Work_Experience", []),
            "education": doc.get("education", {}),
            "work_authorization": doc.get("work_authorization"),
            "reference": doc.get("reference", {}),
            "links": doc.get("links", {}),
            "notes": doc.get("notes"),
        }
        r2 = requests.put(f"{BASE_URL}/resume/{rid}", headers=headers, json=payload, timeout=10)
        if r2.status_code == 200:
            updated += 1
            print(f"  ✓ Touched resume {rid[:8]}... (glow)")
        else:
            print(f"  ✗ Touch {rid[:8]}: {r2.text[:60]}")
    return updated


def update_records(collection: str, count: int, api_key: str) -> int:
    path_map = {"ubuntu": "/ubuntu-releases", "python": "/python-releases", "roman": "/roman-leaders"}
    path = path_map.get(collection)
    if not path:
        return 0
    ids = list_record_ids(api_key, path + "/")
    headers = {"Content-Type": "application/json", "X-API-Key": api_key}
    updated = 0
    for rid in ids[:count]:
        r = requests.get(f"{BASE_URL}{path}/{rid}", headers={"X-API-Key": api_key}, timeout=10)
        if r.status_code != 200:
            continue
        doc = r.json()
        payload = {k: v for k, v in doc.items() if k != "_id"}
        r2 = requests.put(f"{BASE_URL}{path}/{rid}", headers=headers, json=payload, timeout=10)
        if r2.status_code == 200:
            updated += 1
            print(f"  ✓ Touched {collection} {rid[:8]}... (glow)")
        else:
            print(f"  ✗ Touch {rid[:8]}: {r2.text[:60]}")
    return updated


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    global BASE_URL
    ap = argparse.ArgumentParser(
        description="Live Data Control — inject, remove, update data for UI testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("action", choices=["inject", "remove", "update"], help="Action")
    ap.add_argument(
        "type",
        choices=["users", "keys", "resumes", "ubuntu", "python", "roman"],
        help="Data type",
    )
    ap.add_argument("--count", type=int, default=1, help="Count (default 1)")
    ap.add_argument("--all", action="store_true", help="Remove all (remove action only)")
    ap.add_argument("--from-json", action="store_true", help="Use tests/data_sets JSON templates (inject)")
    ap.add_argument("--base-url", default=None, help="API URL (default: $BASE_URL or http://127.0.0.1:8000)")
    ap.add_argument("-v", "--verbose", action="store_true", help="Verbose")
    args = ap.parse_args()

    if args.base_url:
        BASE_URL = args.base_url.rstrip("/")

    # Health check
    try:
        r = requests.get(f"{BASE_URL}/resume/status/health", timeout=5)
        r.raise_for_status()
    except Exception as e:
        print(f"Error: API not reachable at {BASE_URL}: {e}")
        sys.exit(1)

    ensure_dev_user()
    token = get_token()
    api_key = get_api_key(token)

    print(f"\n--- {args.action.upper()} {args.type} ---")
    print(f"  Base: {BASE_URL}\n")

    total = 0

    if args.action == "inject":
        if args.type == "users":
            total = inject_users(args.count, token)
        elif args.type == "keys":
            total = inject_keys(args.count, token)
        elif args.type == "resumes":
            total = inject_resumes(args.count, args.from_json, api_key)
        else:
            total = inject_records(args.type, args.count, args.from_json, api_key)

    elif args.action == "remove":
        if args.type == "users":
            total = remove_users(args.count, token)
        elif args.type == "keys":
            total = remove_keys(args.count, api_key, token)
        elif args.type == "resumes":
            total = remove_resumes(args.count, api_key)
        else:
            total = remove_records(args.type, args.count, args.all, api_key)

    elif args.action == "update":
        if args.type in ("users", "keys"):
            print("  Update not supported for users/keys.")
        elif args.type == "resumes":
            total = update_resumes(args.count, api_key)
        else:
            total = update_records(args.type, args.count, api_key)

    print(f"\nDone: {total} affected.\n")


if __name__ == "__main__":
    main()

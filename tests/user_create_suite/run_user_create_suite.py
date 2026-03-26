#!/usr/bin/env python
"""
User Create Test Suite Runner

Creates N users (default 100) with API keys per user, runs validation tests,
writes credentials CSV for manual verification.

Usage:
  python -m tests.user_create_suite.run_user_create_suite
  python -m tests.user_create_suite.run_user_create_suite --count 150
  python -m tests.user_create_suite.run_user_create_suite --count 100 --extra 50
  python -m tests.user_create_suite.run_user_create_suite --count 50 -v -o ./creds.csv

CLI Args:
  --count N       Number of users (default: 100)
  --extra N       Extra users, total = count + extra (default: 0)
  --no-cleanup    Do not delete users after tests
  --base-url URL  API base URL (default: $BASE_URL or http://doc-hub-api:8000)
  -v, --verbose   Per-user progress output
  -o, --output F  Credentials CSV path (default: .logs/user_create_credentials_<ts>.csv)
"""

import argparse
import csv
import json
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Add project root
_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_root))
sys.path.insert(0, str(_root / "src"))

import requests

BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")
DEFAULT_COUNT = 100


@dataclass
class UserRecord:
    email: str
    name: str
    password: str
    user_id: str
    api_key: str | None
    created_at: datetime | None = None
    key_created_at: datetime | None = None


def make_user(i: int, total: int) -> tuple[str, str, str]:
    """Return (email, name, password) for user index i."""
    base = f"testuser{i:04d}"
    return f"{base}@usercreate.example.com", f"Test User {i}", "TestPass123!"


def register(base_url: str, email: str, password: str, name: str) -> dict:
    r = requests.post(f"{base_url}/auth/register", json={"email": email, "password": password, "name": name})
    r.raise_for_status()
    return r.json()


def login(base_url: str, email: str, password: str) -> str:
    r = requests.post(f"{base_url}/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def generate_api_key(base_url: str, token: str) -> str:
    r = requests.post(f"{base_url}/auth/generate-api-key", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return r.json()["api_key"]


def get_me_key(base_url: str, api_key: str) -> dict:
    r = requests.get(f"{base_url}/auth/me", headers={"X-API-Key": api_key})
    r.raise_for_status()
    return r.json()


def get_me_jwt(base_url: str, token: str) -> dict:
    r = requests.get(f"{base_url}/auth/me", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return r.json()


def delete_user(base_url: str, user_id: str, token: str) -> dict:
    r = requests.delete(
        f"{base_url}/auth/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def create_users_with_keys(base_url: str, count: int, records: list[UserRecord], verbose: bool = False) -> list[UserRecord]:
    """Create count users, each with an API key. Append to records."""
    for i in range(len(records), len(records) + count):
        email, name, password = make_user(i, count)
        try:
            reg = register(base_url, email, password, name)
            user_id = reg["user"]["id"]
            token = reg["access_token"]
            api_key = generate_api_key(base_url, token)
            me = get_me_key(base_url, api_key)
            records.append(
                UserRecord(
                    email=email,
                    name=name,
                    password=password,
                    user_id=user_id,
                    api_key=api_key,
                    created_at=me.get("account_created_at"),
                    key_created_at=me.get("key_created_at"),
                )
            )
            if verbose or (i + 1) % 10 == 0:
                print(f"  Created user {i + 1}/{count}", flush=True)
        except Exception as e:
            print(f"  ERROR user {i}: {e}", flush=True)
            raise
    return records


def run_tests(base_url: str, records: list[UserRecord]) -> list[str]:
    """Run validation tests. Returns list of error messages (empty if all pass)."""
    errors: list[str] = []

    # 1. User + API key works
    if records:
        u = records[0]
        try:
            me = get_me_key(base_url, u.api_key)
            if me.get("user_id") != u.user_id:
                errors.append(f"Key mismatch: key returned user_id={me.get('user_id')}, expected {u.user_id}")
        except Exception as e:
            errors.append(f"User+key test failed: {e}")

    # 2. User with no API key should fail on protected endpoint
    email, name, password = make_user(99999, 1)
    try:
        reg = register(base_url, email, password, name)
        token = reg["access_token"]
        # Do NOT generate key. Try to access protected endpoint without key or token.
        r = requests.get(f"{base_url}/auth/me")  # No auth
        if r.status_code != 403:
            errors.append(f"No-key test: expected 403, got {r.status_code}")
        # Clean up
        delete_user(base_url, reg["user"]["id"], token)
    except Exception as e:
        errors.append(f"No-api-key test: {e}")

    # 3. API key user mismatch: User A's key must return User A, not User B
    if len(records) >= 2:
        a, b = records[0], records[1]
        me = get_me_key(base_url, a.api_key)
        if me.get("user_id") != a.user_id:
            errors.append(f"Key A returned user {me.get('user_id')}, expected {a.user_id}")
        me = get_me_key(base_url, b.api_key)
        if me.get("user_id") != b.user_id:
            errors.append(f"Key B returned user {me.get('user_id')}, expected {b.user_id}")

    # 4. Duplicate email not allowed
    if records:
        u = records[0]
        r = requests.post(
            f"{base_url}/auth/register",
            json={"email": u.email, "password": "OtherPass1!", "name": u.name},
        )
        if r.status_code != 400:
            errors.append(f"Duplicate email expected 400, got {r.status_code}")
        elif "already" not in r.json().get("detail", "").lower():
            errors.append(f"Duplicate email: unexpected detail {r.json()}")

    # 5. Age tracking: account_created_at and key_created_at should exist
    if records:
        u = records[0]
        me = get_me_key(base_url, u.api_key)
        if not me.get("account_created_at"):
            errors.append("account_created_at missing")
        if not me.get("key_created_at"):
            errors.append("key_created_at missing")

    return errors


def cleanup(base_url: str, records: list[UserRecord], verbose: bool = False) -> tuple[int, int]:
    """Delete all users (and their keys) via JWT. Returns (deleted, failed)."""
    deleted, failed = 0, 0
    for u in records:
        try:
            token = login(base_url, u.email, u.password)
            delete_user(base_url, u.user_id, token)
            deleted += 1
            if verbose or deleted % 10 == 0:
                print(f"  Deleted user {deleted}/{len(records)}: {u.email}", flush=True)
        except Exception as e:
            failed += 1
            if verbose:
                print(f"  Failed to delete {u.email}: {e}", flush=True)
    return deleted, failed


def main():
    ap = argparse.ArgumentParser(description="User Create Test Suite")
    ap.add_argument("--count", type=int, default=DEFAULT_COUNT, help=f"Number of users to create (default {DEFAULT_COUNT})")
    ap.add_argument("--extra", type=int, default=0, help="Additional users on top of count")
    ap.add_argument("--no-cleanup", action="store_true", help="Do not delete users after test")
    ap.add_argument("--base-url", default=BASE_URL, help="API base URL")
    ap.add_argument("-v", "--verbose", action="store_true", help="Print progress for each user")
    ap.add_argument("-o", "--output", metavar="FILE", help="Write credentials (email,password,name,user_id) to CSV for manual verification")
    args = ap.parse_args()

    total = args.count + args.extra
    print(f"User Create Suite: creating {total} users with API keys (base_url={args.base_url})", flush=True)
    print("  Tip: To watch API logs: docker logs -f doc-hub-api  (in another terminal)", flush=True)
    records: list[UserRecord] = []

    try:
        start = time.time()
        create_users_with_keys(args.base_url, total, records, verbose=args.verbose)
        elapsed = time.time() - start
        print(f"Created {len(records)} users in {elapsed:.1f}s", flush=True)

        # Write credentials file for manual verification
        outfile = args.output
        if outfile is None:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            outfile = _root / ".logs" / f"user_create_credentials_{ts}.csv"
        outpath = Path(outfile)
        outpath.parent.mkdir(parents=True, exist_ok=True)
        with open(outpath, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["email", "password", "name", "user_id"])
            for u in records:
                w.writerow([u.email, u.password, u.name, u.user_id])
        print(f"Credentials written to: {outpath.absolute()}", flush=True)

        errors = run_tests(args.base_url, records)
        if errors:
            print("TESTS FAILED:", flush=True)
            for e in errors:
                print(f"  - {e}", flush=True)
            sys.exit(1)
        print("All tests passed.", flush=True)
    finally:
        if not args.no_cleanup and records:
            print("Cleaning up...", flush=True)
            deleted, failed = cleanup(args.base_url, records, verbose=args.verbose)
            print(f"Done. Deleted {deleted}, failed {failed}.", flush=True)


if __name__ == "__main__":
    main()

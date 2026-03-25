#!/usr/bin/env python

import os
import sys
import json
import copy
import pytest
import requests
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# ____________ BASE_URL Configuration:
BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")


def _headers_for_generate_api_key() -> dict:
    """Match get_auth_key.sh: when ADMIN_SECRET is set, FastAPI requires X-Admin-Secret (or JWT)."""
    secret = (os.getenv("ADMIN_SECRET") or "").strip()
    if secret:
        return {"X-Admin-Secret": secret}
    return {}

# ____________ BASE_URL | Fixture:
@pytest.fixture(scope="session")
def base_url():
    """ Pytest Fixture: 
        returns:   --> base API URL from environment variables:
        defaults:  --> to http://doc-hub-api:8000 if not set: """
    return BASE_URL

# ____________ API key token | Fixture:
@pytest.fixture(scope="session")
def api_key(base_url, api_true_headers):
    """ Pytest Fixture: --> retrieve an API key from the authentication endpoint:
        Calls GET /auth/get_api_key endpoint to fetch key token: """
    auth_url = f"{base_url}/auth/get_api_key"
    response = requests.get(auth_url, headers=api_true_headers)
    assert response.status_code == 200, "Failed to fetch API key"
    return response.json().get("api_key")


# ____________ help function | load test data:
def load_all_resume_data():
    """ Load all resume JSON files: from specified directory:
        returns: --> list of tuples: (resume_name, resume_payload) """
    data_dir = Path('/dbapp/tests/data_sets/resumes/')
    resumes = []
    for json_file in data_dir.glob("*.json"):
        with json_file.open("r", encoding="utf-8") as f:
            resumes.append((json_file.stem, json.load(f)))
    return resumes

# ____________ Parameterized Resume Data:
all_resume_params = load_all_resume_data()

transformed_params = []
for resume_name, resume_payload in all_resume_params:
    if resume_name == "dummy_pyaload": 
        transformed_params.append(
            pytest.param(
                resume_name,
                resume_payload,
                marks=pytest.mark.xfail(reason=f" --> test for [ {resume_name} ] payload is expected to Fail as the name [ {resume_name} ] does not exist in MongoDB and is intentionally missing required DB data:")
            )
        )
    else:
        transformed_params.append((resume_name, resume_payload))


# ____________ Test Case: | Validate API Key File Exists:
@pytest.mark.xfail(reason=f"\n\t--> API key file gets created only if:\n\t--> POST request was made to [ {BASE_URL}/auth/generate-api-key] endpoint:\n\t--> resulting None Exist State:\n\t--> expected failure == fresh setup:")
@pytest.mark.dependency()
def test_get_api_key_from_file(api_true_headers):
    """ Test case to check if the API key file exists and contains a valid key:
        Reads from /tmp/api_key.txt and compares it against the stored key in headers: """
    key_file = Path("/tmp/api_key.txt")
    assert key_file.exists(), "API key file /tmp/api_key.txt not found:"
    with key_file.open("r", encoding="utf-8") as f:
        api_key = f.read().strip()
    assert api_key, "API key is empty in /tmp/api_key.txt"
    assert api_key == api_true_headers["X-API-Key"], "Stored API key does not match the one in headers:"


# ____________ Test Case: | Generate a New API Key:
@pytest.mark.dependency()
def test_generate_api_key_via_request(base_url):
    """ Test case to request new API key token dynamically:
        The new API key is written to /tmp/api_key.txt for further tests reuse: """
    auth_url = f"{base_url}/auth/generate-api-key"
    response = requests.post(auth_url, headers=_headers_for_generate_api_key())
    assert response.status_code == 200, f"Failed to generate API key: {response.text}"
    assert response.json().get("api_key"), "Requested API key token is missing or not returned:"
    assert "New API key generated" in response.json()["message"]
    
    api_key = response.json().get("api_key")
    key_file = Path("/tmp/api_key.txt")
    with key_file.open("w", encoding="utf-8") as new_token:
        new_token.write(api_key)

    with key_file.open("r", encoding="utf-8") as existing_token:
        stored_key = existing_token.read().strip()
    assert stored_key == api_key, "Existing API key token does not match generated key token: check MongoDB keys with /tmp/api_key.txt file written value:"


# ____________ Test Fixture: | Store Created Resume IDs:
@pytest.fixture(scope="session")
def created_ids():
    """ Fixture to store created resume IDs keyed by resume_name:
        used as refs in later test cases: """
    return {}


# ____________ Test Case: | Create a New Resume:
@pytest.mark.dependency(depends=["test_generate_api_key_via_request"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_create_resume(base_url, api_true_headers, resume_name, resume_payload, debug_delay_between_tests, created_ids):
    """ Test case to create resumes using POST /resume/ endpoint:
        Stores created resume IDs in the fixture for future test validation: """
    create_url = f"{base_url}/resume/"
    payload = copy.deepcopy(resume_payload)         # <-- deep copy to avoid modifying any shared parameter:
    response = requests.post(create_url, json=payload, headers=api_true_headers)
    assert response.status_code == 200, f"Create failed for {resume_name}: {response.text}"
    created_data = response.json()
    resume_id = created_data.get("id")
    assert resume_id, f"Resume ID missing for {resume_name}"
    payload["id"] = resume_id                       # ... store generated ID in the local copy: optional cleanup when done: [ not strictly needed ]
    created_ids[resume_name] = resume_id


# ____________ Test Case: | Validate Resume Exists in Database:
@pytest.mark.dependency(depends=["test_create_resume"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_validate_resume_in_db(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    """ Test case to validate created resume exists in MongoDB:
        Calls GET /resume/{resume_id} endpoint to fetch and verify data: """
    resume_id = created_ids.get(resume_name)
    assert resume_id, f"No stored ID for {resume_name}"
    get_url = f"{base_url}/resume/{resume_id}"
    response = requests.get(get_url, headers=api_true_headers)
    assert response.status_code == 200, f"GET failed for {resume_name}: {response.text}"
    retrieved_data = response.json()
    assert retrieved_data["resume"]["name"] == resume_payload["resume"]["name"], f"Name mismatch for {resume_name}"


# ____________ Test Case: | update each resume using PATCH endpoint:
@pytest.mark.dependency(depends=["test_validate_resume_in_db"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_patch_resume(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    resume_id = created_ids.get(resume_name)
    assert resume_id, f"No stored ID for {resume_name}"
    patch_url = f"{base_url}/resume/{resume_id}"
    patch_payload = {
        "resume": {
            "name": resume_payload["resume"]["name"],
            "summary": f"Updated summary for {resume_name}"
        }
    }
    response = requests.patch(patch_url, json=patch_payload, headers=api_true_headers)
    assert response.status_code == 200, f"PATCH failed for {resume_name}: {response.text}"


# ____________ Test Case: | update specific resume using PUT /resume/{resume_id} endpoint:
@pytest.mark.dependency(depends=["test_create_resume"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_update_specific_resume(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    """ Update a specific resume by its unique ID using the new PUT endpoint:
        This test uses a deep copy of the resume_payload to modify the summary field: """
    # ... retrieve created resume's ID from the shared fixture:
    resume_id = created_ids.get(resume_name)
    assert resume_id, f"No stored ID for {resume_name}"
    updated_payload = copy.deepcopy(resume_payload)                                        # <-- check and prep updated payload with deep copy so the original isn't modified:
    updated_payload["resume"]["summary"] = f"Specific updated summary for {resume_name}"
    put_url = f"{base_url}/resume/{resume_id}"                                             # <-- fix URL with resume_id:
    response = requests.put(put_url, json=updated_payload, headers=api_true_headers)       # <-- call targeted PUT endpoint:
    assert response.status_code == 200, f"PUT specific update failed for {resume_name}: {response.text}"
    get_url = f"{base_url}/resume/{resume_id}"                                             # <-- verify resume in priocess was updated:
    get_resp = requests.get(get_url, headers=api_true_headers)
    assert get_resp.status_code == 200, f"GET failed after specific update for {resume_name}: {get_resp.text}"
    retrieved_data = get_resp.json()
    expected_summary = f"Specific updated summary for {resume_name}"
    assert retrieved_data["resume"]["summary"] == expected_summary, (f"Specific update summary mismatch for {resume_name}: expected {expected_summary}, got {retrieved_data['resume']['summary']}")


# ____________ Test Case: Check Data Updates | GET call using /resume/{resume_id endpint: 
@pytest.mark.dependency(depends=["test_update_specific_resume"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_verify_updated_resume(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    resume_id = created_ids.get(resume_name)
    assert resume_id, f"No stored ID for {resume_name}"
    get_url = f"{base_url}/resume/{resume_id}"
    # verify_payload = copy.deepcopy(resume_payload)
    # response = requests.get(get_url, json=verify_payload, headers=api_true_headers)
    response = requests.get(get_url, headers=api_true_headers)
    assert response.status_code == 200, f"GET failed after update for {resume_name}: {response.text}"
    retrieved_data = response.json()
    # Expected summary should match what was set in test_put_resume.
    expected_summary = f"Specific updated summary for {resume_name}"
    assert retrieved_data["resume"]["summary"] == expected_summary, f"Summary mismatch after update for {resume_name}"


# ____________ Test Case Cleanup: | DELETE call using /resume/{resume_id} endpoint:
@pytest.mark.dependency(depends=["test_verify_updated_resume"])
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_delete_resume(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    resume_id = created_ids.get(resume_name)
    assert resume_id, f"No stored ID for {resume_name}"
    delete_url = f"{base_url}/resume/{resume_id}"
    response = requests.delete(delete_url, headers=api_true_headers)
    assert response.status_code == 200, f"DELETE failed for {resume_name}: {response.text}"


# ____________ Test Case: Check Data Cleanup | GET call using /resume/{resume_id} endpoint:
@pytest.mark.xfail(reason=f"\t\t -->\tAll Existing Resumes should be deleted: GET Call Is expected to fail:")
@pytest.mark.parametrize("resume_name,resume_payload", transformed_params)
def test_validate_cleanup(base_url, api_true_headers, resume_name, resume_payload, created_ids):
    resume_id = created_ids.get(resume_name)
    get_url = f"{base_url}/resume/{resume_id}"
    response = requests.get(get_url, headers=api_true_headers)
    assert response.status_code == 404, f"Resume {resume_name} still exists!"


# ____________ Test Case: Collect issued API key-tokens| GET call using /auth/api-keys endpoint:
@pytest.mark.dependency()
def test_count_api_keys(base_url, api_true_headers):
    """ Retrieve existing API keys /token from DB with GET /auth/api-keys endpoint:
        assert for at least one key is present: """
    api_keys_url = f"{base_url}/auth/api-keys"
    response = requests.get(api_keys_url, headers=api_true_headers)
        # ... Debug output .... remoive me
        # print(f"DEBUG: GET {api_keys_url} returned {response.status_code}: {response.text}")
    assert response.status_code == 200, "Failed to retrieve API keys"
    keys = response.json().get("api_keys", [])
    assert len(keys) > 0, "API key count should be greater than zero"


# ____________ Test Case: Cleanup API Keys | DELETE call using /auth/revoke-api-key endpoint:
@pytest.mark.dependency(depends=["test_count_api_keys"])
def test_remove_api_keys(base_url, api_true_headers, debug_delay_between_tests):
    """ Revoke / delete all existing API key tokens from DB:
        1. retrieves all API keys with GET /auth/api-keys endpoint: 
        2. iterate over each key to revoke it using DELETE /auth/revoke-api-key endpoint:
        3. make a call to verify no keys remain with subsequent GET assertion returning 404 or an empty key array: """
    api_keys_url = f"{base_url}/auth/api-keys"
    response = requests.get(api_keys_url, headers=api_true_headers)                 # <-- retrieve existing API key tokens:
    assert response.status_code == 200, "Failed to retrieve API keys before removal"
    keys = response.json().get("api_keys", [])
    for key in keys:
        remove_url = f"{base_url}/auth/revoke-api-key"
        revoke_resp = requests.delete(remove_url, params={"api_key_to_revoke": key}, headers=api_true_headers) # <-- pass key subject to revoke as a query parameter:
        print(f"DEBUG: DELETE {remove_url}?api_key_to_revoke={key} returned {revoke_resp.status_code}: {revoke_resp.text}")
        assert revoke_resp.status_code in {200, 403}, f"Failed to revoke API key {key}, got status {revoke_resp.status_code}"
    
    response2 = requests.get(api_keys_url, headers=api_true_headers)                                          # <-- attempt to retrieve API key tokens again after removal:
    
    if response2.status_code == 200:        # <-- if no keys exist, the endpoint may return a 404.
        remaining_keys = response2.json().get("api_keys", [])
        assert len(remaining_keys) == 0, "API key count should be zero after removal"
    else:
        assert response2.status_code in {404, 403}, "Expected 404 or 403 depending on DB state | when no API keys remain after removal:"


#!/usr/bin/env python

import os
import sys
import json
import pytest
import requests
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from src.server import app  # ... for context:

BASE_URL = os.getenv("BASE_URL", "http://doc-hub-api:8000")

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

def load_all_resume_data():
    """
    Load all resume JSON files from the specified directory.
    Returns a list of tuples: (resume_name, resume_payload)
    """
    data_dir = Path('/dbapp/tests/data_sets/resumes/')
    resumes = []
    for json_file in data_dir.glob("*.json"):
        with json_file.open("r", encoding="utf-8") as f:
            resumes.append((json_file.stem, json.load(f)))
    return resumes

# ... Load raw parameters:
all_resume_params = load_all_resume_data()

# ... mark known faulty payload(s) as xfail:
transformed_params = []
for resume_name, resume_payload in all_resume_params:
    if resume_name == "dummy_pyaload":  # adjust if needed
        transformed_params.append(
            pytest.param(
                resume_name,
                resume_payload,
                marks=pytest.mark.xfail(reason=f" --> test for [ {resume_name} ] payload is expected to Fail as the name [ {resume_name} ] does not exist in MongoDB and is intentionally missing required DB data:")
            )
        )
    else:
        transformed_params.append((resume_name, resume_payload))

# ... Build custom IDs from each tuple: | show resume_name only in the runtime:
def id_func(param):
    if isinstance(param, (list, tuple)):
        return str(param[0])
    return str(param)

custom_ids = [id_func(p) for p in transformed_params]


@pytest.mark.parametrize("resume_name,resume_payload", transformed_params, ids=custom_ids)
def test_crud_cycle(base_url, api_true_headers, resume_name, resume_payload, debug_delay_between_tests):
    # 1 ... health check | GET Call:
    health_url = f"{base_url}/resume/status/health"
    health_resp = requests.get(health_url, headers=api_true_headers)
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    
    # 2 ... create the resume | POST Call:
    create_url = f"{base_url}/resume/"
    create_resp = requests.post(create_url, json=resume_payload, headers=api_true_headers)
    assert create_resp.status_code == 200, f"Create failed for {resume_name}: {create_resp.text}"
    created_data = create_resp.json()
    resume_id = created_data.get("id")
    assert resume_id, f"Resume id missing for {resume_name}"
    
    # 3 ... Retrieve the resume by ID and verify key fields | GET Call:
    get_url = f"{base_url}/resume/{resume_id}"
    get_resp = requests.get(get_url, headers=api_true_headers)
    assert get_resp.status_code == 200, f"Get resume failed for {resume_name}: {get_resp.text}"
    retrieved = get_resp.json()
    for field in ["name", "contact", "job_title", "summary"]:
        expected = resume_payload["resume"].get(field)
        actual = retrieved["resume"].get(field)
        assert expected == actual, f"Mismatch in '{field}' for {resume_name}: expected {expected}, got {actual}"
    
    expected_skills = resume_payload["resume"].get("skills")
    actual_skills = retrieved["resume"].get("skills")
    assert expected_skills == actual_skills, f"Mismatch in skills for {resume_name}: expected {expected_skills}, got {actual_skills}"
    
    # 4 ... Full update change summary | PUT Call (by ID):
    update_payload = resume_payload.copy()
    new_summary = f"Updated summary for {resume_name}"
    update_payload["resume"]["summary"] = new_summary
    update_url = f"{base_url}/resume/{resume_id}"
    update_resp = requests.put(update_url, json=update_payload, headers=api_true_headers)
    assert update_resp.status_code == 200, f"Update failed for {resume_name}: {update_resp.text}"
    
    # 5 ... Partial update to change summary | PATCH by ID Call:
    patch_payload = {
        "resume": {
            "name": resume_payload["resume"]["name"],
            "summary": f"Patched summary for {resume_name}"
        }
    }
    patch_url = f"{base_url}/resume/{resume_id}"
    patch_resp = requests.patch(patch_url, json=patch_payload, headers=api_true_headers)
    assert patch_resp.status_code == 200, f"Patch failed for {resume_name}: {patch_resp.text}"
    
    # 6 ... Delete the resume | DELETE Call:
    delete_url = f"{base_url}/resume/{resume_id}"
    delete_resp = requests.delete(delete_url, headers=api_true_headers)
    assert delete_resp.status_code == 200, f"Delete failed for {resume_name}: {delete_resp.text}"
    
    # 7 ... Confirm deletion | GET Call should return 404:
    confirm_resp = requests.get(delete_url, headers=api_true_headers)
    assert confirm_resp.status_code == 404, f"Resume {resume_name} still exists after deletion"

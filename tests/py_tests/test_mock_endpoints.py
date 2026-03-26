#!/usr/bin/env python

"""
Pytest Suite for CRUD Endpoints

This suite tests all endpoints defined in your FastAPI application:
- POST: Create a new resume
- GET (list): Retrieve paginated resume data
- GET (by id): Retrieve a single resume by its ID
- PUT /{id}: Full update by resume ID (PUT / deprecated)
- PUT Bulk: Bulk update using first_name and last_name filters
- PATCH by id: Partial update using resume_id
- PATCH by name: Partial update using first and last name
- DELETE: Delete a resume by its ID
- Health: Check API health
- WebSocket: Dashboard real-time updates
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from src.server import app

client = TestClient(app)

# GET /status/health check _____ endpoint _____________________________________________:
def test_health(api_mock_headers):
    response = client.get("/resume/status/health", headers=api_mock_headers)
    assert response.status_code == 200, f"Health check failed: {response.text}"
    assert not response.status_code == 400, f"Health check failed: {response.text}"
    assert not response.status_code == 404, f"Health check failed: {response.text}"
    assert response.json() == {"status": "healthy"}


# WebSocket /ws/dashboard _____ endpoint _______________________________________________:
def test_websocket_dashboard_connect():
    """WebSocket dashboard endpoint accepts connections for real-time refresh updates."""
    with client.websocket_connect("/ws/dashboard") as ws:
        pass  # connection established; server keeps it open until client disconnects


# POST / _____ endpoint FullResume model ______________________________________________:
def test_create_resume(api_mock_headers, dummy_payload):
    response = client.post("/resume/", json=dummy_payload, headers=api_mock_headers)
    assert response.status_code == 200, f"Create failed: {response.text}"
    assert not response.status_code == 400, f"Create failed: {response.text}"
    data = response.json()
    assert "id" in data, "Response does not contain an ID"
    client.delete(f"/resume/{data['id']}", headers=api_mock_headers)                 # <-- clean up:


# GET / _____ endpoint _______________________________________________________________:
def test_get_resume(created_resume, api_mock_headers):
    resume_id = created_resume
    response = client.get(f"/resume/{resume_id}", headers=api_mock_headers)
    assert response.status_code == 200, f"Get by ID failed: {response.text}"
    assert response.json()["resume"]["name"]["first_name"] == "Mock"
    assert response.json()["resume"]["name"]["last_name"] == "Test"


# GET /resume/ _____ endpoint _______________________________________________________________:
def test_get_all_resumes(api_mock_headers):
    """GET /resume/ returns 200 with a list (empty when no resumes)."""
    response = client.get("/resume/", headers=api_mock_headers)
    assert response.status_code == 200, f"Get all resumes failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected list but got {type(data)}"


# PUT /resume/ _____ deprecated (returns 410) ________________________________________________:
def test_put_resume_deprecated(created_resume, dummy_payload, api_mock_headers):
    response = client.put("/resume/", json=dummy_payload, headers=api_mock_headers)
    assert response.status_code == 410, f"Deprecated PUT / should return 410: {response.text}"
    assert "deprecated" in response.json().get("detail", "").lower()


# PUT /resume/{id} _____ endpoint (full update by ID) ________________________________________:
def test_update_resume(created_resume, dummy_payload, api_mock_headers):
    updated_payload = dummy_payload.copy()
    updated_payload["resume"]["summary"] = "Updated summary"
    response = client.put(f"/resume/{created_resume}", json=updated_payload, headers=api_mock_headers)
    assert response.status_code == 200, f"PUT update failed: {response.text}"
    assert response.json() == {"message": "Resume updated successfully:"}


# PUT /resume/bulk _____ endpoint _______________________________________________________________________________:
def test_bulk_update_resume(created_resume, dummy_payload, api_mock_headers):
    updated_payload = dummy_payload.copy()
    updated_payload["resume"]["summary"] = "Bulk updated summary"
    # Bulk uses first_name/last_name filter; mock has Mock/Test
    response = client.put("/resume/bulk?first_name=Mock&last_name=Test", json=updated_payload, headers=api_mock_headers)
    assert not response.status_code == 405, f"Bulk update failed: {response.text}"
    assert response.status_code == 200, f"Bulk update failed: {response.text}"
    assert "Matched" in response.json()["message"]


# PATCH /id _____ endpoint  _____________________________________________________________________________________:
def test_patch_resume_by_id(created_resume, api_mock_headers):
    patch_payload = {"resume": {"name": {"first_name": "Test", "last_name": "User"}, "summary": "Patched summary"}}
    response = client.patch(f"/resume/{created_resume}", json=patch_payload, headers=api_mock_headers)
    assert response.status_code == 200, f"PATCH by ID failed: {response.text}"
    assert "partially updated" in response.json()["message"]


# PATCH /by_name/ _____ endpoint  ________________________________________________________________________________:
def test_patch_resume_by_name(created_resume, api_mock_headers):
    patch_payload = {"resume": {"name": {"first_name": "Test", "last_name": "User"}, "summary": "Patched summary"}}
    response = client.patch("/resume/by_name/Mock_Test", json=patch_payload, headers=api_mock_headers)
    assert response.status_code == 200, f"PATCH by name failed: {response.text}"


# DELETE /resume_id _____ endpoint  ____________________________________________________________:
def test_delete_resume(api_mock_headers, dummy_payload):
    response = client.post("/resume/", json=dummy_payload, headers=api_mock_headers)
    assert response.status_code == 200, f"Create for delete failed: {response.text}"
    
    del_response = client.delete(f"/resume/{response.json().get("id")}", headers=api_mock_headers)
    assert del_response.status_code == 200, f"Delete failed: {del_response.text}"
    
    get_response = client.get(f"/resume/{response.json().get("id")}", headers=api_mock_headers)
    assert get_response.status_code == 404, "Deleted resume is still accessible"


# POST / _____ endpoint FullResume model ______________________________________________:
def test_create_resume_with_real_json(api_mock_headers, get_mocked_json):
    create_response = client.post("/resume/", json=get_mocked_json, headers=api_mock_headers)
    assert create_response.status_code == 200, f"Create failed: {create_response.text}"
    assert "id" in create_response.json(), "Response does not contain an ID"
    assert "Resume created successfully" in create_response.json()["message"], "Unexpected create message:"
    
    get_response = client.get(f"/resume/{create_response.json()["id"]}", headers=api_mock_headers)
    assert get_response.status_code == 200, f"Get resume failed: {get_response.text}"
    
    for field in ["name", "contact", "job_title", "summary"]:
        expected = get_mocked_json["resume"].get(field)
        actual = get_response.json()["resume"].get(field)
        assert expected == actual, f"Mismatch in resume {field}: expected {expected}, got {actual} instead:"
    
    expected_skills = get_mocked_json["resume"].get("skills")
    actual_skills = get_response.json()["resume"].get("skills")
    assert expected_skills == actual_skills, f"Mismatch in skills: expected {expected_skills}, got {actual_skills} instead:"
    
    delete_response = client.delete(f"/resume/{create_response.json()["id"]}", headers=api_mock_headers)
    assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
    assert "Resume deleted" in delete_response.json()["message"], "Unexpected delete message"


# ==================== Ubuntu Releases ========================================
def test_ubuntu_list(api_mock_headers):
    """GET /ubuntu-releases/ returns 200 with a list."""
    response = client.get("/ubuntu-releases/", headers=api_mock_headers)
    assert response.status_code == 200, f"List ubuntu failed: {response.text}"
    assert isinstance(response.json(), list)


def test_ubuntu_create_get_update_delete(created_ubuntu_release, ubuntu_release_payload, api_mock_headers):
    rid = created_ubuntu_release
    r = client.get(f"/ubuntu-releases/{rid}", headers=api_mock_headers)
    assert r.status_code == 200, f"Get ubuntu failed: {r.text}"
    assert r.json()["version"] == "9.10"
    assert r.json()["codename"] == "Karmic Koala"
    up = ubuntu_release_payload.copy()
    up["summary"] = "Updated summary"
    r2 = client.put(f"/ubuntu-releases/{rid}", json=up, headers=api_mock_headers)
    assert r2.status_code == 200, f"Update ubuntu failed: {r2.text}"
    r3 = client.get(f"/ubuntu-releases/{rid}", headers=api_mock_headers)
    assert r3.json()["summary"] == "Updated summary"


def test_ubuntu_delete(ubuntu_release_payload, api_mock_headers):
    r = client.post("/ubuntu-releases/", json=ubuntu_release_payload, headers=api_mock_headers)
    assert r.status_code == 200
    rid = r.json().get("id")
    dr = client.delete(f"/ubuntu-releases/{rid}", headers=api_mock_headers)
    assert dr.status_code == 200
    gr = client.get(f"/ubuntu-releases/{rid}", headers=api_mock_headers)
    assert gr.status_code == 404


def test_ubuntu_invalid_id(api_mock_headers):
    r = client.get("/ubuntu-releases/invalid-id-xyz", headers=api_mock_headers)
    assert r.status_code == 400


# ==================== Python Releases ========================================
def test_python_list(api_mock_headers):
    """GET /python-releases/ returns 200 with a list."""
    response = client.get("/python-releases/", headers=api_mock_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_python_create_get_update_delete(created_python_release, python_release_payload, api_mock_headers):
    rid = created_python_release
    r = client.get(f"/python-releases/{rid}", headers=api_mock_headers)
    assert r.status_code == 200
    assert r.json()["version"] == "3.12"
    up = python_release_payload.copy()
    up["summary"] = "Patched summary"
    r2 = client.put(f"/python-releases/{rid}", json=up, headers=api_mock_headers)
    assert r2.status_code == 200
    r3 = client.get(f"/python-releases/{rid}", headers=api_mock_headers)
    assert r3.json()["summary"] == "Patched summary"


def test_python_delete(python_release_payload, api_mock_headers):
    r = client.post("/python-releases/", json=python_release_payload, headers=api_mock_headers)
    assert r.status_code == 200
    rid = r.json().get("id")
    client.delete(f"/python-releases/{rid}", headers=api_mock_headers)
    gr = client.get(f"/python-releases/{rid}", headers=api_mock_headers)
    assert gr.status_code == 404


def test_python_invalid_id(api_mock_headers):
    r = client.get("/python-releases/badid", headers=api_mock_headers)
    assert r.status_code == 400


# ==================== Roman Leaders ========================================
def test_roman_list(api_mock_headers):
    """GET /roman-leaders/ returns 200 with a list."""
    response = client.get("/roman-leaders/", headers=api_mock_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_roman_create_get_update_delete(created_roman_leader, roman_leader_payload, api_mock_headers):
    rid = created_roman_leader
    r = client.get(f"/roman-leaders/{rid}", headers=api_mock_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Augustus"
    up = roman_leader_payload.copy()
    up["summary"] = "Updated reign summary"
    r2 = client.put(f"/roman-leaders/{rid}", json=up, headers=api_mock_headers)
    assert r2.status_code == 200
    r3 = client.get(f"/roman-leaders/{rid}", headers=api_mock_headers)
    assert r3.json()["summary"] == "Updated reign summary"


def test_roman_delete(roman_leader_payload, api_mock_headers):
    r = client.post("/roman-leaders/", json=roman_leader_payload, headers=api_mock_headers)
    assert r.status_code == 200
    rid = r.json().get("id")
    client.delete(f"/roman-leaders/{rid}", headers=api_mock_headers)
    gr = client.get(f"/roman-leaders/{rid}", headers=api_mock_headers)
    assert gr.status_code == 404


def test_roman_invalid_id(api_mock_headers):
    r = client.get("/roman-leaders/notvalid", headers=api_mock_headers)
    assert r.status_code == 400


######################################################################################################################################################

# @pytest.mark.parametrize(
#     "tag_id",
#     [
#         {
#             "test_name": "test_create_resume_with_real_json",
#             "expected_create_status": 200,
#             "expected_get_status": 200,
#             "expected_delete_status": 200
#         },
#         # you can add more test cases here if needed
#     ],
#     ids=lambda param: param["test_name"],
#     indirect=True
# )
# def test_create_resume_with_real_json(api_mock_headers, get_mocked_json, tag_id):
#     # ... create resume | inject test data JSON file:
#     create_response = client.post("/resume/", json=get_mocked_json, headers=api_headers)
#     assert create_response.status_code == tag_id["expected_create_status"], f"{tag_id['test_name']} failed at creation: {create_response.text}"
#     data = create_response.json()
#     assert "id" in data, "Response does not contain an ID"
#     assert "Resume created successfully" in data["message"], "Unexpected create message"
    
#     resume_id = data["id"]
    
#     # ... retrieve resume details:
#     get_response = client.get(f"/resume/{resume_id}", headers=api_headers)
#     assert get_response.status_code == tag_id["expected_get_status"], f"{tag_id['test_name']} failed at retrieval: {get_response.text}"
#     resume_data = get_response.json()
    
#     # ... verify keys JSON match:
#     for field in ["name", "contact", "job_title", "summary"]:
#         expected = get_mocked_json["resume"].get(field)
#         actual = resume_data["resume"].get(field)
#         assert expected == actual, \
#             f"{tag_id['test_name']} mismatch in {field}: expected {expected}, got {actual}"
    
#     # ... verify skills as an example: 
#     expected_skills = get_mocked_json["resume"].get("skills")
#     actual_skills = resume_data["resume"].get("skills")
#     assert expected_skills == actual_skills, \
#         f"{tag_id['test_name']} mismatch in skills: expected {expected_skills}, got {actual_skills}"
    
#     # .. clean up: delete injected test data:
#     delete_response = client.delete(f"/resume/{resume_id}", headers=api_headers)
#     assert delete_response.status_code == tag_id["expected_delete_status"], f"{tag_id['test_name']} failed at deletion: {delete_response.text}"
#     assert "Resume deleted" in delete_response.json()["message"], f"{tag_id['test_name']} unexpected delete message: {delete_response.json()['message']}"
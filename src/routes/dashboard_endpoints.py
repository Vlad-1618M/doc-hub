"""Dashboard stats endpoint - returns actual document counts for each collection."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from fastapi import APIRouter, Depends
from src.auth import auth_endpoints
from db import db as access_mongo

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", summary="Dashboard stats", response_description="Document counts per collection")
async def get_dashboard_stats(_auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt)):
    """Return actual document counts for resumes, ubuntu_releases, python_releases, roman_leaders, and api_keys."""
    resume_col = access_mongo.db_collections()
    ubuntu_col = access_mongo.get_ubuntu_releases_collection()
    python_col = access_mongo.get_python_releases_collection()
    roman_col = access_mongo.get_roman_leaders_collection()
    api_keys_col = access_mongo.get_api_keys_collection()

    return {
        "resumes": resume_col.count_documents({}),
        "ubuntu_releases": ubuntu_col.count_documents({}),
        "python_releases": python_col.count_documents({}),
        "roman_leaders": roman_col.count_documents({}),
        "api_keys": api_keys_col.count_documents({}),
    }

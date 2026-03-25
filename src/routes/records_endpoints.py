"""
Generic CRUD endpoints for record collections (ubuntu_releases, python_releases, roman_leaders).
Uses Option C: separate collections with type-specific schemas.
"""

import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional, TypeVar, Type, Callable, List, Tuple
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.auth import auth_endpoints
from src.auth.auth_models import AuthContext
from src.audit.audit_service import record_audit
from src.websocket_manager import manager as ws_manager
from logger import logger_main
from db import db as access_mongo
from src.models.record_models import UbuntuRelease, PythonRelease, RomanLeader

logger = logger_main.get_logger(__name__)

T = TypeVar("T")


def create_records_router(
    prefix: str,
    tag: str,
    collection_getter: Callable,
    model: Type[T],
    search_fields: List[str],
) -> APIRouter:
    """Factory to create CRUD router for a record collection."""

    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("/", summary=f"List {tag}", response_description="Paginated list")
    async def list_records(
        skip: int = Query(0, ge=0),
        limit: int = Query(25, le=100),
        q: Optional[str] = Query(None),
        _auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt),
    ):
        col = collection_getter()
        filter_q: dict = {}
        if q and q.strip():
            term = re.escape(q.strip())
            regex = {"$regex": term, "$options": "i"}
            filter_q["$or"] = [{f: regex} for f in search_fields]
        docs = list(col.find(filter_q).sort("_id", -1).skip(skip).limit(limit))
        for d in docs:
            d["_id"] = str(d["_id"])
        return docs

    @router.get("/{record_id}", summary=f"Get {tag} by ID")
    async def get_record(
        record_id: str,
        _auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt),
    ):
        col = collection_getter()
        try:
            obj_id = ObjectId(record_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ID")
        doc = col.find_one({"_id": obj_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        doc["_id"] = str(doc["_id"])
        return doc

    @router.post("/", summary=f"Create {tag}")
    async def create_record(
        payload: model,
        ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
    ):
        col = collection_getter()
        doc = payload.model_dump()
        doc["created_at"] = datetime.now(timezone.utc)
        rid = col.insert_one(doc).inserted_id
        await ws_manager.broadcast("refresh", {"collection": tag})
        logger.info(f"Created {tag} ID {rid}")
        record_audit("create", tag, str(rid), f"{tag.replace('_', ' ')} created", ctx=ctx)
        return {"message": f"{tag} created", "id": str(rid)}

    @router.put("/{record_id}", summary=f"Update {tag}")
    async def update_record(
        record_id: str,
        payload: model,
        ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
    ):
        col = collection_getter()
        try:
            obj_id = ObjectId(record_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ID")
        if col.count_documents({"_id": obj_id}) == 0:
            raise HTTPException(status_code=404, detail="Not found")
        update_data = payload.model_dump()
        update_data["updated_at"] = datetime.now(timezone.utc)
        col.update_one({"_id": obj_id}, {"$set": update_data})
        await ws_manager.broadcast("refresh", {"collection": tag})
        record_audit("update", tag, record_id, f"{tag.replace('_', ' ')} updated", ctx=ctx)
        return {"message": "Updated successfully"}

    @router.delete("/{record_id}", summary=f"Delete {tag}")
    async def delete_record(
        record_id: str,
        ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
    ):
        col = collection_getter()
        try:
            obj_id = ObjectId(record_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ID")
        result = col.delete_one({"_id": obj_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        await ws_manager.broadcast("refresh", {"collection": tag})
        record_audit("delete", tag, record_id, f"{tag.replace('_', ' ')} deleted", ctx=ctx)
        return {"message": "Deleted successfully"}

    return router


ubuntu_router = create_records_router(
    prefix="/ubuntu-releases",
    tag="ubuntu_releases",
    collection_getter=lambda: access_mongo.get_ubuntu_releases_collection(),
    model=UbuntuRelease,
    search_fields=["version", "codename", "summary"],
)

python_router = create_records_router(
    prefix="/python-releases",
    tag="python_releases",
    collection_getter=lambda: access_mongo.get_python_releases_collection(),
    model=PythonRelease,
    search_fields=["version", "status", "summary"],
)

roman_router = create_records_router(
    prefix="/roman-leaders",
    tag="roman_leaders",
    collection_getter=lambda: access_mongo.get_roman_leaders_collection(),
    model=RomanLeader,
    search_fields=["name", "title", "dynasty", "summary"],
)

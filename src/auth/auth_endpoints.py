#!/usr/bin/env python

import os
import secrets
import sys
from datetime import datetime, timezone
from bson import ObjectId
from fastapi.security import APIKeyHeader, HTTPBearer
from fastapi import APIRouter, HTTPException, Depends, Header

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from db import api_key_generator, db as access_mongo
from db.settings import settings
from src.websocket_manager import manager as ws_manager
from src.audit.audit_service import record_audit
from logger import logger_main
from . import auth_models
from .jwt_utils import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logger_main.get_logger(__name__)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


def _x_admin_secret_matches(x: str | None, expected: str) -> bool:
    """Compare after strip (CRLF / spaces from .env); timing-safe for non-empty expected."""
    if x is None:
        return False
    a, b = x.strip(), expected.strip()
    if len(a) != len(b):
        return False
    return secrets.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def require_admin_secret(x_admin_secret: str | None = Header(None, alias="X-Admin-Secret")):
    """If ADMIN_SECRET is set, require it for key generation. Otherwise allow (dev mode)."""
    if not settings.ADMIN_SECRET:
        return True
    if not _x_admin_secret_matches(x_admin_secret, settings.ADMIN_SECRET):
        raise HTTPException(status_code=403, detail="Admin secret required to generate API keys")
    return True


def require_admin_secret_or_jwt(
    x_admin_secret: str | None = Header(None, alias="X-Admin-Secret"),
    credentials=Depends(http_bearer),
):
    """Allow key generation with X-Admin-Secret OR valid JWT (for logged-in UI users)."""
    if not settings.ADMIN_SECRET:
        return True
    if _x_admin_secret_matches(x_admin_secret, settings.ADMIN_SECRET):
        return True
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and payload.get("sub"):
            return True
    raise HTTPException(status_code=403, detail="Admin secret or valid login required to generate API keys")


# --- Register & Login (user accounts, JWT) ---

@router.post("/register", summary="Create account", response_description="JWT and user")
async def register(req: auth_models.RegisterRequest):
    """Create a new user account. Returns JWT for immediate login."""
    users = access_mongo.get_users_collection()
    if users.find_one({"email": req.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    now = datetime.now(timezone.utc)
    doc = {
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name or "",
        "created_at": now,
    }
    result = users.insert_one(doc)
    user = {"id": str(result.inserted_id), "email": req.email, "name": req.name}
    token = create_access_token({"sub": req.email, "user_id": str(result.inserted_id)})
    logger.info(f"New account created: {req.email}")
    record_audit(
        "register",
        "user",
        str(result.inserted_id),
        f"Account registered: {req.email}",
        actor_user_id=str(result.inserted_id),
        actor_type="jwt",
    )
    return {"access_token": token, "user": user}


@router.post("/login", summary="Sign in", response_description="JWT and user")
async def login(req: auth_models.LoginRequest):
    """Sign in with email and password. Returns JWT."""
    users = access_mongo.get_users_collection()
    user_doc = users.find_one({"email": req.email.lower()})
    if not user_doc or not verify_password(req.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = {"id": str(user_doc["_id"]), "email": user_doc["email"], "name": user_doc.get("name") or None}
    token = create_access_token({"sub": user_doc["email"], "user_id": str(user_doc["_id"])})
    return {"access_token": token, "user": user}


# --- API key auth (for programmatic access) ---

def validate_api_key(api_key: str | None = Depends(api_key_header)):
    """Validate API key from MongoDB."""
    if not api_key:
        raise HTTPException(status_code=403, detail="Invalid API key.")
    api_keys_collection = access_mongo.get_api_keys_collection()
    if not api_keys_collection.find_one({"key": api_key}):
        logger.warning("Unauthorized API key attempt")
        raise HTTPException(status_code=403, detail="Invalid API key.")
    return True


def validate_api_key_or_jwt(
    api_key: str | None = Depends(api_key_header),
    credentials=Depends(http_bearer),
):
    """Accept either X-API-Key or Authorization: Bearer <jwt>."""
    if api_key:
        api_keys_collection = access_mongo.get_api_keys_collection()
        if api_keys_collection.find_one({"key": api_key}):
            return True
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and payload.get("sub"):
            return True
    raise HTTPException(status_code=403, detail="Invalid or missing API key or token.")


def resolve_auth_context(
    api_key: str | None = Depends(api_key_header),
    credentials=Depends(http_bearer),
) -> auth_models.AuthContext:
    """Validate API key or JWT and return the acting user (if known)."""
    if api_key:
        api_keys_collection = access_mongo.get_api_keys_collection()
        doc = api_keys_collection.find_one({"key": api_key})
        if doc:
            uid = doc.get("user_id")
            if uid is not None:
                uid = str(uid)
            return auth_models.AuthContext(user_id=uid, auth_type="api_key")
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and payload.get("sub"):
            uid = payload.get("user_id")
            if uid is not None:
                uid = str(uid)
            return auth_models.AuthContext(user_id=uid, auth_type="jwt")
    raise HTTPException(status_code=403, detail="Invalid or missing API key or token.")


def _get_user_id_from_jwt(credentials) -> str | None:
    """Extract user_id from JWT if present."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return payload.get("user_id") if payload else None


@router.post("/generate-api-key", summary="Generate a new API key", response_description="API Key")
async def generate_new_api_key(
    credentials=Depends(http_bearer),
    _: bool = Depends(require_admin_secret_or_jwt),
):
    """Generate and store a new API key. When called with JWT, associates key with that user."""
    new_key = api_key_generator.generate_api_key()
    api_keys_collection = access_mongo.get_api_keys_collection()
    now = datetime.now(timezone.utc)
    doc: dict = {"key": new_key, "created_at": now}
    user_id = _get_user_id_from_jwt(credentials)
    if user_id:
        doc["user_id"] = user_id
    api_keys_collection.insert_one(doc)
    await ws_manager.broadcast("refresh", {"collection": "api_keys"})

    logger.info("New API token generated" + (f" for user {user_id}" if user_id else ""))
    record_audit(
        "create",
        "api_key",
        None,
        "New API key generated",
        actor_user_id=user_id,
        actor_type="jwt" if user_id else "admin_secret",
    )
    return {"message": "New API key generated", "api_key": new_key, "user_id": user_id}

@router.get("/api-keys", summary="Retrieve existing API keys", response_description="List of API Keys")
async def get_existing_api_keys(_auth: bool = Depends(validate_api_key_or_jwt)):
    """Retrieve stored API keys with metadata (user_id, created_at) when available."""
    api_keys_collection = access_mongo.get_api_keys_collection()
    rows = list(api_keys_collection.find({}, {"_id": 0, "key": 1, "user_id": 1, "created_at": 1}))
    keys = [r["key"] for r in rows]
    if not keys:
        raise HTTPException(status_code=404, detail="No API keys found.")
    meta = {r["key"]: {"user_id": r.get("user_id"), "created_at": r.get("created_at")} for r in rows}
    return {"api_keys": keys, "meta": meta}


@router.get("/me", summary="Current user or key owner", response_description="User info and account/key age")
async def get_me(
    api_key: str | None = Depends(api_key_header),
    credentials=Depends(http_bearer),
):
    """Return current user from JWT or from API key's user_id. Includes created_at for age tracking."""
    users = access_mongo.get_users_collection()
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and payload.get("user_id"):
            user_doc = users.find_one({"_id": ObjectId(payload["user_id"])})
            if user_doc:
                return {
                    "user_id": str(user_doc["_id"]),
                    "email": user_doc["email"],
                    "name": user_doc.get("name"),
                    "account_created_at": user_doc.get("created_at"),
                    "auth_type": "jwt",
                }
    if api_key:
        api_keys_collection = access_mongo.get_api_keys_collection()
        key_doc = api_keys_collection.find_one({"key": api_key})
        if key_doc and key_doc.get("user_id"):
            user_doc = users.find_one({"_id": ObjectId(key_doc["user_id"])})
            if user_doc:
                return {
                    "user_id": str(user_doc["_id"]),
                    "email": user_doc["email"],
                    "name": user_doc.get("name"),
                    "account_created_at": user_doc.get("created_at"),
                    "key_created_at": key_doc.get("created_at"),
                    "auth_type": "api_key",
                }
        if key_doc:
            return {
                "user_id": None,
                "auth_type": "api_key",
                "key_created_at": key_doc.get("created_at"),
                "message": "Legacy key (no user association)",
            }
    raise HTTPException(status_code=403, detail="Invalid or missing authentication.")

@router.delete("/revoke-api-key", summary="Revoke an API key", response_description="Success message")
async def revoke_api_key(
    api_key_to_revoke: str,
    ctx: auth_models.AuthContext = Depends(resolve_auth_context),
):
    """Revoke (delete) a specific API key."""
    api_keys_collection = access_mongo.get_api_keys_collection()
    result = api_keys_collection.delete_one({"key": api_key_to_revoke})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found.")
    await ws_manager.broadcast("refresh", {"collection": "api_keys"})

    logger.info(f"API key revoked: {api_key_to_revoke}")
    record_audit("delete", "api_key", None, "API key revoked", ctx=ctx)
    return {"message": "API key revoked successfully"}


@router.delete("/users/{user_id}", summary="Delete user and their API keys", response_description="Success message")
async def delete_user(
    user_id: str,
    x_admin_secret: str | None = Header(None, alias="X-Admin-Secret"),
    credentials=Depends(http_bearer),
):
    """Delete a user account and all API keys associated with that user."""
    if not (settings.ADMIN_SECRET and x_admin_secret == settings.ADMIN_SECRET):
        if not credentials:
            raise HTTPException(status_code=403, detail="Admin or account owner required")
        payload = decode_token(credentials.credentials)
        if not payload or payload.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Admin or account owner required")
    users = access_mongo.get_users_collection()
    api_keys = access_mongo.get_api_keys_collection()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    keys_result = api_keys.delete_many({"user_id": user_id})
    users.delete_one({"_id": oid})
    logger.info(f"User {user_id} deleted with {keys_result.deleted_count} API keys")
    actor_uid: str | None = None
    actor_type = "admin_secret"
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and payload.get("user_id"):
            actor_uid = str(payload["user_id"])
            actor_type = "jwt"
    record_audit(
        "delete",
        "user",
        user_id,
        f"User account deleted ({keys_result.deleted_count} keys removed)",
        actor_user_id=actor_uid,
        actor_type=actor_type,
    )
    return {"message": "User and associated keys deleted", "keys_revoked": keys_result.deleted_count}


if __name__ == "__main__":
    pass



# something to thing abou: ______________________________________________________________________________
# Might be good ide to extend Auth Endpoints by additing two new endpoints to auth module that implement:
#   Count API Keys:      --> endpoint which returns the count of all existing API key tokens in DB:
#   Remove All API Keys: --> endpoint that removes all API key tokens at once:

#  __________ code thoughts: _________________________________________________________________________ 
# @router.get("/count_api_keys", summary="Count API keys", response_description="Number of API keys")
# async def count_api_keys(api_key: bool = Depends(validate_api_key)):
#     api_keys_collection = access_mongo.get_api_keys_collection()
#     count = api_keys_collection.count_documents({})
#     return {"count": count}

# @router.post("/remove_api_keys", summary="Remove all API keys", response_description="Success message")
# async def remove_api_keys(api_key: bool = Depends(validate_api_key)):
#     api_keys_collection = access_mongo.get_api_keys_collection()
#     result = api_keys_collection.delete_many({})
#     return {"message": "API keys removed successfully", "deleted_count": result.deleted_count}
# _______________________________________________________________________________________________________ 
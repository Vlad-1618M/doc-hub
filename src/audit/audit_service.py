"""Append-only audit events stored in MongoDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from db import db as access_mongo
from logger import logger_main
from src.auth.auth_models import AuthContext

logger = logger_main.get_logger(__name__)


def record_audit(
    action: str,
    resource: str,
    resource_id: str | None,
    summary: str,
    *,
    ctx: AuthContext | None = None,
    actor_user_id: str | None = None,
    actor_type: str | None = None,
) -> None:
    """Insert one audit row. Never raises — failures are logged only."""
    uid = ctx.user_id if ctx is not None else actor_user_id
    atype = ctx.auth_type if ctx is not None else (actor_type or "system")
    try:
        col = access_mongo.get_audit_events_collection()
        col.insert_one(
            {
                "at": datetime.now(timezone.utc),
                "actor_user_id": uid,
                "actor_type": atype,
                "action": action,
                "resource": resource,
                "resource_id": resource_id,
                "summary": summary,
            }
        )
    except Exception as exc:
        logger.warning("audit insert failed: %s", exc)


def list_audit_events(*, limit: int = 50, skip: int = 0) -> list[dict[str, Any]]:
    col = access_mongo.get_audit_events_collection()
    cursor = col.find().sort("at", -1).skip(skip).limit(limit)
    out: list[dict[str, Any]] = []
    for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if isinstance(doc.get("at"), datetime):
            doc["at"] = doc["at"].isoformat().replace("+00:00", "Z")
        out.append(doc)
    return out

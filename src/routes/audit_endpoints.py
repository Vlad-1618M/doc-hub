"""Read-only audit log for authenticated clients (dashboard Activity)."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from fastapi import APIRouter, Depends, Query

from src.auth import auth_endpoints
from src.audit.audit_service import list_audit_events
from src.models.audit_models import AuditEventOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "/events",
    summary="List recent audit events",
    response_description="Newest-first activity log",
    response_model=list[AuditEventOut],
)
async def get_audit_events(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    _auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt),
):
    rows = list_audit_events(limit=limit, skip=skip)
    return [AuditEventOut(**r) for r in rows]

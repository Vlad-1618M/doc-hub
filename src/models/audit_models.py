"""API models for audit / activity log."""

from pydantic import BaseModel, Field


class AuditEventOut(BaseModel):
    id: str
    at: str = Field(description="ISO-8601 UTC timestamp")
    actor_user_id: str | None = None
    actor_type: str
    action: str
    resource: str
    resource_id: str | None = None
    summary: str

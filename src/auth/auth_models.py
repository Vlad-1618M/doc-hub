from dataclasses import dataclass

from pydantic import BaseModel, EmailStr


@dataclass(frozen=True)
class AuthContext:
    """Resolved actor after API key or JWT validation."""

    user_id: str | None
    auth_type: str  # "jwt" | "api_key"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None

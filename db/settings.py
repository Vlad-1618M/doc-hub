"""Application settings with validation. Loads from cfgs/.env."""
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_admin_secret(v: object) -> str | None:
    """Treat blank / whitespace-only as unset so compose can pass ADMIN_SECRET= and match shell scripts."""
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return str(v) if v else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / "cfgs" / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    MONGO_HOST: str = "localhost"
    MONGO_PORT: int = 27017

    @field_validator("MONGO_PORT", mode="before")
    @classmethod
    def coerce_port(cls, v):
        if v in ("", None):
            return 27017
        return int(v) if isinstance(v, str) else v
    MONGO_USER: str = ""
    MONGO_PASS: str = ""
    MONGO_DB: str = "resume_db"
    MONGO_AUTH_DB: str = "resume_auth"  # Users in separate DB for conceptual separation
    JWT_SECRET: str = "change-me-in-production-use-env-var"
    ADMIN_SECRET: str | None = None  # If set, required for /auth/generate-api-key

    @field_validator("ADMIN_SECRET", mode="before")
    @classmethod
    def admin_secret_strip_empty(cls, v):
        return _normalize_admin_secret(v)

    @property
    def MONGO_URI(self) -> str:
        return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASS}@{self.MONGO_HOST}:{self.MONGO_PORT}/?authSource={self.MONGO_DB}"


settings = Settings()

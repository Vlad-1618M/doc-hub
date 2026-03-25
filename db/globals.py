"""Env config. Uses pydantic-settings for validation."""
from .settings import settings

MONGO_HOST = settings.MONGO_HOST
MONGO_PORT = settings.MONGO_PORT
MONGO_USER = settings.MONGO_USER
MONGO_PASS = settings.MONGO_PASS
MONGO_DB = settings.MONGO_DB
MONGO_AUTH_DB = settings.MONGO_AUTH_DB
MONGO_URI = settings.MONGO_URI

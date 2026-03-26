"""Pydantic models for document types beyond resumes (Option C - separate collections)."""

from pydantic import BaseModel, Field
from typing import Optional


class UbuntuRelease(BaseModel):
    """Ubuntu Linux release metadata."""
    version: str = ""
    codename: str = ""
    release_date: str = ""
    support_type: str = ""  # LTS or Interim
    eol_date: str = ""
    summary: str = ""
    notes: Optional[str] = None


class PythonRelease(BaseModel):
    """Python language version metadata."""
    version: str = ""
    release_date: str = ""
    eol_date: str = ""
    status: str = ""  # bugfix, security, eol, etc.
    summary: str = ""
    notes: Optional[str] = None


class RomanLeader(BaseModel):
    """Roman/Byzantine leader metadata."""
    name: str = ""
    title: str = ""
    reign_start: str = ""
    reign_end: str = ""
    dynasty: str = ""
    summary: str = ""
    notes: Optional[str] = None

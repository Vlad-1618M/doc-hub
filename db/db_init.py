#!/usr/bin/env python

import sys
from pathlib import Path

# Project root first so "db" resolves as package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import db as mongo_setup
import api_key_generator

sys.path.append(str(Path(__file__).resolve().parent.parent))
from logger import logger_main

logger = logger_main.get_logger(__name__)

def init_api_keys():
    """Initialize API keys collection if not already present."""
    from datetime import datetime, timezone
    api_keys_collection = mongo_setup.get_api_keys_collection()
    if not api_keys_collection.find_one({"key": {"$exists": True}}):
        generated_key = api_key_generator.generate_api_key()
        api_keys_collection.insert_one({"key": generated_key, "created_at": datetime.now(timezone.utc)})
        # print(f"\nGenerated and stored API Key: {generated_key}\n")
        print(f"\nGenerated Key: {generated_key[-8:]} stored successfully\n")
    else:
        print("\nAPI Key already exists.\n")

def init_users_collection():
    """Ensure users collection exists in auth DB, create index on email for lookups."""
    users = mongo_setup.get_users_collection()
    # Create email index for fast login lookups
    users.create_index("email", unique=True)
    # Note: For compliance, consider field-level encryption for password_hash, etc.
    print("\nUsers collection initialized (auth DB, email index).\n")

def init_resume_indexes():
    """Create indexes on resume collection for search performance."""
    resume_collection = mongo_setup.db_collections()
    for field in ["resume.name.first_name", "resume.name.last_name", "resume.job_title.position"]:
        resume_collection.create_index(field)
    logger.info("Resume indexes created: resume.name.first_name, resume.name.last_name, resume.job_title.position")


def init_audit_indexes():
    """Index audit log by time for dashboard activity queries."""
    col = mongo_setup.get_audit_events_collection()
    col.create_index([("at", -1)])
    logger.info("Audit events index created: at (desc)")


def init_record_indexes():
    """Create indexes on record collections for search performance."""
    for col_name, fields in [
        ("ubuntu_releases", ["version", "codename", "summary", "release_date"]),
        ("python_releases", ["version", "status", "summary", "release_date"]),
        ("roman_leaders", ["name", "title", "dynasty", "summary", "reign_start"]),
    ]:
        col = mongo_setup.get_db_client()[col_name]
        for f in fields:
            col.create_index(f)
    logger.info("Record indexes created: ubuntu_releases, python_releases, roman_leaders")


def resume_db_connect():
    """Connects to MongoDB and initializes the database structure: """
    db_client = mongo_setup.get_db_client()
    if "resume" not in db_client.list_collection_names():
        db_client["resume"].insert_one({"init": "placeholder"})        # <-- # safe db creation:

    resume_collection = mongo_setup.db_collections()                   # <-- Init db_collection_schema.yml data if empty:
    if resume_collection.count_documents({}) == 0:
        resume_collection.insert_one(mongo_setup.load_config())
        print("\nMongoDB init successful:\n\tCollections source --> db_collection_schema.yml")
    else:
        print("\nMongoDB already initialized.\n")

if __name__ == "__main__":
    init_api_keys()
    init_users_collection()
    resume_db_connect()
    init_resume_indexes()
    init_record_indexes()
    init_audit_indexes()

#!/usr/bin/env python

import os
import sys
import yaml
from pathlib import Path
from pymongo import MongoClient

# Project root first so "db" resolves as package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import globals
from logger import logger_main
from db.mongo_monitoring import register_command_listener_once

logger = logger_main.get_logger(__name__)
register_command_listener_once()

def load_config():
        """ .yml load """
        mongodb_schema = list(Path(__file__).resolve().parent.parent.glob('cfgs/*_schema.yml'))
        if not mongodb_schema:
            logger.warning(f".yml mongodb_schema config not found: {[_.name for _ in Path('cfgs').iterdir()]}")
            raise FileNotFoundError("\t.yml mongodb_schema config not found:")
        
        with open(mongodb_schema[0], 'r') as dbconfig:
            return yaml.safe_load(dbconfig)

def get_db_client():
    """Returns MongoDB database client"""
    client = MongoClient(globals.MONGO_URI)
    return client[globals.MONGO_DB]

def db_collections():
    """Returns the 'resume' collection"""
    return get_db_client()["resume"]


def get_ubuntu_releases_collection():
    """Returns the 'ubuntu_releases' collection."""
    return get_db_client()["ubuntu_releases"]


def get_python_releases_collection():
    """Returns the 'python_releases' collection."""
    return get_db_client()["python_releases"]


def get_roman_leaders_collection():
    """Returns the 'roman_leaders' collection."""
    return get_db_client()["roman_leaders"]


def get_api_keys_collection():
    """Returns the 'api_keys' collection"""
    return get_db_client()["api_keys"]


def get_audit_events_collection():
    """Returns the 'audit_events' collection (append-only activity log)."""
    return get_db_client()["audit_events"]


def get_auth_client():
    """Returns auth DB client (users stored separately for conceptual separation)."""
    return MongoClient(globals.MONGO_URI)[globals.MONGO_AUTH_DB]


def get_users_collection():
    """Returns the 'users' collection from auth DB."""
    return get_auth_client()["users"]

def debug_envs():
     resume_schema = load_config()
     [print(f"\nLoaded Collection Structure: -->\t{key}: {value}") for key, value in resume_schema.items()]
     print("="*70, end="\n\n")
     
     [print(f"Resume Collection Preview: -->\t{key}: {value}") for key, value in resume_schema.get("resume", {}).items()]
     print("="*70, end="\n\n")
     
     work_exp = resume_schema.get("resume", {}).get("Work_Experience", [])
     for indx, details in enumerate(work_exp, start=0):
        print(f"Work Experience Entry: -> {indx + 1} | {details}")
     print("="*70, end="\n\n")
     
     print("\n".join(map(lambda k: f"Mongo_DB {k[0]}: {os.getenv(k[1])}",[
          ("HOST", "MONGO_HOST"), ("PORT", "MONGO_PORT"), 
          ("User", "MONGO_USER"), ("Password", "MONGO_PASS"), 
          ("Database", "MONGO_DB"), ("URI", "MONGO_UR")])))
     
     print("\n---Done: ---\n")

if __name__ == "__main__":
     pass

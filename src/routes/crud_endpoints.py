#!/usr/bin/env python

import os
import re
import sys
from bson import ObjectId
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query

# ... maintaine root in sys.path:
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.auth import auth_endpoints
from src.auth.auth_models import AuthContext
from src.audit.audit_service import record_audit
from src.websocket_manager import manager as ws_manager
from logger import logger_main
from db import db as access_mongo
from src.models import base_models

router = APIRouter(prefix="/resume", tags=["resume"])
logger = logger_main.get_logger(__name__)

# ... MongoDB collection configs:
def get_resume_collection():
    return access_mongo.db_collections()

def get_config_collection():
    return access_mongo.load_config()


# POST / _____ endpoint to create a new resume -> FullResume model ___________________________________________________:
@router.post("/", summary="Create a new resume", response_description="New resume ID:")
async def create_resume(
    full_resume: base_models.FullResume,
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Insert a new resume data into MongoDB:
        args: 
            full_resume: --> [base_models.FullResume ]: FullResume object containing all resume details:
            api_key:     --> (bool): API key validation dependency:
        returns: dict:   --> Message confirming creation and the new resume's ID: """
    
    resume_collection = get_resume_collection()
    resume_dict = full_resume.model_dump()
    resume_dict["created_at"] = {"t": {"$date": datetime.now(timezone.utc).isoformat()}}
    resume_id = resume_collection.insert_one(resume_dict).inserted_id
    await ws_manager.broadcast("refresh", {"collection": "resumes"})
    logger.info(f"New resume created: ID --> {resume_id}")
    nm = full_resume.resume.name
    label = f"{nm.first_name} {nm.last_name}".strip() or "Resume"
    record_audit("create", "resume", str(resume_id), f"Resume created: {label}", ctx=ctx)
    return {"message": "Resume created successfully", "id": str(resume_id)}


# GET / _____ endpoint to retrieve paginated resume data __________________________:
@router.get("/", summary="Retrieve resume data", response_description="Resume data")
async def get_resume(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(25, le=100, description="Number of records to return"),
    q: Optional[str] = Query(None, description="Search by name or job title"),
    _auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt),
):
    """ Retrieve paginated resume summaries from MongoDB. Use skip/limit for pagination, q for search.
        args:
            skip:    --> (int ): Number of records to skip [default: 0]:
            limit:   --> (int ): Number of records to return [default: 25, max: 100]:
            q:       --> (str ): Optional search term (name or job title):
        returns:     --> (list): List of resume summary objects: """
    resume_collection = get_resume_collection()
    filter_q: dict = {}
    if q and q.strip():
        term = re.escape(q.strip())
        regex = {"$regex": term, "$options": "i"}
        filter_q["$or"] = [
            {"resume.name.first_name": regex},
            {"resume.name.last_name": regex},
            {"resume.job_title.position": regex},
        ]
    resumes = list(resume_collection.find(
        filter_q,
        {
            "_id": 1,
            "resume.name": 1,
            "resume.contact": 1,
            "resume.job_title.position": 1,
            "resume.job_title.role": 1,
            "created_at": 1,
            "updated_at": 1
        }
    ).sort("_id", -1).skip(skip).limit(limit))
    
    for resume in resumes:
        resume["_id"] = str(resume["_id"])
    return resumes

# GET /{resume_id} _____ endpoint to retrieve a resume by ID ______________________________________:
@router.get("/{resume_id}", summary="Get resume by ID", response_description="Resume details")
async def get_resume_by_id(resume_id: str, _auth: bool = Depends(auth_endpoints.validate_api_key_or_jwt)):
    """ Retrieve a single resume by its ID:
        args:
            resume_id: --> (str): Unique identifier of the resume:
            api_key:   --> (bool): API key validation dependency:
        raises:        --> HTTPException: 400 if resume_id is invalid:
                       --> HTTPException: 404 if the resume is not found:
        returns:       --> (dict): The complete resume details: """
    resume_collection = get_resume_collection()
    try:
        obj_id = ObjectId(resume_id)
    except Exception as error:
        logger.warning(f"Invalid resume_id: {resume_id}\t {error}")
        raise HTTPException(status_code=400, detail="Invalid resume_id:")
    
    resume = resume_collection.find_one({"_id": obj_id})
    if not resume:
        logger.warning(f"Resume with ID {resume_id} not found:")
        raise HTTPException(status_code=404, detail="Resume not found:")
    
    resume["_id"] = str(resume["_id"])
    return resume


# PUT / _____ DEPRECATED — use PUT /{resume_id} instead _______________________________________________:
@router.put("/", summary="[DEPRECATED] Use PUT /{id} instead", deprecated=True)
async def update_full_resume_deprecated(api_key: bool = Depends(auth_endpoints.validate_api_key)):
    """ DEPRECATED: This endpoint updated the first resume found (unsafe). Use PUT /resume/{{resume_id}} instead. """
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use PUT /resume/{resume_id} to update a specific resume by ID.",
    )

# PUT / bulk _____ endpoint to update multiple resumes ___________________________________________:
@router.put("/bulk", summary="Bulk update resume details", response_description="Success message")
async def bulk_update_resume(
    full_resume: base_models.FullResume,
    first_name: Optional[str] = Query(None, description="Filter resumes by first name"),
    last_name: Optional[str] = Query(None, description="Filter resumes by last name"),
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Bulk update resume details:
        args:
            full_resume: --> (base_models.FullResume): FullResume object containing fields to update:
            first_name:  --> (Optional[str]): Optional filter for resume's first name:
            last_name:   --> (Optional[str]): Optional filter for resume's last name:
            api_key:     --> (bool): API key validation dependency:
        raises:          --> HTTPException: 400 if no filter is provided to avoid updating all documents:
        returns:         --> dict: A message indicating the number of matched and modified resumes: """
    
    resume_collection = get_resume_collection()
    filter_dict = {}
    if first_name:
        filter_dict["resume.name.first_name"] = {"$regex": f"^{first_name}$", "$options": "i"}
    if last_name:
        filter_dict["resume.name.last_name"] = {"$regex": f"^{last_name}$", "$options": "i"}
    
    if not filter_dict:
        raise HTTPException(status_code=400, detail="No filter provided; refusing to update all documents:")
    
    update_data = full_resume.model_dump()
    update_data["updated_at"] = {"t": {"$date": datetime.now(timezone.utc).isoformat()}}
    result = resume_collection.update_many(filter_dict, {"$set": update_data})
    if result.modified_count:
        await ws_manager.broadcast("refresh", {"collection": "resumes"})
    logger.info(f"Bulk update: Matched {result.matched_count}, Modified {result.modified_count}")
    record_audit(
        "bulk_update",
        "resume",
        None,
        f"Bulk update resumes: matched {result.matched_count}, modified {result.modified_count}",
        ctx=ctx,
    )
    return {"message": f"Bulk update successful: Matched {result.matched_count} and Modified {result.modified_count} resumes:"}


# PUT /{resume_id} _____ endpoint to update a specific resume by ID ___________________________________________________________________________:
@router.put("/{resume_id}", summary="Update a specific resume", response_description="Success message")
async def update_specific_resume(
    resume_id: str,
    full_resume: base_models.FullResume,
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Update a specific resume identified by its ID:
        args:
            resume_id:   --> (str): Unique identifier of the resume to update:
            full_resume: --> (base_models.FullResume): FullResume object with updated resume details:
            api_key:     --> (bool): API key validation dependency:
        raises:          --> HTTPException: 404 if the resume with the given ID is not found:
        returns:         --> dict: A message confirming that the resume was updated successfully: """
    resume_collection = get_resume_collection()
    obj_id = ObjectId(resume_id)
    if resume_collection.count_documents({"_id": obj_id}) == 0:
        raise HTTPException(status_code=404, detail="Resume not found:")
    update_data = full_resume.model_dump()
    update_data["updated_at"] = {"t": {"$date": datetime.now(timezone.utc).isoformat()}}
    resume_collection.update_one({"_id": obj_id}, {"$set": update_data})
    await ws_manager.broadcast("refresh", {"collection": "resumes"})
    record_audit("update", "resume", resume_id, "Resume updated (full replace)", ctx=ctx)
    return {"message": "Resume updated successfully:"}


# PATCH /{resume_id} _____ endpoint to partially update a resume by ID _________________________________________:
@router.patch("/{resume_id}", summary="Partially update resume details", response_description="Success message")
async def update_resume_by_id(
    resume_id: str,
    updated_data: base_models.FullResumeUpdate,
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Partially update resume details by ID:
        args:
            resume_id:      --> (str): Unique identifier for the resume:
            updated_data:   --> (base_models.FullResumeUpdate): Partial update object with fields to update:
            api_key:        --> (bool): API key validation dependency:
        raises:             --> HTTPException: 400 if resume_id is invalid:
                            --> HTTPException: 404 if no resume is found with the given ID:
        returns:            --> dict: A message confirming that the resume was partially updated successfully: """
    try:
        resume_collection = get_resume_collection()
        obj_id = ObjectId(resume_id)
    except Exception as error:
        logger.warning(f"Invalid resume_id: {resume_id}\t {error}")
        raise HTTPException(status_code=400, detail="Invalid resume_id.")
    
    resume = resume_collection.find_one({"_id": obj_id})
    if not resume:
        logger.warning(f"Attempt to update resume with ID {resume_id} that does not exist:")
        raise HTTPException(status_code=404, detail=f"Resume with ID {resume_id} not found:")
    
    update_dict = {k: v for k, v in updated_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = {"t": {"$date": datetime.now(timezone.utc).isoformat()}}
    resume_collection.update_one({"_id": obj_id}, {"$set": update_dict})
    await ws_manager.broadcast("refresh", {"collection": "resumes"})
    logger.info(f"Resume with ID {resume_id} partially updated successfully:")
    record_audit("update", "resume", resume_id, "Resume updated (partial)", ctx=ctx)
    return {"message": f"Resume with ID {resume_id} partially updated successfully:"}


# PATCH /by_name/{first_name}_{last_name} _____ endpoint to partially update a resume by name ______________________________________________:
@router.patch("/by_name/{first_name}_{last_name}", summary="Partially update resume details by name", response_description="Success message")
async def update_resume_by_name(
    first_name: str,
    last_name: str,
    updated_data: base_models.FullResumeUpdate,
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Partially update resume details by first and last name:
        args:
            first_name:     --> (str): First name of the resume to update:
            last_name:      --> (str): Last name of the resume to update:
            updated_data:   --> (base_models.FullResumeUpdate): Partial update object with fields to update:
            api_key:        --> (bool): API key validation dependency:
        raises:             --> HTTPException: 404 if no resume matches the given names:
        returns:            --> dict: A message confirming that the resume was updated successfully: """
    
    regxr_query = {
        "resume.name.first_name": {"$regex": f"^{first_name}$", "$options": "i"},
        "resume.name.last_name": {"$regex": f"^{last_name}$", "$options": "i"}}
    
    resume_collection = get_resume_collection()
    resumes = list(resume_collection.find(regxr_query))
    if not resumes:
        logger.warning(f"Attempt to update resume with name '{first_name} {last_name}' that does not exist:")
        raise HTTPException(status_code=404, detail=f"Resume with name '{first_name} {last_name}' not found:")
    
    resume_id = ObjectId(resumes[0]["_id"])
    update_dict = {key: value for key, value in updated_data.model_dump().items() if value is not None}
    update_dict["updated_at"] = {"t": {"$date": datetime.now(timezone.utc).isoformat()}}
    resume_collection.update_one({"_id": resume_id}, {"$set": update_dict})
    await ws_manager.broadcast("refresh", {"collection": "resumes"})
    logger.info(f"Resume with ID '{resume_id}' updated successfully:")
    record_audit(
        "update",
        "resume",
        str(resume_id),
        f"Resume updated by name: {first_name} {last_name}",
        ctx=ctx,
    )
    return {"message": f"Resume with ID '{resume_id}' updated successfully:"}


# DELETE /{resume_id} _____ endpoint to delete a resume ________________________________________:
@router.delete("/{resume_id}", summary="Delete a resume", response_description="Success message")
async def delete_resume(
    resume_id: str,
    ctx: AuthContext = Depends(auth_endpoints.resolve_auth_context),
):
    """ Delete a specific resume by its ID:
        args:
            resume_id: --> (str): Unique identifier of the resume to delete:
            api_key:   --> (bool): API key validation dependency:
        raises:        --> HTTPException: 400 if resume_id is invalid:
                       --> HTTPException: 404 if the resume is not found:
        returns:       --> dict: A message confirming that the resume was deleted successfully: """
    try:
        resume_collection = get_resume_collection()
        obj_id = ObjectId(resume_id)
    except Exception as error:
        logger.warning(f"Invalid resume_id for deletion: {resume_id}\t {error}")
        raise HTTPException(status_code=400, detail="Invalid resume_id.")
    
    result = resume_collection.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        logger.warning(f"Attempt to delete non-existent resume ID: {resume_id}")
        raise HTTPException(status_code=404, detail="Resume not found:")
    await ws_manager.broadcast("refresh", {"collection": "resumes"})
    logger.info(f"Resume deleted: {resume_id}")
    record_audit("delete", "resume", resume_id, "Resume deleted", ctx=ctx)
    return {"message": "Resume deleted successfully"}


# GET /status/health check _____ endpoint _____________________________________________:
@router.get("/status/health", summary="Health check", response_description="API status")
async def health_check():
    """ Return the API health status:
        returns: -->  dict: A JSON object with the API status: """
    return {"status": "healthy"}


if __name__ == "__main__":
    pass
    # # ____________  debug calls _______________________________
    # import json
    # from src.helpers.timer import COLORS as cl
    # default_resume = get_config_collection()
    # line_decorator = (f"{cl['gray']}={cl['off']}"*100)
    # print(f'{cl["mgnta"]}{json.dumps(default_resume, indent=4)}')
    # print(line_decorator)
    # print(f'{resume_collection}, end=\n{line_decorator}')
    # print(line_decorator)
    # print(f'{default_resume}, end=\n{line_decorator}')
    # print(line_decorator)
    # [print(f'{cl["mgnta"]}{idx}\t{cl["green"]}{data}') for idx, data in enumerate(default_resume['resume'].items(), start=1)]
    # print(line_decorator)
    # [print(f"{cl["mgnta"]}collection item index: {cl["yellow"]}{idx:>2} | {cl["white"]}associated data: -> {cl["cyan"]}{data}") for idx, data in enumerate(default_resume['resume'].items(), start=1)]
    # print(line_decorator)
    # [print(f'{cl["mgnta"]}{idx}\t{cl["green"]}{data}') for idx, data in enumerate(default_resume['resume']['name'].items(), start=1)]
    # print(line_decorator)
    # [print(f"Management Tools collection item index: {cl["gray"]}{idx:>2} | {cl["mgnta"]}associated data: -> {cl["yellow"]}{data}") for idx, data in enumerate(default_resume['resume']['skills']['Management_Tools'].items(), start=1)]
    # print(line_decorator)
    # [print(f"Work Experience collection item index: {cl["gray"]}{idx:>2} | {cl["mgnta"]}associated data: -> {cl["yellow"]}{data}") for idx, data in enumerate(default_resume['resume']['Work_Experience'], start=1)]
    # print(line_decorator)


# ---------------: .... Endpoint enhancements thoughts .... : --------------------------------------------------------------------
# --- : GET resume by name: To fetch detailed resume data by full name:
# --- : perhaps a room for use of asynchronous database operations like Motor | see if driver supports it for MongoDB:
# --- : DRYout code by reduceing repeated logic around ObjectId conversions | some external modul as helper functions: <-- FIX ME:
# --------------------------------------------------------------------------------------------------------------------------------

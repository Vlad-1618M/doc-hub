#!/usr/bin/env python

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

# ______________ Building Blocks __________________: 

# ___ Name Model: --> defines essential name fields:
class Name(BaseModel):
    first_name: str
    last_name: str

# ___ Address Model: --> defines location details:
class Address(BaseModel):
    country: str = ""
    state: str = ""
    city: str = ""
    zip_code: str = ""
    timezone: str = ""

# ___ Contact Model: --> defines communication details:
class Contact(BaseModel):
    email: str = ""
    phone: str = ""

# ___ JobTitle Model: --> defines role information:
class JobTitle(BaseModel):
    position: str = ""
    role: str = ""

# ___ LocationWrapperL: --> groups an Address fields:
class LocationWrapper(BaseModel):
    address: Address = Field(default_factory=Address)


# ______________ Resume Structure for Initial POST ___________________________________________________:
# BasicResumeData: --> essential information required to create a new resume | init + minimal payload:
class BasicResumeData(BaseModel):
    name: Name
    location: LocationWrapper = Field(default_factory=LocationWrapper)
    contact: Contact = Field(default_factory=Contact)
    job_title: JobTitle = Field(default_factory=JobTitle)

# ______________  Extended Resume Structure for Incremental Updates ____________________________________________________________________:
# ExtendedResumeData: --> builds on top of BasicResumeData + additional fields: | subsequent updates --> PUT/PATCH to enrich the resume:
class ExtendedResumeData(BasicResumeData):
    summary: Optional[str] = None
    skills: Dict[str, Dict] = Field(default_factory=dict)
    Programming_Languages: Dict[str, Any] = Field(default_factory=dict)
    Automation: Dict[str, Any] = Field(default_factory=dict)
    Testing: Dict[str, Any] = Field(default_factory=dict)
    Development_Tools: Dict[str, Any] = Field(default_factory=dict)
    Web_Technologies: Dict[str, Any] = Field(default_factory=dict)
    Build_Tools: Dict[str, Any] = Field(default_factory=dict)
    DevOps: Dict[str, Any] = Field(default_factory=dict)
    Microservices: Dict[str, Any] = Field(default_factory=dict)
    Databases: Dict[str, Any] = Field(default_factory=dict)
    Version_Control: Dict[str, Any] = Field(default_factory=dict)
    OS_Architecture: Dict[str, Any] = Field(default_factory=dict)
    Virtualization_Compute: Dict[str, Any] = Field(default_factory=dict)
    Network_Protocols: Dict[str, Any] = Field(default_factory=dict)
    Management_Tools: Dict[str, Dict] = Field(default_factory=dict)

# ______________ Additional Sections ___________:

# ___ WorkExperience Model: --> defines work history details:
class WorkExperience(BaseModel):
    org_name: str = ""
    location: str = ""
    employment_length: str = ""
    role: str = ""
    job_description: str = ""

# ___ Education Model: --> defines academic background.
class Education(BaseModel):
    degree: str = ""
    location: str = ""
    majored_in: str = ""

# ______________ Full Resume Model ___________:
# FullResume: --> wraps resume data + additional sections by ExtendedResumeData model [ e.g work experience / education ]
class FullResume(BaseModel):
    resume: ExtendedResumeData
    Work_Experience: List[WorkExperience] = Field(default_factory=list)
    education: Education = Field(default_factory=Education)
    work_authorization: Optional[str] = None
    reference: Dict[str, str] = Field(default_factory=dict)
    links: Dict[str, Dict] = Field(default_factory=dict)
    notes: Optional[str] = None

# ___ Optional Model: --> for Partial Updates ___________:
class FullResumeUpdate(BaseModel):
    resume: Optional[ExtendedResumeData] = None
    Work_Experience: Optional[List[WorkExperience]] = None
    education: Optional[Education] = None
    work_authorization: Optional[str] = None
    reference: Optional[Dict[str, str]] = None
    links: Optional[Dict[str, Dict]] = None
    notes: Optional[str] = None

# ________________________________________________________________________________________________ : 
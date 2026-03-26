export interface Name {
  first_name: string
  last_name: string
}

export interface Address {
  country: string
  state: string
  city: string
  zip_code: string
  timezone: string
}

export interface Contact {
  email: string
  phone: string
}

export interface JobTitle {
  position: string
  role: string
}

export interface WorkExperience {
  org_name: string
  location: string
  employment_length: string
  role: string
  job_description: string
}

export interface Education {
  degree: string
  location: string
  majored_in: string
}

/** Parse backend timestamp format: { t: { $date: "ISO" } } or ISO string */
export type TimestampLike = string | { t?: { $date?: string } } | undefined

export interface FullResume {
  _id?: string
  created_at?: string
  updated_at?: string
  resume: {
    name: Name
    location?: { address: Address }
    contact?: Contact
    job_title?: JobTitle
    summary?: string
    skills?: Record<string, unknown>
    [key: string]: unknown
  }
  Work_Experience?: WorkExperience[]
  education?: Education
  work_authorization?: string
  reference?: Record<string, string>
  links?: Record<string, Record<string, string>>
  notes?: string
}

export interface ResumeListItem {
  _id: string
  resume: {
    name: Name
    job_title?: JobTitle
  }
  created_at?: string
}

export interface UbuntuRelease {
  _id?: string
  created_at?: string
  updated_at?: string
  version: string
  codename: string
  release_date: string
  support_type: string
  eol_date: string
  summary: string
  notes?: string
}

export interface PythonRelease {
  _id?: string
  created_at?: string
  updated_at?: string
  version: string
  release_date: string
  eol_date: string
  status: string
  summary: string
  notes?: string
}

export interface RomanLeader {
  _id?: string
  created_at?: string
  updated_at?: string
  name: string
  title: string
  reign_start: string
  reign_end: string
  dynasty: string
  summary: string
  notes?: string
}

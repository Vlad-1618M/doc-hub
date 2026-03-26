import type { FullResume } from '../types'

export const mockResumes: FullResume[] = [
  {
    _id: '1',
    resume: {
      name: { first_name: 'George', last_name: 'Washington' },
      location: { address: { country: 'USA', state: 'Virginia', city: 'Mount Vernon', zip_code: '22121', timezone: 'EST' } },
      contact: { email: 'george.washington@example.com', phone: '+1-703-555-1776' },
      job_title: { position: '1st President of the United States', role: 'Revolutionary Leader, Founding Father' },
      summary: 'George Washington, the first President of the United States and a key Founding Father, led the nation through its early years and established the executive branch.',
    },
    Work_Experience: [
      { org_name: 'United States Government', location: 'Washington, D.C.', employment_length: '1789 - 1797', role: 'President', job_description: 'Established the foundation of the U.S. government.' },
      { org_name: 'Continental Army', location: 'United States', employment_length: '1775 - 1783', role: 'Commander-in-Chief', job_description: 'Led the American Revolutionary War effort.' },
    ],
    education: { degree: 'Self-Educated', location: 'Virginia', majored_in: 'Military Science, Leadership' },
    work_authorization: 'US Citizen',
    notes: 'Leadership shaped the U.S. presidency and set precedents for governance.',
  },
  {
    _id: '2',
    resume: {
      name: { first_name: 'John', last_name: 'F Kennedy' },
      location: { address: { country: 'USA', state: 'Massachusetts', city: 'Brookline', zip_code: '02446', timezone: 'EST' } },
      contact: { email: 'jfk@example.com', phone: '+1-617-555-1961' },
      job_title: { position: '35th President of the United States', role: 'Commander-in-Chief, Diplomatic Leader' },
      summary: 'John F. Kennedy was known for his leadership during the Cold War, commitment to civil rights, and vision for space exploration.',
    },
    Work_Experience: [
      { org_name: 'United States Government', location: 'Washington, D.C.', employment_length: '1961 - 1963', role: 'President', job_description: 'Led through Cuban Missile Crisis, launched Apollo.' },
      { org_name: 'U.S. Navy', location: 'Pacific Theater', employment_length: '1941 - 1945', role: 'Lieutenant', job_description: 'Commanded PT-109, earned Navy and Marine Corps Medal.' },
    ],
    education: { degree: 'Bachelor of Science', location: 'Harvard University', majored_in: 'International Affairs & Government' },
    work_authorization: 'US Citizen',
    notes: 'Vision for civil rights and space exploration left a lasting impact.',
  },
  {
    _id: '3',
    resume: {
      name: { first_name: 'Elizabeth', last_name: 'Chen' },
      location: { address: { country: 'USA', state: 'California', city: 'San Francisco', zip_code: '94102', timezone: 'PST' } },
      contact: { email: 'elizabeth.chen@example.com', phone: '+1-415-555-2048' },
      job_title: { position: 'Senior Product Manager', role: 'B2B SaaS, Data Platforms' },
      summary: 'Product leader with 8+ years driving roadmap and go-to-market for enterprise software. Passionate about user-centric design and data-driven decisions.',
    },
    Work_Experience: [
      { org_name: 'TechCorp Inc.', location: 'San Francisco, CA', employment_length: '2020 - Present', role: 'Senior Product Manager', job_description: 'Own product strategy for analytics platform. Led cross-functional teams of 12.' },
      { org_name: 'DataFlow Solutions', location: 'Remote', employment_length: '2016 - 2020', role: 'Product Manager', job_description: 'Grew ARR by 40% through new feature launches and enterprise expansions.' },
    ],
    education: { degree: 'MBA', location: 'Stanford GSB', majored_in: 'Technology & Innovation' },
    work_authorization: 'US Citizen',
    notes: 'Strong fit for PM roles in B2B data/analytics.',
  },
]

export const mockApiKeys = [
  { key: 'hr_team_••••••••••••••••', lastUsed: '2 hours ago' },
  { key: 'ats_integration_••••••••', lastUsed: '1 day ago' },
]

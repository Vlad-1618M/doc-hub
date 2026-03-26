import type { FullResume } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface ResumeListParams {
  skip?: number
  limit?: number
  q?: string
}

export async function createResume(
  token: string | null,
  body: Omit<FullResume, '_id'> & { resume: FullResume['resume'] }
): Promise<{ id: string }> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const payload = buildResumePayload(body)
  const res = await fetch(`${API_BASE}/resume/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return { id: data.id }
}

export async function fetchResumeList(
  token: string | null,
  params: ResumeListParams = {}
): Promise<FullResume[]> {
  const { skip = 0, limit = 25, q } = params
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const searchParams = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (q?.trim()) searchParams.set('q', q.trim())
  const res = await fetch(`${API_BASE}/resume/?${searchParams}`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeResumeItem) : []
}

export async function updateResume(
  token: string | null,
  id: string,
  body: Omit<FullResume, '_id'> & { resume: FullResume['resume'] }
): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const payload = buildResumePayload(body)
  const res = await fetch(`${API_BASE}/resume/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(res.statusText)
}

function buildResumePayload(data: Omit<FullResume, '_id'>): Record<string, unknown> {
  const resume = data.resume ?? {}
  return {
    resume: {
      ...resume,
      name: resume.name ?? { first_name: '', last_name: '' },
      location: resume.location ?? { address: { country: '', state: '', city: '', zip_code: '', timezone: '' } },
      contact: resume.contact ?? { email: '', phone: '' },
      job_title: resume.job_title ?? { position: '', role: '' },
      summary: resume.summary ?? null,
    },
    Work_Experience: data.Work_Experience ?? [],
    education: data.education ?? { degree: '', location: '', majored_in: '' },
    work_authorization: data.work_authorization ?? null,
    reference: data.reference ?? {},
    links: data.links ?? {},
    notes: data.notes ?? null,
  }
}

export async function fetchResumeById(token: string | null, id: string): Promise<FullResume | null> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/resume/${id}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return normalizeResumeItem(data)
}

function parseTimestamp(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  const obj = v as Record<string, unknown>
  const t = obj?.t as Record<string, string> | undefined
  return t?.['$date'] ?? t?.$date
}

function normalizeResumeItem(raw: Record<string, unknown>): FullResume {
  const id = raw._id != null ? String(raw._id) : ''
  const resume = (raw.resume ?? {}) as FullResume['resume']
  const name = resume?.name ?? { first_name: '', last_name: '' }
  return {
    _id: id,
    created_at: parseTimestamp(raw.created_at),
    updated_at: parseTimestamp(raw.updated_at),
    resume: {
      ...resume,
      name: { first_name: name.first_name ?? '', last_name: name.last_name ?? '' },
      contact: resume?.contact ?? { email: '', phone: '' },
      job_title: resume?.job_title ?? { position: '', role: '' },
    },
    Work_Experience: (raw.Work_Experience as FullResume['Work_Experience']) ?? [],
    education: raw.education as FullResume['education'],
    work_authorization: raw.work_authorization as string | undefined,
    notes: raw.notes as string | undefined,
    reference: raw.reference as FullResume['reference'],
    links: raw.links as FullResume['links'],
  }
}

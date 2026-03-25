import type { UbuntuRelease, PythonRelease, RomanLeader } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface RecordListParams {
  skip?: number
  limit?: number
  q?: string
}

type RecordItem = (UbuntuRelease & { _id: string }) | (PythonRelease & { _id: string }) | (RomanLeader & { _id: string })

async function fetchRecordListBase<T extends RecordItem>(
  path: string,
  token: string | null,
  params: RecordListParams = {}
): Promise<T[]> {
  const { skip = 0, limit = 25, q } = params
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const searchParams = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (q?.trim()) searchParams.set('q', q.trim())
  const res = await fetch(`${API_BASE}${path}?${searchParams}`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchRecordByIdBase<T extends RecordItem>(
  path: string,
  token: string | null,
  id: string
): Promise<T | null> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}/${id}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function fetchUbuntuReleases(
  token: string | null,
  params: RecordListParams = {}
): Promise<(UbuntuRelease & { _id: string })[]> {
  return fetchRecordListBase<UbuntuRelease & { _id: string }>('/ubuntu-releases/', token, params)
}

export async function fetchUbuntuReleaseById(
  token: string | null,
  id: string
): Promise<(UbuntuRelease & { _id: string }) | null> {
  return fetchRecordByIdBase<UbuntuRelease & { _id: string }>('/ubuntu-releases', token, id)
}

export async function fetchPythonReleases(
  token: string | null,
  params: RecordListParams = {}
): Promise<(PythonRelease & { _id: string })[]> {
  return fetchRecordListBase<PythonRelease & { _id: string }>('/python-releases/', token, params)
}

export async function fetchPythonReleaseById(
  token: string | null,
  id: string
): Promise<(PythonRelease & { _id: string }) | null> {
  return fetchRecordByIdBase<PythonRelease & { _id: string }>('/python-releases', token, id)
}

export async function fetchRomanLeaders(
  token: string | null,
  params: RecordListParams = {}
): Promise<(RomanLeader & { _id: string })[]> {
  return fetchRecordListBase<RomanLeader & { _id: string }>('/roman-leaders/', token, params)
}

export async function fetchRomanLeaderById(
  token: string | null,
  id: string
): Promise<(RomanLeader & { _id: string }) | null> {
  return fetchRecordByIdBase<RomanLeader & { _id: string }>('/roman-leaders', token, id)
}

async function createRecordBase(
  path: string,
  token: string | null,
  body: Record<string, unknown>
): Promise<{ id: string }> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return { id: data.id }
}

export async function createUbuntuRelease(
  token: string | null,
  body: Omit<UbuntuRelease, '_id'>
): Promise<{ id: string }> {
  return createRecordBase('/ubuntu-releases', token, body)
}

export async function createPythonRelease(
  token: string | null,
  body: Omit<PythonRelease, '_id'>
): Promise<{ id: string }> {
  return createRecordBase('/python-releases', token, body)
}

export async function createRomanLeader(
  token: string | null,
  body: Omit<RomanLeader, '_id'>
): Promise<{ id: string }> {
  return createRecordBase('/roman-leaders', token, body)
}

async function updateRecordBase(
  path: string,
  token: string | null,
  id: string,
  body: Record<string, unknown>
): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(res.statusText)
}

export async function updateUbuntuRelease(
  token: string | null,
  id: string,
  body: Omit<UbuntuRelease, '_id'>
): Promise<void> {
  return updateRecordBase('/ubuntu-releases', token, id, body)
}

export async function updatePythonRelease(
  token: string | null,
  id: string,
  body: Omit<PythonRelease, '_id'>
): Promise<void> {
  return updateRecordBase('/python-releases', token, id, body)
}

export async function updateRomanLeader(
  token: string | null,
  id: string,
  body: Omit<RomanLeader, '_id'>
): Promise<void> {
  return updateRecordBase('/roman-leaders', token, id, body)
}

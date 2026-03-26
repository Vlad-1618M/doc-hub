const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function fetchApiKeys(token: string | null): Promise<string[]> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/auth/api-keys`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(res.statusText)
  const data = await res.json()
  return Array.isArray(data.api_keys) ? data.api_keys : []
}

export async function generateApiKey(token: string | null): Promise<string> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/auth/generate-api-key`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText)
  }
  const data = await res.json()
  return data.api_key
}

export async function revokeApiKey(token: string | null, key: string): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/auth/revoke-api-key?api_key_to_revoke=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText)
  }
}

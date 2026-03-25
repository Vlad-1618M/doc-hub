const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface AuditEvent {
  id: string
  at: string
  actor_user_id: string | null
  actor_type: string
  action: string
  resource: string
  resource_id: string | null
  summary: string
}

export async function fetchAuditEvents(token: string | null, limit = 50): Promise<AuditEvent[]> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/audit/events?limit=${limit}`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(res.statusText)
  const text = await res.text()
  try {
    const data = JSON.parse(text) as unknown
    if (!Array.isArray(data)) {
      throw new Error('Audit events: expected JSON array (check proxy: /audit must reach the API, not the SPA)')
    }
    return data as AuditEvent[]
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(
        'Audit events: response is not JSON — often means /audit was not proxied and index.html was returned'
      )
    }
    throw e instanceof Error ? e : new Error(`Audit events: invalid response (${res.status})`)
  }
}

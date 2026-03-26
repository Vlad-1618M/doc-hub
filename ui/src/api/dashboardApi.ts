const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface DashboardStats {
  resumes: number
  ubuntu_releases: number
  python_releases: number
  roman_leaders: number
  api_keys: number
}

export async function fetchDashboardStats(token: string | null): Promise<DashboardStats> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/dashboard/stats`, { headers })
  if (!res.ok) throw new Error(res.statusText)
  const text = await res.text()
  try {
    return JSON.parse(text) as DashboardStats
  } catch {
    throw new Error(`Dashboard stats: invalid response (${res.status})`)
  }
}

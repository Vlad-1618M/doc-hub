import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket'
import { fetchResumeList } from '../api/resumeApi'
import { fetchUbuntuReleases, fetchPythonReleases, fetchRomanLeaders } from '../api/recordsApi'
import { fetchApiKeys } from '../api/apiKeysApi'
import { fetchDashboardStats } from '../api/dashboardApi'
import { fetchAuditEvents, type AuditEvent } from '../api/auditApi'
import type { FullResume } from '../types'
import type { UbuntuRelease, PythonRelease, RomanLeader } from '../types'

const UPDATED_FLASH_MS = 3000

const RECENT_PAGE_SIZE = 15
const RECENT_MS = 3 * 60 * 1000 // 3min - items added/updated within this window get glow, then stop

type RecentItem =
  | { type: 'resume'; id: string; title: string; meta: string; initials: string; ts: number; isRecent: boolean }
  | { type: 'ubuntu'; id: string; title: string; meta: string; initials: string; ts: number; isRecent: boolean }
  | { type: 'python'; id: string; title: string; meta: string; initials: string; ts: number; isRecent: boolean }
  | { type: 'roman'; id: string; title: string; meta: string; initials: string; ts: number; isRecent: boolean }

function formatTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return d === 1 ? '1d ago' : `${d}d ago`
}

export function Dashboard() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [stats, setStats] = useState<{ resumes: number; ubuntu_releases: number; python_releases: number; roman_leaders: number; api_keys: number } | null>(null)
  const [resumes, setResumes] = useState<FullResume[]>([])
  const [ubuntu, setUbuntu] = useState<(UbuntuRelease & { _id: string })[]>([])
  const [python, setPython] = useState<(PythonRelease & { _id: string })[]>([])
  const [roman, setRoman] = useState<(RomanLeader & { _id: string })[]>([])
  const [apiKeys, setApiKeys] = useState<string[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [auditLoadError, setAuditLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentPage, setRecentPage] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [lastUpdatedCollection, setLastUpdatedCollection] = useState<string | null>(null)
  const updatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-check isRecent every 5s so glow stops when records age past RECENT_MS
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async (updatedCollection?: string) => {
    if (!token) return
    if (updatedCollection) {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current)
      setLastUpdatedCollection(updatedCollection)
      updatedTimerRef.current = setTimeout(() => {
        setLastUpdatedCollection(null)
        updatedTimerRef.current = null
      }, UPDATED_FLASH_MS)
    }
    try {
      const [r, u, p, rom, keys] = await Promise.all([
        fetchResumeList(token, { skip: 0, limit: 100 }),
        fetchUbuntuReleases(token, { skip: 0, limit: 100 }),
        fetchPythonReleases(token, { skip: 0, limit: 100 }),
        fetchRomanLeaders(token, { skip: 0, limit: 100 }),
        fetchApiKeys(token),
      ])
      setResumes(r)
      setUbuntu(u)
      setPython(p)
      setRoman(rom)
      setApiKeys(keys)

      try {
        const statsData = await fetchDashboardStats(token)
        setStats(statsData)
      } catch {
        setStats(null)
      }
      try {
        const events = await fetchAuditEvents(token, 50)
        setAuditEvents(events)
        setAuditLoadError(null)
      } catch (err) {
        setAuditEvents([])
        setAuditLoadError(err instanceof Error ? err.message : 'Could not load activity')
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current)
    }
  }, [])

  useDashboardWebSocket(load as (col?: string) => void)

  // Refetch when user returns to tab (handles missed WebSocket, sleep, etc.)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [load])

  const toTs = (v: unknown): number => {
    if (v == null) return 0
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    let s: string | undefined
    if (typeof v === 'string') s = v
    else if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>
      const t = o.t as Record<string, string> | undefined
      const d = o.$date
      s = t?.['$date'] ?? (typeof d === 'string' ? d : undefined)
    }
    if (!s) return 0
    const ms = new Date(s).getTime()
    return Number.isNaN(ms) ? 0 : ms
  }

  const recentItems: RecentItem[] = []
  if (!loading && !error) {
    resumes.forEach((r) => {
      const fn = r.resume?.name?.first_name || ''
      const ln = r.resume?.name?.last_name || ''
      const pos = r.resume?.job_title?.position || 'Resume'
      const ts = Math.max(toTs(r.updated_at), toTs(r.created_at))
      const ageMs = now - ts
      recentItems.push({
        type: 'resume',
        id: r._id ?? '',
        title: `${fn} ${ln}`.trim() || 'Resume',
        meta: pos,
        initials: `${(fn || '?')[0]}${(ln || '?')[0]}`.toUpperCase().slice(0, 2),
        ts,
        isRecent: ageMs >= 0 && ageMs < RECENT_MS,
      })
    })
    ubuntu.forEach((u) => {
      const ts = Math.max(toTs(u.updated_at), toTs(u.created_at))
      const ageMs = now - ts
      recentItems.push({
        type: 'ubuntu',
        id: u._id ?? '',
        title: u.version ? `${u.version} ${u.codename || ''}`.trim() : 'Ubuntu release',
        meta: u.support_type || 'Release',
        initials: u.version?.split('.')[0] || 'U',
        ts,
        isRecent: ageMs >= 0 && ageMs < RECENT_MS,
      })
    })
    roman.forEach((r) => {
      const ts = Math.max(toTs(r.updated_at), toTs(r.created_at))
      const ageMs = now - ts
      recentItems.push({
        type: 'roman',
        id: r._id ?? '',
        title: r.name || 'Roman leader',
        meta: r.dynasty || 'Leader',
        initials: (r.name || '?')[0].toUpperCase(),
        ts,
        isRecent: ageMs >= 0 && ageMs < RECENT_MS,
      })
    })
    python.forEach((p) => {
      const ts = Math.max(toTs(p.updated_at), toTs(p.created_at))
      const ageMs = now - ts
      recentItems.push({
        type: 'python',
        id: p._id ?? '',
        title: p.version ? `Python ${p.version}` : 'Python release',
        meta: p.status || 'Release',
        initials: p.version?.split('.')[0] || 'P',
        ts,
        isRecent: ageMs >= 0 && ageMs < RECENT_MS,
      })
    })
    recentItems.sort((a, b) => b.ts - a.ts)
  }

  const getLink = (item: RecentItem) => {
    switch (item.type) {
      case 'resume':
        return `/app/resumes/${item.id}`
      case 'ubuntu':
        return `/app/ubuntu-releases/${item.id}`
      case 'python':
        return `/app/python-releases/${item.id}`
      case 'roman':
        return `/app/roman-leaders/${item.id}`
    }
  }

  const auditEventLink = (ev: AuditEvent): string | null => {
    const id = ev.resource_id
    switch (ev.resource) {
      case 'resume':
        return id ? `/app/resumes/${id}` : '/app/resumes'
      case 'ubuntu_releases':
        return id ? `/app/ubuntu-releases/${id}` : '/app/ubuntu-releases'
      case 'python_releases':
        return id ? `/app/python-releases/${id}` : '/app/python-releases'
      case 'roman_leaders':
        return id ? `/app/roman-leaders/${id}` : '/app/roman-leaders'
      case 'api_key':
        return '/app/api-keys'
      default:
        return null
    }
  }

  const auditTimeMs = (iso: string): number => {
    const ms = Date.parse(iso)
    return Number.isNaN(ms) ? 0 : ms
  }

  const paginatedRecent = recentItems
    .filter((item) => item.id)
    .slice(recentPage * RECENT_PAGE_SIZE, (recentPage + 1) * RECENT_PAGE_SIZE)
  const hasNextPage = recentItems.filter((i) => i.id).length > (recentPage + 1) * RECENT_PAGE_SIZE

  const statItems = [
    { label: 'Resumes', value: stats?.resumes ?? resumes.length, to: '/app/resumes', collection: 'resumes' as const },
    { label: 'Ubuntu releases', value: stats?.ubuntu_releases ?? ubuntu.length, to: '/app/ubuntu-releases', collection: 'ubuntu_releases' as const },
    { label: 'Python releases', value: stats?.python_releases ?? python.length, to: '/app/python-releases', collection: 'python_releases' as const },
    { label: 'Roman leaders', value: stats?.roman_leaders ?? roman.length, to: '/app/roman-leaders', collection: 'roman_leaders' as const },
    { label: 'Active API keys', value: stats?.api_keys ?? apiKeys.length, to: '/app/api-keys', collection: 'api_keys' as const, isApiKeys: true },
  ]

  const contentBg =
    theme === 'terracotta'
      ? 'bg-[#fef7ed]'
      : theme === 'light'
        ? 'bg-slate-50'
        : 'bg-[#0f172a]'
  const contentStyle =
    theme === 'dark'
      ? { background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.06), transparent), #0f172a' }
      : undefined

  const cardCls =
    theme === 'terracotta'
      ? 'border-amber-200 bg-white hover:border-amber-400'
      : theme === 'light'
        ? 'border-slate-200 bg-white hover:border-sky-400'
        : 'border-slate-600 bg-slate-800 hover:border-sky-400'

  const getStatValueColor = (item: { value: number; collection: string; isApiKeys?: boolean }) => {
    if (item.isApiKeys) return theme === 'dark' ? 'text-white' : 'text-slate-800'
    if (item.value === 0) return 'text-red-500'
    if (item.collection === lastUpdatedCollection) return 'text-emerald-400'
    return theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
  }

  const panelCls =
    theme === 'terracotta'
      ? 'border-amber-200 bg-white'
      : theme === 'light'
        ? 'border-slate-200 bg-white'
        : 'border-slate-600 bg-slate-800'
  const panelBorderCls =
    theme === 'terracotta' ? 'border-amber-200' : theme === 'light' ? 'border-slate-200' : 'border-slate-600'

  return (
    <div className={`-m-6 min-h-[calc(100vh-8rem)] p-6 ${contentBg}`} style={contentStyle}>
      <div className="mb-6">
        <div className={`mb-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          <Link to="/" className={theme === 'terracotta' ? 'text-amber-600 hover:underline' : 'text-sky-400 hover:underline'}>Home</Link> / Dashboard
        </div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-50' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-800'}`}>Dashboard</h1>
        <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Overview of your records and activity</p>
      </div>

      {/* Stats grid - clickable, color-coded by update status */}
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {statItems.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className={`block rounded-[10px] border p-5 transition ${cardCls} hover:shadow-[0_0_0_1px_rgba(56,189,248,0.1)]`}
          >
            <div className={`stat-label text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</div>
            <div className={`stat-value font-mono text-2xl font-bold ${getStatValueColor(s)}`}>{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Dashboard grid - flex to fill available height */}
      <div className="grid min-h-[calc(100vh-22rem)] grid-rows-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent records - expanded to use space */}
        <div className={`flex min-h-0 flex-col overflow-hidden rounded-[10px] border ${panelCls}`}>
          <div className={`flex items-center justify-between border-b px-5 py-4 text-sm font-semibold ${panelBorderCls}`}>
            <span className={theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}>Recent records</span>
            <Link to="/app/resumes" className={`text-xs font-medium hover:underline ${theme === 'terracotta' ? 'text-amber-600' : 'text-sky-400'}`}>
              View all
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-400">{error}</div>
          ) : recentItems.length === 0 ? (
            <div className={`px-6 py-8 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No records yet</div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {paginatedRecent.map((item, i) => (
                  <li key={`${item.type}-${item.id}-${item.isRecent}-${i}`}>
                    <Link
                      to={getLink(item) as string}
                      className={`recent-record-link flex items-center gap-4 border-b px-5 py-4 transition last:border-b-0 ${panelBorderCls} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'} ${item.isRecent ? (theme === 'dark' ? 'recent-glow' : theme === 'terracotta' ? 'recent-glow-terracotta' : 'recent-glow-light') : ''}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-slate-900">
                        {item.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                          {item.title}
                          {item.isRecent && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400" title="Recently added or updated" />}
                        </div>
                        <div className={`font-mono text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.type === 'resume' ? 'Resume' : item.type} · {item.meta}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {(hasNextPage || recentPage > 0) && (
                <div className={`flex items-center justify-center gap-4 border-t px-5 py-3 ${panelBorderCls}`}>
                  {recentPage > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecentPage((p) => p - 1)}
                      className={`text-sm font-medium hover:underline ${theme === 'terracotta' ? 'text-amber-600' : 'text-sky-400'}`}
                    >
                      ← Previous
                    </button>
                  )}
                  {hasNextPage && (
                    <button
                      type="button"
                      onClick={() => setRecentPage((p) => p + 1)}
                      className={`text-sm font-medium hover:underline ${theme === 'terracotta' ? 'text-amber-600' : 'text-sky-400'}`}
                    >
                      Next →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Activity — server audit log (mutations & account events) */}
        <div className={`flex min-h-0 flex-col overflow-hidden rounded-[10px] border ${panelCls}`}>
          <div className={`shrink-0 border-b px-5 py-4 text-sm font-semibold ${panelBorderCls} ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Activity</div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            </div>
          ) : auditLoadError ? (
            <div className="flex flex-1 flex-col justify-center gap-2 p-6 text-center text-sm">
              <p className="text-amber-600 dark:text-amber-400">{auditLoadError}</p>
              <p className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>
                For Docker/nginx, ensure <code className="rounded bg-black/10 px-1 dark:bg-white/10">/audit</code> is proxied to the API (see{' '}
                <code className="rounded bg-black/10 px-1 dark:bg-white/10">build/nginx-ui.conf</code>).
              </p>
            </div>
          ) : auditEvents.length === 0 ? (
            <div className={`flex flex-1 items-center justify-center p-6 text-center text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              No audit events yet — changes will appear here as they happen
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {auditEvents.map((ev) => {
                const href = auditEventLink(ev)
                const borderCls =
                  ev.action === 'delete'
                    ? 'border-l-4 border-rose-400'
                    : ev.action === 'register' || ev.action === 'create'
                      ? 'border-l-4 border-emerald-500'
                      : 'border-l-4 border-sky-400'
                const rowCls = `mb-1 flex gap-3 rounded-lg px-4 py-3 text-[13px] transition ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'} ${borderCls}`
                const timeStr = formatTimeAgo(auditTimeMs(ev.at))
                const meta = [ev.action, ev.resource.replace(/_/g, ' '), ev.actor_type].filter(Boolean).join(' · ')
                const body = (
                  <>
                    <span className={`shrink-0 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{timeStr}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{ev.summary}</span>
                      <span className={`mt-0.5 block font-mono text-[10px] uppercase tracking-wide ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{meta}</span>
                    </span>
                  </>
                )
                return (
                  <li key={ev.id}>
                    {href ? (
                      <Link to={href} className={`${rowCls} block hover:opacity-95`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowCls}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @keyframes recentGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
          50% { box-shadow: 0 0 12px 2px rgba(52, 211, 153, 0.25); }
        }
        @keyframes recentGlowTerracotta {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
          50% { box-shadow: 0 0 12px 2px rgba(234, 88, 12, 0.35); }
        }
        @keyframes recentGlowLight {
          0%, 100% { box-shadow: 0 0 0 0 rgba(219, 39, 119, 0); }
          50% { box-shadow: 0 0 12px 2px rgba(219, 39, 119, 0.35); }
        }
        .recent-glow { animation: recentGlow 2s ease-in-out infinite; }
        .recent-glow-terracotta { animation: recentGlowTerracotta 2s ease-in-out infinite; }
        .recent-glow-light { animation: recentGlowLight 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

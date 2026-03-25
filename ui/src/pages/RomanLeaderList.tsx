import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket'
import { fetchRomanLeaders } from '../api/recordsApi'
import { isRecent } from '../lib/recentGlow'
import type { RomanLeader } from '../types'

const PAGE_SIZE = 25

export function RomanLeaderList() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<(RomanLeader & { _id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchRomanLeaders(token, {
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      q: search || undefined,
    })
      .then((data) => {
        setItems(data)
        setHasMore(data.length >= PAGE_SIZE)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, page, search])

  useEffect(() => {
    load()
  }, [load])

  useDashboardWebSocket(load)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roman-leaders-page${page + 1}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Roman Leaders', 20, 20)
    doc.setFontSize(10)
    let y = 30
    for (const item of items) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`${item.name} · ${item.title} · ${item.reign_start}—${item.reign_end} (${item.dynasty})`, 20, y)
      y += 7
    }
    doc.save('roman-leaders-list.pdf')
    setExportOpen(false)
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-6 py-8 text-center text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Roman Leaders</h1>
          <p className="mt-1 text-slate-500">Roman and Byzantine emperors and leaders</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="relative">
            <button
              onClick={() => setExportOpen((prev) => !prev)}
              disabled={items.length === 0}
              className="btn-secondary disabled:opacity-50"
            >
              Export ▾
            </button>
            {exportOpen && (
              <>
                <div className="absolute inset-0 -z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button onClick={exportJson} className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50">
                    Export as JSON
                  </button>
                  <button onClick={exportPdf} className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50">
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <Link to="new" className="btn-primary">
            <span className="mr-2">+</span> Add Leader
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-4">
          <input
            type="search"
            placeholder="Search by name, title, dynasty..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field max-w-xs"
          />
          <button type="submit" className="btn-secondary">Search</button>
          <span className="text-sm text-slate-500">
            {items.length} {items.length === 1 ? 'result' : 'results'}
            {search && ' (filtered)'}
          </span>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reign</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const rec = item as unknown as Record<string, unknown>
                const recent = isRecent(rec.created_at, rec.updated_at)
                const glowCls = recent
                  ? theme === 'dark'
                    ? 'recent-glow'
                    : theme === 'terracotta'
                      ? 'recent-glow-terracotta'
                      : 'recent-glow-light'
                  : ''
                return (
                <tr
                  key={item._id}
                  className={`transition hover:bg-slate-50/50 ${glowCls}`}
                >
                  <td className="px-6 py-4">
                    <Link to={item._id} className="font-medium text-slate-900 hover:text-primary-600">
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-500">ID: {item._id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.reign_start} — {item.reign_end} ({item.dynasty})
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={item._id} className="btn-secondary text-xs">View / Edit</Link>
                  </td>
                </tr>
              )
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-500">
            {search ? 'No leaders match your search.' : 'No leaders yet.'}
          </div>
        )}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-500">Page {page + 1}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

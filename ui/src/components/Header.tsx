import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export function Header() {
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const headerCls =
    theme === 'terracotta'
      ? 'border-amber-200 bg-[#fff7ed]'
      : theme === 'light'
        ? 'border-slate-200 bg-white'
        : 'border-slate-600 bg-[#1e293b]'

  return (
    <header className={`flex h-16 items-center justify-between border-b px-6 ${headerCls}`}>
      <div className="flex flex-1 items-center gap-4">
        <div className="flex gap-1 border-r pr-3" style={{ borderColor: theme === 'terracotta' ? '#fed7aa' : theme === 'light' ? '#e2e8f0' : '#475569' }}>
          {(['dark', 'terracotta', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                theme === t
                  ? theme === 'dark'
                    ? 'bg-sky-500/20 text-sky-400'
                    : theme === 'terracotta'
                      ? 'bg-amber-500/20 text-amber-700'
                      : 'bg-sky-500/20 text-sky-600'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    : theme === 'terracotta'
                      ? 'text-amber-900/70 hover:bg-amber-100 hover:text-amber-800'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative max-w-md flex-1">
          <span className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search candidates, skills, roles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`block w-full rounded-lg border px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-1 ${
              theme === 'terracotta'
                ? 'border-amber-300 bg-amber-50 text-amber-900 placeholder-amber-600 focus:border-amber-500 focus:ring-amber-500'
                : theme === 'light'
                  ? 'border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500'
                  : 'border-slate-600 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:ring-sky-500'
            }`}
          />
        </div>
      </div>
      <div className="relative flex items-center gap-4">
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
            theme === 'terracotta'
              ? 'bg-amber-100 text-amber-800'
              : theme === 'light'
                ? 'bg-slate-100 text-slate-600'
                : 'bg-slate-800 text-slate-300'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Connected
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
              theme === 'dark' ? 'hover:bg-slate-700' : theme === 'terracotta' ? 'hover:bg-amber-100' : 'hover:bg-slate-100'
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full font-medium ${
                theme === 'terracotta'
                  ? 'bg-amber-500/20 text-amber-700'
                  : theme === 'light'
                    ? 'bg-sky-500/20 text-sky-600'
                    : 'bg-sky-500/20 text-sky-400'
              }`}
            >
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <span
              className={`hidden text-sm sm:block ${
                theme === 'dark' ? 'text-slate-300' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-600'
              }`}
            >
              {user?.email}
            </span>
            <svg
              className={`h-4 w-4 transition ${menuOpen ? 'rotate-180' : ''} ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div
                className={`absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border py-1 shadow-lg ${
                  theme === 'terracotta'
                    ? 'border-amber-200 bg-white'
                    : theme === 'light'
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-600 bg-slate-800'
                }`}
              >
                <p
                  className={`truncate px-3 py-2 text-sm ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {user?.email}
                </p>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  className={`w-full px-3 py-2 text-left text-sm text-red-500 ${
                    theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                  }`}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

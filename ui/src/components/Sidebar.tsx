import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { AppLogo } from './AppLogo'

const navItems = [
  { to: '/app', label: 'Dashboard', icon: '📊' },
  { to: '/app/resumes', label: 'Resumes', icon: '📄' },
  { to: '/app/ubuntu-releases', label: 'Ubuntu Releases', icon: '🐧' },
  { to: '/app/python-releases', label: 'Python Releases', icon: '🐍' },
  { to: '/app/roman-leaders', label: 'Roman Leaders', icon: '🏛️' },
  { to: '/app/api-keys', label: 'API Keys', icon: '🔑' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { theme } = useTheme()
  const sidebarCls =
    theme === 'terracotta'
      ? 'border-amber-200 bg-[#ffedd5]'
      : theme === 'light'
        ? 'border-slate-200 bg-slate-50'
        : 'border-slate-700 bg-slate-900'
  return (
    <aside
      className={`flex flex-col border-r transition-[width] duration-200 ${sidebarCls} ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-16 items-center justify-between border-b px-3 ${
          theme === 'terracotta' ? 'border-amber-200' : theme === 'light' ? 'border-slate-200' : 'border-slate-700'
        }`}
      >
        <NavLink to="/" className="flex min-w-0 items-center gap-2" title="Return to home">
          <AppLogo size="sm" linkToHome={false} />
          {!collapsed && (
            <div className="min-w-0 truncate">
              <span
                className={`font-display block truncate text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-800'
                }`}
              >
                Doc Portal
              </span>
              <span
                className={`block truncate text-xs ${
                  theme === 'dark' ? 'text-slate-400' : theme === 'terracotta' ? 'text-amber-700' : 'text-slate-500'
                }`}
              >
                HR Management
              </span>
            </div>
          )}
        </NavLink>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            theme === 'dark'
              ? 'text-slate-400 hover:bg-slate-800 hover:text-sky-400'
              : theme === 'terracotta'
                ? 'text-amber-700 hover:bg-amber-100 hover:text-amber-800'
                : 'text-slate-500 hover:bg-slate-200 hover:text-sky-600'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? 'justify-center' : ''
              }               ${
                isActive
                  ? theme === 'terracotta'
                    ? 'bg-amber-500/20 text-amber-700'
                    : theme === 'light'
                      ? 'bg-sky-500/20 text-sky-600'
                      : 'bg-primary-600/20 text-primary-400'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : theme === 'terracotta'
                      ? 'text-amber-800 hover:bg-amber-100 hover:text-amber-900'
                      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              }`
            }
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div
        className={`border-t p-3 ${collapsed ? 'text-center' : ''} ${
          theme === 'terracotta' ? 'border-amber-200' : theme === 'light' ? 'border-slate-200' : 'border-slate-700'
        }`}
      >
        <p
          className={`text-xs ${
            theme === 'dark' ? 'text-slate-500' : theme === 'terracotta' ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {collapsed ? 'v0.1' : 'Doc Portal v0.1'}
        </p>
        {!collapsed && <p className="mt-2 text-[10px] text-slate-500">© {new Date().getFullYear()} Doc Portal</p>}
        {!collapsed && (
        <div
          className={`mt-1 flex flex-wrap gap-x-2 text-[10px] ${
            theme === 'dark' ? 'text-slate-500' : theme === 'terracotta' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <a href="mailto:dev@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>Contact dev team</a>
          <span>·</span>
          <a href="mailto:admin@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>Contact admin</a>
          <span>·</span>
          <a href="mailto:devops@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>DevOps</a>
          <span>·</span>
          <a href="mailto:hr@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>HR</a>
          <span>·</span>
          <a href="mailto:test@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>Test</a>
          <span>·</span>
          <a href="mailto:management@company.com" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>Mgmt</a>
          <span>·</span>
          <a href="/app/data" className={theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-amber-800'}>Data</a>
        </div>
        )}
      </div>
    </aside>
  )
}

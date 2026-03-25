import { Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  const { theme } = useTheme()
  const themeBg =
    theme === 'terracotta' ? 'bg-[#fef7ed]' : theme === 'light' ? 'bg-slate-100' : 'bg-[#0f172a]'
  return (
    <div className={`flex h-screen overflow-hidden ${themeBg}`} data-theme={theme}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

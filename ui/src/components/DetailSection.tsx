/**
 * Section card for detail views. Ensures labels (dt) and values (dd) have
 * sufficient contrast on the white card in all themes.
 */
import { useTheme } from '../contexts/ThemeContext'

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme()
  const headerCls = theme === 'dark' ? 'border-slate-600 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'
  const titleCls = theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
  // Card is always white; use dark text for readability in all themes
  const contentCls = 'p-4 [&_dt]:text-slate-600 [&_dd]:text-slate-800'

  return (
    <div className="card overflow-hidden">
      <div className={`border-b px-4 py-3 ${headerCls}`}>
        <h2 className={`font-display font-semibold ${titleCls}`}>{title}</h2>
      </div>
      <div className={contentCls}>
        {children}
      </div>
    </div>
  )
}

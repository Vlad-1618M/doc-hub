import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type AppTheme = 'dark' | 'terracotta' | 'light'

interface ThemeContextType {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = 'doc_portal_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('terracotta')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as AppTheme | null
    if (stored && ['dark', 'terracotta', 'light'].includes(stored)) {
      setThemeState(stored)
    }
  }, [])

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

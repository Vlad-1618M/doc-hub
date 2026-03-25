import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { AppLogo } from '../components/AppLogo'

export function Register() {
  const { user, isLoading, register } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true })
  }, [user, isLoading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password || !confirmPassword) {
      setError('Email, password, and confirmation are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    const result = await register(email.trim(), password, name.trim() || undefined)
    setIsSubmitting(false)
    if (result.success) {
      navigate('/app', { replace: true })
    } else {
      setError(result.error || 'Registration failed')
    }
  }

  const wrapCls =
    theme === 'dark'
      ? 'flex min-h-screen flex-col text-slate-100'
      : theme === 'terracotta'
        ? 'flex min-h-screen flex-col text-amber-900'
        : 'flex min-h-screen flex-col text-slate-800'

  const bgCls =
    theme === 'dark'
      ? 'register-bg-dark'
      : theme === 'terracotta'
        ? 'register-bg-terracotta'
        : 'register-bg-light'

  const headerCls =
    theme === 'dark'
      ? 'border-slate-600'
      : theme === 'terracotta'
        ? 'border-amber-200'
        : 'border-slate-200'

  const returnLinkCls =
    theme === 'dark'
      ? 'text-slate-300 hover:bg-sky-500/10 hover:text-sky-400'
      : theme === 'terracotta'
        ? 'text-amber-700 hover:bg-amber-100 hover:text-amber-800'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'

  const cardCls =
    theme === 'dark'
      ? 'border border-slate-600 bg-slate-800/90 shadow-xl backdrop-blur'
      : theme === 'terracotta'
        ? 'border border-amber-200 bg-white shadow-lg'
        : 'border border-slate-200 bg-white shadow-lg'

  const titleCls = theme === 'dark' ? 'text-white' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-900'
  const subtitleCls = theme === 'dark' ? 'text-slate-400' : theme === 'terracotta' ? 'text-amber-700' : 'text-slate-500'
  const labelCls = theme === 'dark' ? 'text-slate-300' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-700'
  const inputCls =
    theme === 'dark'
      ? 'border-slate-500 bg-slate-700/50 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-sky-400'
      : theme === 'terracotta'
        ? 'border-amber-300 bg-amber-50/50 text-amber-900 placeholder-amber-600 focus:border-amber-500 focus:ring-amber-500'
        : 'border-slate-300 bg-white placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500'
  const signinTextCls = theme === 'dark' ? 'text-slate-400' : theme === 'terracotta' ? 'text-amber-700' : 'text-slate-500'
  const signinLinkCls = theme === 'terracotta' ? 'text-amber-600 hover:text-amber-800' : 'text-primary-600 hover:text-primary-700'
  const footerCls = theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
  const footerLinkCls = theme === 'dark' ? 'hover:text-slate-300' : 'hover:text-slate-600'

  return (
    <div className={wrapCls}>
      <div className={`register-bg ${bgCls}`} />
      <header className={`relative z-10 flex items-center justify-between border-b px-4 py-4 sm:px-8 lg:px-12 ${headerCls}`}>
        <div className="flex items-center gap-4">
          <AppLogo size="md" />
          <div className="flex gap-1">
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
                        ? 'text-amber-700 hover:bg-amber-100 hover:text-amber-800'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Link to="/" className={`rounded-lg px-4 py-2 text-sm font-medium transition ${returnLinkCls}`}>
          ← Return to home
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className={`rounded-xl p-8 ${cardCls}`}>
          <div className="mb-8 text-center">
            <AppLogo size="lg" className="mx-auto mb-4 rounded-xl" />
            <h1 className={`font-display text-2xl font-semibold ${titleCls}`}>Create account</h1>
            <p className={`mt-1 text-sm ${subtitleCls}`}>Get started with Resume Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name" className={`mb-1 block text-sm font-medium ${labelCls}`}>
                Name <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input-field ${inputCls}`}
                placeholder="Jane Smith"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="email" className={`mb-1 block text-sm font-medium ${labelCls}`}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${inputCls}`}
                placeholder="you@company.com"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className={`mb-1 block text-sm font-medium ${labelCls}`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${inputCls}`}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <p className={`mt-1 text-xs ${subtitleCls}`}>At least 8 characters</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={`mb-1 block text-sm font-medium ${labelCls}`}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-field ${inputCls}`}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm ${signinTextCls}`}>
            Already have an account?{' '}
            <Link to="/login" className={`font-medium ${signinLinkCls}`}>
              Sign in
            </Link>
          </p>
        </div>
        <footer className={`mt-4 text-center text-xs ${footerCls}`}>
          <p>Doc Portal · Secure internal records</p>
          <p className="mt-1">© {new Date().getFullYear()} Doc Portal</p>
          <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1">
            <a href="mailto:dev@company.com" className={footerLinkCls}>Contact dev team</a>
            <span>·</span>
            <a href="mailto:admin@company.com" className={footerLinkCls}>Contact admin</a>
            <span>·</span>
            <a href="mailto:devops@company.com" className={footerLinkCls}>DevOps team</a>
            <span>·</span>
            <a href="mailto:hr@company.com" className={footerLinkCls}>HR</a>
            <span>·</span>
            <a href="mailto:test@company.com" className={footerLinkCls}>Test team</a>
            <span>·</span>
            <a href="mailto:management@company.com" className={footerLinkCls}>Management</a>
            <span>·</span>
            <a href="/app/data" className={footerLinkCls}>Data</a>
          </div>
        </footer>
      </div>
      </main>
      <style>{`
        .register-bg {
          position: fixed;
          inset: 0;
          z-index: -2;
        }
        .register-bg-dark {
          background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.12), transparent),
                    linear-gradient(180deg, #0f172a 0%, #0c1222 100%);
        }
        .register-bg-terracotta {
          background: radial-gradient(ellipse 100% 60% at 50% 0%, rgba(234,88,12,0.08), transparent 60%),
                    linear-gradient(180deg, #fef7ed 0%, #ffedd5 100%);
        }
        .register-bg-light {
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%);
        }
      `}</style>
    </div>
  )
}

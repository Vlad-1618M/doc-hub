import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppLogo } from '../components/AppLogo'

export function Login() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true })
  }, [user, isLoading, navigate])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    setIsSubmitting(true)
    const result = await login(email.trim(), password)
    setIsSubmitting(false)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <div className="landing-bg-auth" />
      <div className="landing-grid-auth" />
      <header className="relative z-10 flex items-center justify-between border-b border-slate-600 px-4 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <AppLogo size="md" />
          <span className="font-display text-xl font-semibold text-white">Doc Portal</span>
        </div>
        <Link
          to="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-sky-500/10 hover:text-sky-400"
        >
          ← Return to home
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card border border-slate-600 bg-slate-800/90 p-8 shadow-xl backdrop-blur">
          <div className="mb-8 text-center">
            <AppLogo size="lg" className="mx-auto mb-4 rounded-xl" />
            <h1 className="font-display text-2xl font-semibold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your Doc Portal account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field border-slate-500 bg-slate-700/50 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-sky-400"
                placeholder="you@company.com"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field border-slate-500 bg-slate-700/50 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-sky-400"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-sky-400 hover:text-sky-300">
              Create account
            </Link>
          </p>
        </div>
        <footer className="mt-4 text-center text-xs text-slate-500">
          <p>Doc Portal · Secure internal records</p>
          <p className="mt-1">© {new Date().getFullYear()} Doc Portal</p>
          <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1">
            <a href="mailto:dev@company.com" className="hover:text-slate-300">Contact dev team</a>
            <span>·</span>
            <a href="mailto:admin@company.com" className="hover:text-slate-300">Contact admin</a>
            <span>·</span>
            <a href="mailto:devops@company.com" className="hover:text-slate-300">DevOps team</a>
            <span>·</span>
            <a href="mailto:hr@company.com" className="hover:text-slate-300">HR</a>
            <span>·</span>
            <a href="mailto:test@company.com" className="hover:text-slate-300">Test team</a>
            <span>·</span>
            <a href="mailto:management@company.com" className="hover:text-slate-300">Management</a>
            <span>·</span>
            <a href="/app/data" className="hover:text-slate-300">Data</a>
          </div>
        </footer>
      </div>
      </main>
      <style>{`
        .landing-bg-auth {
          position: fixed;
          inset: 0;
          z-index: -2;
          background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.12), transparent),
                    linear-gradient(180deg, #0f172a 0%, #0c1222 100%);
        }
        .landing-grid-auth {
          position: fixed;
          inset: 0;
          z-index: -1;
          background-image: linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
      `}</style>
    </div>
  )
}

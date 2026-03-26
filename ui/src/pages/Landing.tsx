import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { AppLogo } from '../components/AppLogo'

const RETRIEVAL_MOCKS = [
  {
    title: '1. GET /resume',
    steps: [
      { num: 1, label: 'User', action: 'Clicks Dashboard', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'GET /resume', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: '→ MongoDB', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: '5 docs →', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Renders list', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  {
    title: '2. GET /ubuntu-releases',
    steps: [
      { num: 1, label: 'User', action: 'Opens list', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'GET releases', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: 'Auth + query', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: 'Data → API', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Sees table', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  {
    title: '3. POST /auth/login',
    steps: [
      { num: 1, label: 'User', action: 'Signs in', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'POST /auth/login', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: 'Verify → DB', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: 'User + JWT', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Token, redirect', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  {
    title: '4. GET /search (index)',
    steps: [
      { num: 1, label: 'User', action: 'Types query', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'GET /search?q=…', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: 'Text index query', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: 'Index lookup →', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Sees matches', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  {
    title: '5. PUT /resume/:id',
    steps: [
      { num: 1, label: 'User', action: 'Edits record', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'PUT /resume/:id', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: 'Replace doc', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: 'Updated →', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Sees update', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  {
    title: '6. PATCH /resume/:id',
    steps: [
      { num: 1, label: 'User', action: 'Partial edit', hasLine: false, rev: false, phase: 'request' as const },
      { num: 2, label: 'React UI', action: 'PATCH /resume/:id', hasLine: true, rev: false, phase: 'request' as const },
      { num: 3, label: 'FastAPI', action: 'Merge fields', hasLine: true, rev: false, phase: 'request' as const },
      { num: 4, label: 'MongoDB', action: 'Patched doc →', hasLine: true, rev: true, phase: 'response' as const },
      { num: 5, label: 'User', action: 'Sees change', hasLine: true, rev: true, phase: 'response' as const },
    ],
  },
  // {
  //   title: '7. DELETE /resume/:id',
  //   steps: [
  //     { num: 1, label: 'User', action: 'Deletes row', hasLine: false, rev: false, phase: 'request' as const },
  //     { num: 2, label: 'React UI', action: 'DELETE /resume/:id', hasLine: true, rev: false, phase: 'request' as const },
  //     { num: 3, label: 'FastAPI', action: 'Remove doc', hasLine: true, rev: false, phase: 'request' as const },
  //     { num: 4, label: 'MongoDB', action: '204 OK →', hasLine: true, rev: true, phase: 'response' as const },
  //     { num: 5, label: 'User', action: 'Row removed', hasLine: true, rev: true, phase: 'response' as const },
  //   ],
  // },
]

export function Landing() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true })
  }, [user, isLoading, navigate])

  const flowNodes = [
    { name: 'User', desc: 'Submits via HTTPS', cls: 'border-sky-500' },
    { name: 'React UI', desc: 'Proxies /auth, /resume', cls: '' },
    { name: 'FastAPI', desc: 'JWT + CRUD', cls: 'border-emerald-500' },
    { name: 'MongoDB', desc: 'Document store', cls: 'border-violet-400' },
  ]

  return (
    <div
      className={`min-h-screen text-slate-100 antialiased ${theme === 'dark' ? 'landing-dark' : theme === 'terracotta' ? 'landing-terracotta' : 'landing-light'}`}
    >
      {/* Background: gradient + grid pattern (matching mock) */}
      <div className="landing-bg" />
      <div className="landing-grid" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <header className="flex items-center justify-between border-b border-slate-600 py-5">
          <div className="flex items-center gap-3">
            <AppLogo size="md" />
            <span className="doc-portal-brand font-display text-xl font-semibold text-white">Doc Portal</span>
          </div>

          {/* Desktop nav: theme + auth */}
          <nav className="hidden items-center gap-2 md:flex">
            <div className="flex gap-1 border-r border-slate-600 pr-3">
              {(['dark', 'terracotta', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                    theme === t ? 'landing-nav-active' : 'landing-nav-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Link to="/login" className="landing-nav-link">
              Sign in
            </Link>
            <Link to="/register" className="landing-nav-link">
              Create account
            </Link>
          </nav>

          {/* Mobile: hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-500/10 hover:text-sky-400 md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <aside
              className={`fixed right-0 top-0 z-50 flex h-full w-64 flex-col gap-4 border-l p-6 shadow-xl md:hidden ${
                theme === 'dark' ? 'border-slate-600 bg-[#0f172a]' : theme === 'terracotta' ? 'border-[#fed7aa] bg-[#fef7ed]' : 'border-slate-200 bg-white'
              }`}
              role="dialog"
              aria-label="Navigation menu"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-700"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Theme</p>
              <div className="flex flex-col gap-1">
                {(['dark', 'terracotta', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTheme(t)
                      setSidebarOpen(false)
                    }}
                    className={`rounded-lg px-3 py-2 text-left text-sm capitalize ${
                      theme === t ? 'landing-nav-active' : 'landing-nav-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-600 pt-4">
                <Link
                  to="/login"
                  onClick={() => setSidebarOpen(false)}
                  className="landing-nav-link mb-2 block rounded-lg px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setSidebarOpen(false)}
                  className="block rounded-lg border border-sky-500 bg-sky-500/20 px-3 py-2 text-center font-medium text-sky-400 transition hover:bg-sky-500/30"
                >
                  Create account
                </Link>
              </div>
            </aside>
          </>
        )}

        <section className="py-6 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Internal Records & Document Hub
          </h1>
          <p className="mx-auto max-w-[600px] text-lg text-slate-400">
            One place for HR, teams, and internal data.
            <br />
            Secure, searchable, and built for your org.
          </p>
        </section>

        <section className="landing-section rounded-xl border border-slate-600 bg-slate-800/50 p-6 my-4">
          <h2 className="landing-accent mb-3 text-lg font-semibold text-sky-400">What is this for?</h2>
          <p className="mb-4 text-slate-400">An internal platform for organizing and managing organizational data. Use it for:</p>
          <ul className="space-y-2 text-slate-300">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <strong>HR & Employee Records</strong> — Resumes, profiles, performance notes
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <strong>Team Data</strong> — Research, Tests, IT, Marketing, work logs
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <strong>Internal Document Servers</strong> — Centralized docs for your org
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <strong>Secure & Private</strong> — Stays inside your infrastructure
            </li>
          </ul>
        </section>

        <section className="my-6">
          <h2 className="landing-accent mb-4 text-center text-lg font-semibold text-sky-400">How data flows</h2>
          <div className="landing-section flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 p-6">
            {flowNodes.map((node, i) => (
              <div key={node.name} className="flex items-center gap-2">
                <div
                  className={`flex min-w-[100px] flex-col items-center gap-0.5 rounded-lg border bg-slate-900 px-4 py-2 font-mono text-sm ${node.cls}`}
                >
                  <span className="font-semibold">{node.name}</span>
                  <span className="text-xs text-slate-500">{node.desc}</span>
                </div>
                {i < 3 && (
                  <div className="flow-connector flex items-center gap-1">
                    <div className="flow-arrow">
                      <span className="flow-shimmer" />
                    </div>
                    <span className="flow-dot" />
                    <span className="flow-dot flow-dot-2" />
                    <span className="flow-dot flow-dot-3" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <section className="retrieval-section mt-6">
            <h2 className="landing-accent mb-1 text-center text-lg font-semibold">Data retrieval map</h2>
            <p className="retrieval-subtitle mb-4 text-center text-sm text-slate-400">
              {/* <strong>Request</strong> (steps 1–3): User → UI → API → DB. <strong>Response</strong> (steps 4–5): DB → User. Moving dots show direction. */}
              <strong>Request</strong> (steps 1–3): User → UI → API → DB. <strong>Response</strong> (steps 4–5): DB → User.
            </p>
            <div className="retrieval-mocks grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {RETRIEVAL_MOCKS.map((mock) => (
                <div
                  key={mock.title}
                  className="retrieval-card rounded-lg border border-slate-600 bg-slate-800/90 p-2.5 sm:p-3"
                >
                  <h3 className="retrieval-card-title mb-2 text-xs font-semibold text-sky-400 sm:text-sm">{mock.title}</h3>
                  {mock.steps.map((step, i) => (
                    <div key={step.num}>
                      <div className="retrieval-flow-step flex items-center gap-2 py-1">
                        {(i === 0 || (i > 0 && mock.steps[i - 1].phase !== step.phase)) ? (
                          //  <span className={`retrieval-phase shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          //   step.phase === 'request'
                          <span className={`retrieval-phase inline-flex w-14 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                              step.phase === 'request'
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {step.phase}
                          </span>
                        ) : (
                          <span className="w-14 shrink-0" aria-hidden />
                        )}
                        <span className="retrieval-flow-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 font-mono text-[10px] font-bold text-white">
                          {step.num}
                        </span>
                        {step.hasLine ? (
                          <div className={`retrieval-flow-line flex-1 ${step.rev ? 'rev' : ''}`}>
                            <span className="retrieval-moving-dot" />
                          </div>
                        ) : null}
                        <span className="retrieval-flow-label min-w-[75px] text-[11px] text-slate-500">
                          {step.label}
                        </span>
                        <span className="retrieval-flow-action text-[10px] text-slate-300">
                          {step.action}
                        </span>
                      </div>
                      {i < mock.steps.length - 1 && <div className="retrieval-flow-arrow" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="my-6">
          <h2 className="mb-1 text-center text-lg font-semibold text-white landing-terracotta:text-stone-900 landing-light:text-slate-900">Sign in or create an account</h2>
          {/* <p className="mb-4 text-center text-sm text-slate-400">Choose your option below</p> */}
          <div className="mx-auto flex max-w-md justify-center gap-4">
            <Link
              to="/login"
              className="landing-btn-outline flex-1 rounded-xl border border-sky-500/50 bg-sky-500/10 px-6 py-3 text-center font-semibold text-sky-400 transition hover:bg-sky-500/20 hover:text-sky-300"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="landing-btn-solid flex-1 rounded-xl border border-sky-500 bg-sky-500 px-6 py-3 text-center font-semibold text-slate-900 transition hover:bg-sky-400"
            >
              Create account
            </Link>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-600 py-6 text-center text-xs text-slate-500 landing-terracotta:border-orange-200 landing-terracotta:text-stone-600 landing-light:border-slate-200 landing-light:text-slate-600">
          <p>© {new Date().getFullYear()} Doc Portal</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
            <a href="mailto:dev@company.com" className="landing-nav-link landing-footer-link">Contact dev team</a>
            <span>·</span>
            <a href="mailto:admin@company.com" className="landing-nav-link landing-footer-link">Contact admin</a>
            <span>·</span>
            <a href="mailto:devops@company.com" className="landing-nav-link landing-footer-link">DevOps team</a>
            <span>·</span>
            <a href="mailto:hr@company.com" className="landing-nav-link landing-footer-link">HR</a>
            <span>·</span>
            <a href="mailto:test@company.com" className="landing-nav-link landing-footer-link">Test team</a>
            <span>·</span>
            <a href="mailto:management@company.com" className="landing-nav-link landing-footer-link">Management</a>
            <span>·</span>
            <a href="/app/data" className="landing-nav-link landing-footer-link">Data</a>
          </div>
        </footer>
      </div>

      <style>{`
        .landing-bg {
          position: fixed;
          inset: 0;
          z-index: -2;
          background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.12), transparent),
                    linear-gradient(180deg, #0f172a 0%, #0c1222 100%);
        }
        .landing-grid {
          position: fixed;
          inset: 0;
          z-index: -1;
          background-image: linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .landing-dark .landing-bg { opacity: 1; }
        .landing-dark .landing-grid { opacity: 1; }
        .landing-terracotta .landing-bg {
          background: radial-gradient(ellipse 100% 60% at 50% 0%, rgba(234,88,12,0.08), transparent 60%),
                      linear-gradient(180deg, #fef7ed 0%, #ffedd5 100%);
        }
        .landing-terracotta .landing-grid {
          background-image: linear-gradient(rgba(234,88,12,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(234,88,12,0.03) 1px, transparent 1px);
        }
        .landing-terracotta { color: #1c1917; }
        .landing-terracotta .landing-section { background: #fff; border-color: #fed7aa; }
        .landing-terracotta h1, .landing-terracotta h2 { color: #1c1917 !important; }
        .landing-terracotta .text-slate-400 { color: #7c2d12 !important; }
        .landing-terracotta .text-slate-300 { color: #57534e !important; }
        .landing-terracotta .landing-nav-muted { color: #9a3412; }
        .landing-terracotta .landing-nav-muted:hover { color: #ea580c; background: rgba(234,88,12,0.1); }
        .landing-terracotta .landing-nav-active { color: #ea580c; }
        .landing-terracotta .landing-nav-link { color: #9a3412; }
        .landing-terracotta .landing-nav-link:hover { color: #ea580c; background: rgba(234,88,12,0.1); }
        .landing-terracotta .landing-accent { color: #c2410c !important; }
        .landing-terracotta .landing-btn-outline { border-color: #ea580c; color: #ea580c; background: rgba(234,88,12,0.1); }
        .landing-terracotta .landing-btn-outline:hover { background: rgba(234,88,12,0.2); }
        .landing-terracotta .landing-btn-solid { background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; }
        .landing-terracotta .landing-btn-solid:hover { opacity: 0.95; }
        .landing-terracotta header { border-color: #fed7aa; }
        .landing-terracotta .doc-portal-brand { color: #292524 !important; }
        .landing-light .doc-portal-brand { color: #0f172a !important; }
        .landing-light .landing-bg {
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%);
        }
        .landing-light .landing-grid {
          background-image: linear-gradient(rgba(3,105,161,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(3,105,161,0.04) 1px, transparent 1px);
        }
        .landing-light { color: #0c1222; }
        .landing-light .landing-section { background: #ffffff; border-color: #e2e8f0; }
        .landing-light h1, .landing-light h2 { color: #0c1222 !important; }
        .landing-light .text-slate-400 { color: #475569 !important; }
        .landing-light .text-slate-300 { color: #334155 !important; }
        .landing-light .landing-nav-muted { color: #64748b; }
        .landing-light .landing-nav-muted:hover { color: #0369a1; background: #e0f2fe; }
        .landing-light .landing-nav-active { color: #0369a1; }
        .landing-light .landing-nav-link { color: #64748b; }
        .landing-light .landing-nav-link:hover { color: #0369a1; background: #e0f2fe; }
        .landing-light .landing-accent { color: #075985 !important; }
        .landing-light .landing-btn-outline { border-color: #0284c7; color: #0369a1; background: #e0f2fe; }
        .landing-light .landing-btn-outline:hover { background: #bae6fd; }
        .landing-light .landing-btn-solid { background: linear-gradient(135deg, #0369a1, #0284c7); color: #fff; }
        .landing-light .landing-btn-solid:hover { opacity: 0.95; }
        .landing-light header { border-color: #e2e8f0; }
        .landing-footer-link { color: #94a3b8 !important; }
        .landing-footer-link:hover { color: #38bdf8 !important; }
        .landing-terracotta .landing-footer-link { color: #57534e !important; }
        .landing-terracotta .landing-footer-link:hover { color: #ea580c !important; }
        .landing-light .landing-footer-link { color: #64748b !important; }
        .landing-light .landing-footer-link:hover { color: #0284c7 !important; }
        .landing-nav-muted {
          color: #94a3b8;
          transition: all 0.2s;
        }
        .landing-nav-muted:hover { color: #38bdf8; background: rgba(56,189,248,0.1); }
        .landing-nav-active { color: #38bdf8; }
        .landing-nav-link {
          color: #94a3b8;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .landing-nav-link:hover { color: #38bdf8; background: rgba(56,189,248,0.1); }
        .landing-terracotta .landing-section .bg-slate-900 { background: #fff7ed !important; }
        .landing-terracotta .landing-section .text-slate-500 { color: #57534e !important; }
        .landing-light .landing-section .bg-slate-900 { background: #f1f5f9 !important; }
        .landing-light .landing-section .text-slate-500 { color: #475569 !important; }
        .landing-terracotta .flow-arrow { background: linear-gradient(90deg, #ea580c, #16a34a) !important; }
        .landing-terracotta .flow-arrow::after { border-left-color: #16a34a !important; }
        .landing-terracotta .flow-dot { background: #ea580c !important; }
        .landing-light .flow-arrow { background: linear-gradient(90deg, #0369a1, #059669) !important; }
        .landing-light .flow-arrow::after { border-left-color: #059669 !important; }
        .landing-light .flow-dot { background: #0369a1 !important; }
        .landing-terracotta .border-sky-500 { border-color: #ea580c !important; }
        .landing-terracotta .border-emerald-500 { border-color: #16a34a !important; }
        .landing-terracotta .border-violet-400 { border-color: #a16207 !important; }
        .landing-light .border-sky-500 { border-color: #0284c7 !important; }
        .landing-light .border-emerald-500 { border-color: #059669 !important; }
        .landing-light .border-violet-400 { border-color: #0369a1 !important; }
        .flow-arrow {
          position: relative;
          width: 28px;
          height: 2px;
          background: linear-gradient(90deg, #38bdf8, #34d399);
          overflow: hidden;
        }
        .flow-arrow::after {
          content: '';
          position: absolute;
          right: -4px;
          top: -3px;
          border: 4px solid transparent;
          border-left-color: #34d399;
        }
        .flow-shimmer {
          position: absolute;
          top: 0;
          left: -80%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: flowShimmer 2.5s ease-in-out infinite;
        }
        @keyframes flowShimmer {
          0% { left: -80%; }
          100% { left: 150%; }
        }
        .flow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          animation: flowDot 1.5s ease-in-out infinite;
        }
        .flow-dot-2 { animation-delay: 0.2s; }
        .flow-dot-3 { animation-delay: 0.4s; }
        @keyframes flowDot {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1); }
        }
        .retrieval-section { margin-top: 1.5rem; }
        .landing-terracotta .retrieval-card,
        .landing-light .retrieval-card {
          background: #1e293b !important;
          border-color: #475569 !important;
        }
        .landing-terracotta .retrieval-card .retrieval-flow-label,
        .landing-terracotta .retrieval-card .retrieval-flow-action,
        .landing-light .retrieval-card .retrieval-flow-label,
        .landing-light .retrieval-card .retrieval-flow-action {
          color: #94a3b8 !important;
        }
        .landing-terracotta .retrieval-card .retrieval-flow-action { color: #cbd5e1 !important; }
        .landing-light .retrieval-card .retrieval-flow-action { color: #cbd5e1 !important; }
        .landing-terracotta .retrieval-subtitle { color: #7c2d12 !important; }
        .landing-light .retrieval-subtitle { color: #475569 !important; }
        .retrieval-mocks { display: grid; gap: 0.75rem 1rem; }
        .retrieval-card h3 { font-size: 0.75rem; }
        .retrieval-flow-step { display: flex; align-items: center; gap: 0.5rem; }
        .retrieval-flow-num { font-size: 0.65rem; }
        .retrieval-flow-line {
          flex: 1;
          min-width: 28px;
          height: 3px;
          background: #334155;
          position: relative;
          overflow: hidden;
        }
        .landing-terracotta .retrieval-card .retrieval-flow-line { background: #78716c; }
        .landing-light .retrieval-card .retrieval-flow-line { background: #64748b; }
        .retrieval-flow-line .retrieval-moving-dot {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
          animation: retrievalMoveAlong 2.2s ease-in-out infinite;
        }
        .landing-terracotta .retrieval-flow-line .retrieval-moving-dot {
          background: #ea580c;
          box-shadow: 0 0 6px #ea580c;
        }
        .landing-light .retrieval-flow-line .retrieval-moving-dot {
          background: #0284c7;
          box-shadow: 0 0 6px #0284c7;
        }
        .retrieval-flow-line.rev .retrieval-moving-dot {
          left: auto;
          right: 0;
          animation: retrievalMoveBack 2.2s ease-in-out infinite;
          animation-delay: 1.1s;
        }
        @keyframes retrievalMoveAlong {
          0% { left: 0; }
          100% { left: 100%; }
        }
        @keyframes retrievalMoveBack {
          0% { right: 0; }
          100% { right: 100%; }
        }
        .retrieval-flow-arrow {
          width: 16px;
          height: 16px;
          margin-left: 20px;
          position: relative;
        }
        .retrieval-flow-arrow::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          width: 2px;
          height: 10px;
          background: linear-gradient(180deg, #334155, #38bdf8);
          transform: translateX(-50%);
        }
        .retrieval-flow-arrow::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -2px;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #38bdf8;
        }
        .landing-terracotta .retrieval-flow-arrow::before {
          background: linear-gradient(180deg, #fed7aa, #ea580c);
        }
        .landing-terracotta .retrieval-flow-arrow::after {
          border-top-color: #ea580c;
        }
        .landing-light .retrieval-flow-arrow::before {
          background: linear-gradient(180deg, #e2e8f0, #0284c7);
        }
        .landing-light .retrieval-flow-arrow::after {
          border-top-color: #0284c7;
        }
        .retrieval-step {
          animation: retrievalStepIn 0.5s ease-out both;
        }
        @keyframes retrievalStepIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .retrieval-bar {
          animation: retrievalBarFill 1.2s ease-out both;
        }
        @keyframes retrievalBarFill {
          from { width: 0 !important; }
        }
      `}</style>
    </div>
  )
}

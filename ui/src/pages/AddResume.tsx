import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createResume } from '../api/resumeApi'

export function AddResume() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState('')
  const [summary, setSummary] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { id } = await createResume(token, {
        resume: {
          name: { first_name: firstName.trim(), last_name: lastName.trim() },
          contact: { email: email.trim(), phone: phone.trim() },
          job_title: { position: position.trim(), role: role.trim() },
          summary: summary.trim() || undefined,
        },
        Work_Experience: [],
        education: { degree: '', location: '', majored_in: '' },
        work_authorization: undefined,
        reference: {},
        links: {},
        notes: undefined,
      })
      navigate(`/app/resumes/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create resume')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/app/resumes" className="text-sm text-slate-500 hover:text-slate-700">
          ← Resumes
        </Link>
        <h1 className="font-display mt-1 text-2xl font-semibold text-slate-900">Add Resume</h1>
        <p className="mt-1 text-slate-500">Create a new candidate resume</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
              className="input-field w-full"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1-555-000-0000"
              className="input-field w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Position / Role Title</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Software Engineer"
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role Description</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Full-stack developer"
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief professional summary..."
            rows={4}
            className="input-field w-full resize-y"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Resume'}
          </button>
          <Link to="/app/resumes" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

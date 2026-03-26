import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { RECORD_SCHEMAS } from '../config/recordSchemas'
import {
  createUbuntuRelease,
  createPythonRelease,
  createRomanLeader,
} from '../api/recordsApi'

type CreateRecordFn = (token: string | null, body: Record<string, unknown>) => Promise<{ id: string }>
const CREATE_FNS: Record<string, CreateRecordFn> = {
  ubuntu_releases: createUbuntuRelease as CreateRecordFn,
  python_releases: createPythonRelease as CreateRecordFn,
  roman_leaders: createRomanLeader as CreateRecordFn,
}

interface AddRecordProps {
  schemaId: string
}

export function AddRecord({ schemaId }: AddRecordProps) {
  const { token } = useAuth()
  const navigate = useNavigate()

  const schema = RECORD_SCHEMAS.find((s) => s.id === schemaId)
  const createFn = schema ? CREATE_FNS[schema.id] : undefined

  const [values, setValues] = useState<Record<string, string>>(
    schema ? Object.fromEntries(schema.fields.map((f) => [f.key, ''])) : {}
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!schema || !createFn) {
    return (
      <div className="rounded-lg bg-amber-50 px-6 py-8 text-center text-amber-800">
        Unknown record type. <Link to="/app" className="font-medium underline">Back to Dashboard</Link>
      </div>
    )
  }

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = schema.fields.reduce(
        (acc, f) => {
          const v = values[f.key]?.trim()
          acc[f.key] = v ?? ''
          return acc
        },
        {} as Record<string, string>
      )
      const { id } = await createFn(token, body)
      navigate(`${schema.listPath}/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={schema.listPath} className="text-sm text-slate-500 hover:text-slate-700">
          ← {schema.title}s
        </Link>
        <h1 className="font-display mt-1 text-2xl font-semibold text-slate-900">Add {schema.title}</h1>
        <p className="mt-1 text-slate-500">{schema.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {schema.fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                className="input-field w-full resize-y"
              />
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="input-field w-full"
              />
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
          <Link to={schema.listPath} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { DetailSection } from '../components/DetailSection'
import { fetchRomanLeaderById, updateRomanLeader } from '../api/recordsApi'
import { RECORD_SCHEMAS } from '../config/recordSchemas'
import type { RomanLeader } from '../types'

const SCHEMA = RECORD_SCHEMAS.find((s) => s.id === 'roman_leaders')!

function exportJson(item: RomanLeader & { _id: string }) {
  const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roman-leader-${item.name.replace(/\s+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPdf(item: RomanLeader & { _id: string }) {
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text(item.name, 20, 20)
  doc.setFontSize(12)
  doc.setTextColor(80, 80, 80)
  doc.text(`${item.title} · ${item.dynasty}`, 20, 30)
  doc.setTextColor(0, 0, 0)
  let y = 42
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Reign', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${item.reign_start} — ${item.reign_end}`, 20, y)
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(item.summary || '', 170)
  doc.text(lines, 20, y)
  y += lines.length * 5 + 6
  if (item.notes) {
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(item.notes, 170)
    doc.text(noteLines, 20, y)
  }
  doc.save(`${item.name.replace(/\s+/g, '-')}.pdf`)
}

export function RomanLeaderDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const { theme } = useTheme()
  const [item, setItem] = useState<(RomanLeader & { _id: string }) | null | undefined>(undefined)
  const [values, setValues] = useState<Record<string, string>>({})
  const [exportOpen, setExportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const r = await fetchRomanLeaderById(token, id)
      setItem(r ?? null)
      if (r) {
        const record = r as unknown as Record<string, unknown>
        setValues(Object.fromEntries(SCHEMA.fields.map((f) => [f.key, String(record[f.key] ?? '')])))
      }
    } catch {
      setItem(null)
    }
  }, [id, token])

  useEffect(() => {
    load()
  }, [load])

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!id || !item) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateRomanLeader(token, id, values as unknown as Omit<RomanLeader, '_id'>)
      setItem({ ...item, ...values })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (item === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (item === null) {
    return (
      <div className="rounded-lg bg-amber-50 px-6 py-8 text-center text-amber-800">
        Leader not found. <Link to="/app/roman-leaders" className="font-medium underline">Back to list</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/app/roman-leaders"
            className={theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : theme === 'terracotta' ? 'text-amber-700 hover:text-amber-900' : 'text-slate-500 hover:text-slate-700'}
          >
            ← Roman Leaders
          </Link>
          <h1
            className={`font-display mt-1 text-2xl font-semibold ${theme === 'dark' ? 'text-slate-100' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-900'}`}
          >
            {item.name}
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.title} · {item.dynasty}</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>ID: {item._id}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="btn-secondary"
            >
              Export ▾
            </button>
          {exportOpen && (
            <>
              <div className="absolute inset-0 -z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { exportJson(item); setExportOpen(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => { exportPdf(item); setExportOpen(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  Export as PDF
                </button>
              </div>
            </>
          )}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}

      <DetailSection title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          {SCHEMA.fields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-600">
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
        </div>
      </DetailSection>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { fetchResumeById, updateResume } from '../api/resumeApi'
import type { FullResume, WorkExperience, Education } from '../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <h2 className="font-display font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function exportJson(resume: FullResume) {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `resume-${resume.resume?.name?.first_name || 'export'}-${resume.resume?.name?.last_name || 'data'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPdf(resume: FullResume) {
  const doc = new jsPDF()
  const r = resume.resume
  const name = `${r?.name?.first_name ?? ''} ${r?.name?.last_name ?? ''}`.trim() || 'Resume'
  let y = 20

  doc.setFontSize(18)
  doc.text(name, 20, y)
  y += 10

  if (r?.job_title?.position) {
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text(r.job_title.position, 20, y)
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  if (r?.contact?.email || r?.contact?.phone) {
    doc.setFontSize(10)
    doc.text([r?.contact?.email, r?.contact?.phone].filter(Boolean).join(' · '), 20, y)
    y += 8
  }
  y += 4

  if (resume.resume?.summary) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(resume.resume.summary, 170)
    doc.text(lines, 20, y)
    y += lines.length * 5 + 6
  }

  if (resume.Work_Experience && resume.Work_Experience.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Work Experience', 20, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const exp of resume.Work_Experience) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`${exp.role} at ${exp.org_name}`, 20, y)
      y += 5
      doc.setTextColor(100, 100, 100)
      doc.text(`${exp.employment_length} · ${exp.location}`, 20, y)
      doc.setTextColor(0, 0, 0)
      y += 5
      if (exp.job_description) {
        const descLines = doc.splitTextToSize(exp.job_description, 170)
        doc.text(descLines, 20, y)
        y += descLines.length * 5
      }
      y += 6
    }
  }

  if (resume.education && (resume.education.degree || resume.education.majored_in)) {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.text('Education', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`${resume.education.degree}${resume.education.majored_in ? ` — ${resume.education.majored_in}` : ''}`, 20, y)
    if (resume.education.location) {
      y += 5
      doc.text(resume.education.location, 20, y)
    }
  }

  doc.save(`${name.replace(/\s+/g, '-')}.pdf`)
}

export function ResumeDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const { theme } = useTheme()
  const [resume, setResume] = useState<FullResume | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const loadResume = useCallback(async () => {
    if (!id) return
    try {
      const r = await fetchResumeById(token, id)
      setResume(r ?? null)
    } catch {
      setResume(null)
    }
  }, [id, token])

  useEffect(() => {
    loadResume()
  }, [loadResume])

  const updateField = useCallback(<K extends keyof FullResume>(key: K, value: FullResume[K]) => {
    setResume((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const updateResumeField = useCallback(<K extends keyof FullResume['resume']>(
    key: K,
    value: FullResume['resume'][K]
  ) => {
    setResume((prev) => {
      if (!prev?.resume) return prev
      return {
        ...prev,
        resume: { ...prev.resume, [key]: value },
      }
    })
  }, [])

  const updateWorkExp = useCallback((index: number, field: keyof WorkExperience, value: string) => {
    setResume((prev) => {
      if (!prev?.Work_Experience) return prev
      const copy = [...prev.Work_Experience]
      if (!copy[index]) return prev
      copy[index] = { ...copy[index], [field]: value }
      return { ...prev, Work_Experience: copy }
    })
  }, [])

  const addWorkExp = useCallback(() => {
    setResume((prev) => ({
      ...prev!,
      Work_Experience: [...(prev?.Work_Experience ?? []), { org_name: '', location: '', employment_length: '', role: '', job_description: '' }],
    }))
  }, [])

  const removeWorkExp = useCallback((index: number) => {
    setResume((prev) => {
      if (!prev?.Work_Experience) return prev
      const copy = prev.Work_Experience.filter((_, i) => i !== index)
      return { ...prev, Work_Experience: copy }
    })
  }, [])

  const handleSave = async () => {
    if (!id || !resume) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateResume(token, id, {
        resume: resume.resume,
        Work_Experience: resume.Work_Experience ?? [],
        education: resume.education ?? { degree: '', location: '', majored_in: '' },
        work_authorization: resume.work_authorization,
        reference: resume.reference ?? {},
        links: resume.links ?? {},
        notes: resume.notes,
      })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (resume === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-slate-500">Resume not found.</p>
        <Link to=".." className="mt-2 text-primary-600 hover:underline">Back to list</Link>
      </div>
    )
  }

  const r = resume.resume
  const addr = r?.location?.address ?? { country: '', state: '', city: '', zip_code: '', timezone: '' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to=".."
            className={theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : theme === 'terracotta' ? 'text-amber-700 hover:text-amber-900' : 'text-slate-500 hover:text-slate-700'}
          >
            ← Back
          </Link>
          <div className={`h-6 w-px ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'}`} />
          <div>
            <h1
              className={`font-display text-2xl font-semibold ${theme === 'dark' ? 'text-slate-100' : theme === 'terracotta' ? 'text-amber-900' : 'text-slate-900'}`}
            >
              {r?.name?.first_name} {r?.name?.last_name}
            </h1>
            <p
              className={theme === 'dark' ? 'text-slate-400' : theme === 'terracotta' ? 'text-amber-700' : 'text-slate-500'}
            >
              {r?.job_title?.position || 'No role specified'}
            </p>
          </div>
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
                    onClick={() => { exportJson(resume); setExportOpen(false) }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => { exportPdf(resume); setExportOpen(false) }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  >
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Name & Role">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">First name</label>
                <input
                  type="text"
                  value={r?.name?.first_name ?? ''}
                  onChange={(e) => updateResumeField('name', { ...r?.name, first_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Last name</label>
                <input
                  type="text"
                  value={r?.name?.last_name ?? ''}
                  onChange={(e) => updateResumeField('name', { ...r?.name, last_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Position</label>
                <input
                  type="text"
                  value={r?.job_title?.position ?? ''}
                  onChange={(e) => updateResumeField('job_title', { position: e.target.value, role: r?.job_title?.role ?? '' })}
                  className="input-field"
                />
              </div>
            </div>
          </Section>
          <Section title="Summary">
            <textarea
              value={resume.resume?.summary ?? ''}
              onChange={(e) => updateResumeField('summary', e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Professional summary…"
            />
          </Section>
          <Section title="Work Experience">
            <div className="space-y-4">
              {(resume.Work_Experience ?? []).map((exp, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">#{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeWorkExp(i)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      placeholder="Organization"
                      value={exp.org_name}
                      onChange={(e) => updateWorkExp(i, 'org_name', e.target.value)}
                      className="input-field"
                    />
                    <input
                      placeholder="Role"
                      value={exp.role}
                      onChange={(e) => updateWorkExp(i, 'role', e.target.value)}
                      className="input-field"
                    />
                    <input
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => updateWorkExp(i, 'location', e.target.value)}
                      className="input-field"
                    />
                    <input
                      placeholder="Duration (e.g. 2020 - 2023)"
                      value={exp.employment_length}
                      onChange={(e) => updateWorkExp(i, 'employment_length', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <textarea
                    placeholder="Job description"
                    value={exp.job_description}
                    onChange={(e) => updateWorkExp(i, 'job_description', e.target.value)}
                    className="input-field mt-2 min-h-[60px]"
                  />
                </div>
              ))}
              <button type="button" onClick={addWorkExp} className="btn-secondary text-sm">
                + Add experience
              </button>
            </div>
          </Section>
          <Section title="Education">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Degree"
                value={resume.education?.degree ?? ''}
                onChange={(e) => updateField('education', { ...(resume.education ?? {}), degree: e.target.value } as Education)}
                className="input-field"
              />
              <input
                placeholder="Major"
                value={resume.education?.majored_in ?? ''}
                onChange={(e) => updateField('education', { ...(resume.education ?? {}), majored_in: e.target.value } as Education)}
                className="input-field"
              />
              <input
                placeholder="Location"
                value={resume.education?.location ?? ''}
                onChange={(e) => updateField('education', { ...(resume.education ?? {}), location: e.target.value } as Education)}
                className="input-field sm:col-span-2"
              />
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Contact">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={r?.contact?.email ?? ''}
                  onChange={(e) => updateResumeField('contact', { email: e.target.value, phone: r?.contact?.phone ?? '' })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={r?.contact?.phone ?? ''}
                  onChange={(e) => updateResumeField('contact', { email: r?.contact?.email ?? '', phone: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </Section>
          <Section title="Location">
            <div className="space-y-3">
              <input
                placeholder="City"
                value={addr.city}
                onChange={(e) => updateResumeField('location', { address: { ...addr, city: e.target.value } })}
                className="input-field"
              />
              <input
                placeholder="State"
                value={addr.state}
                onChange={(e) => updateResumeField('location', { address: { ...addr, state: e.target.value } })}
                className="input-field"
              />
              <input
                placeholder="Country"
                value={addr.country}
                onChange={(e) => updateResumeField('location', { address: { ...addr, country: e.target.value } })}
                className="input-field"
              />
              <input
                placeholder="ZIP"
                value={addr.zip_code}
                onChange={(e) => updateResumeField('location', { address: { ...addr, zip_code: e.target.value } })}
                className="input-field"
              />
            </div>
          </Section>
          <Section title="Work Authorization">
            <input
              type="text"
              value={resume.work_authorization ?? ''}
              onChange={(e) => updateField('work_authorization', e.target.value || undefined)}
              className="input-field"
              placeholder="e.g. US Citizen, H1B…"
            />
          </Section>
          <Section title="Notes">
            <textarea
              value={resume.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value || undefined)}
              className="input-field min-h-[80px]"
              placeholder="Internal notes…"
            />
          </Section>
        </div>
      </div>
    </div>
  )
}

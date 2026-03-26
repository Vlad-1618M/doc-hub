/** Items created or updated within this window get the list/dashboard glow. */
export const RECENT_MS = 3 * 60 * 1000

export function toTs(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  let s: string | undefined
  if (typeof v === 'string') s = v
  else if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    const t = o.t as Record<string, string> | undefined
    const d = o.$date
    s = t?.['$date'] ?? (typeof d === 'string' ? d : undefined)
  }
  if (!s) return 0
  const ms = new Date(s).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

export function isRecent(createdAt: unknown, updatedAt: unknown, now = Date.now()): boolean {
  const ts = Math.max(toTs(createdAt), toTs(updatedAt))
  const ageMs = now - ts
  return ageMs >= 0 && ageMs < RECENT_MS
}

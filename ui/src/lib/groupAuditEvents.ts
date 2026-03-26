import type { AuditEvent } from '../api/auditApi'

function atMs(iso: string): number {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? 0 : ms
}

/** Same calendar hour in local time — batches "6h ago" style duplicates. */
function localHourKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}`
}

export type GroupedAuditActivity = {
  /** Stable key for React lists. */
  groupKey: string
  count: number
  /** Newest event in the group (used for link + relative time). */
  representative: AuditEvent
  latestAtMs: number
}

/**
 * Merges audit rows that look identical to the user (same action/resource/summary)
 * within the same local hour so the dashboard Activity column stays scannable.
 */
export function groupAuditEventsForDashboard(events: AuditEvent[]): GroupedAuditActivity[] {
  if (events.length === 0) return []
  const groups = new Map<string, { count: number; representative: AuditEvent; latestMs: number }>()
  for (const ev of events) {
    const ms = atMs(ev.at)
    const sig = `${localHourKey(ms)}\0${ev.action}\0${ev.resource}\0${ev.summary}`
    const g = groups.get(sig)
    if (!g) {
      groups.set(sig, { count: 1, representative: ev, latestMs: ms })
    } else {
      g.count += 1
      if (ms > g.latestMs) {
        g.latestMs = ms
        g.representative = ev
      }
    }
  }
  return Array.from(groups.entries())
    .map(([groupKey, { count, representative, latestMs }]) => ({
      groupKey,
      count,
      representative,
      latestAtMs: latestMs,
    }))
    .sort((a, b) => b.latestAtMs - a.latestAtMs)
}

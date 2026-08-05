import type { ConnectedCalendar } from './types'

const STORAGE_KEY = 'kraft-life-calendars-v2'
const LEGACY_KEY = 'kraft-life-calendar-ics-url'

export function createCalendarId(): string {
  return `cal_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function normalizeRow(item: unknown): ConnectedCalendar | null {
  if (!item || typeof item !== 'object') return null
  const row = item as { id?: unknown; name?: unknown; icsUrl?: unknown }
  if (typeof row.id !== 'string' || typeof row.icsUrl !== 'string') return null
  const name = typeof row.name === 'string' ? row.name.trim() : 'Calendar'
  const icsUrl = row.icsUrl.trim()
  if (!icsUrl) return null
  return { id: row.id, name: name || 'Calendar', icsUrl }
}

export function normalizeConnectedCalendars(raw: unknown): ConnectedCalendar[] {
  if (!Array.isArray(raw)) return []
  const calendars: ConnectedCalendar[] = []
  for (const item of raw) {
    const calendar = normalizeRow(item)
    if (calendar) calendars.push(calendar)
  }
  return calendars
}

export function readLegacyLocalCalendars(): ConnectedCalendar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      const calendars = normalizeConnectedCalendars(parsed)
      if (calendars.length > 0) return calendars
    }
    const legacy = localStorage.getItem(LEGACY_KEY)?.trim()
    if (!legacy) return []
    return [{ id: createCalendarId(), name: 'Calendar', icsUrl: legacy }]
  } catch {
    return []
  }
}

export function clearLegacyLocalCalendars(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_KEY)
}

export function addConnectedCalendar(
  calendars: ConnectedCalendar[],
  name: string,
  icsUrl: string,
): ConnectedCalendar[] {
  const trimmedUrl = icsUrl.trim()
  const trimmedName = name.trim() || 'Calendar'
  if (calendars.some((calendar) => calendar.icsUrl === trimmedUrl)) {
    throw new Error('That calendar link is already connected.')
  }
  return [
    ...calendars,
    { id: createCalendarId(), name: trimmedName, icsUrl: trimmedUrl },
  ]
}

export function removeConnectedCalendar(
  calendars: ConnectedCalendar[],
  id: string,
): ConnectedCalendar[] {
  return calendars.filter((calendar) => calendar.id !== id)
}

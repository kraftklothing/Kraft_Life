export interface ConnectedCalendar {
  id: string
  name: string
  icsUrl: string
}

const STORAGE_KEY = 'kraft-life-calendars-v2'
const LEGACY_KEY = 'kraft-life-calendar-ics-url'

function uid(): string {
  return `cal_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function readRaw(): ConnectedCalendar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return migrateLegacyCalendar()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const calendars: ConnectedCalendar[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as { id?: unknown; name?: unknown; icsUrl?: unknown }
      if (typeof row.id !== 'string' || typeof row.icsUrl !== 'string') continue
      const name = typeof row.name === 'string' ? row.name.trim() : 'Calendar'
      const icsUrl = row.icsUrl.trim()
      if (!icsUrl) continue
      calendars.push({ id: row.id, name: name || 'Calendar', icsUrl })
    }
    return calendars
  } catch {
    return []
  }
}

function migrateLegacyCalendar(): ConnectedCalendar[] {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)?.trim()
    if (!legacy) return []
    const migrated: ConnectedCalendar[] = [
      { id: uid(), name: 'Calendar', icsUrl: legacy },
    ]
    writeRaw(migrated)
    localStorage.removeItem(LEGACY_KEY)
    return migrated
  } catch {
    return []
  }
}

function writeRaw(calendars: ConnectedCalendar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calendars))
}

export function getConnectedCalendars(): ConnectedCalendar[] {
  return readRaw()
}

export function addConnectedCalendar(name: string, icsUrl: string): ConnectedCalendar {
  const trimmedUrl = icsUrl.trim()
  const trimmedName = name.trim() || 'Calendar'
  const existing = readRaw()
  const duplicate = existing.some((calendar) => calendar.icsUrl === trimmedUrl)
  if (duplicate) {
    throw new Error('That calendar link is already connected.')
  }
  const created: ConnectedCalendar = {
    id: uid(),
    name: trimmedName,
    icsUrl: trimmedUrl,
  }
  writeRaw([...existing, created])
  return created
}

export function removeConnectedCalendar(id: string): void {
  writeRaw(readRaw().filter((calendar) => calendar.id !== id))
}

export function clearConnectedCalendars(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_KEY)
}

/** @deprecated Use getConnectedCalendars instead. */
export function getCalendarIcsUrl(): string | null {
  const calendars = getConnectedCalendars()
  return calendars[0]?.icsUrl ?? null
}

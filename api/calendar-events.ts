import ical from 'node-ical'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Mountain Time — uses MST in winter and MDT in summer. */
const MOUNTAIN_TZ = 'America/Denver'

type CalendarEventItem = {
  id: string
  title: string
  dateKey: string
  timeLabel?: string
  allDay: boolean
}

type ParsedEvent = {
  type?: string
  uid?: string
  summary?: string
  start?: Date
  end?: Date
  datetype?: string
  rrule?: { between: (start: Date, end: Date, inc?: boolean) => Date[] }
}

type MountainParts = {
  year: number
  month: number
  day: number
  hour: number
}

const mountainFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MOUNTAIN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function getMountainParts(date: Date): MountainParts {
  const parts = mountainFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  }
}

function mountainDateKey(date: Date): string {
  const parts = getMountainParts(date)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function mountainDayStartUtc(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)

  for (let dayOffset = -1; dayOffset <= 1; dayOffset += 1) {
    for (let utcHour = 0; utcHour < 24; utcHour += 1) {
      const candidate = new Date(Date.UTC(year, month - 1, day + dayOffset, utcHour, 0, 0))
      const parts = getMountainParts(candidate)
      if (parts.year === year && parts.month === month && parts.day === day && parts.hour === 0) {
        return candidate
      }
    }
  }

  return new Date(Date.UTC(year, month - 1, day, 7, 0, 0))
}

function mountainDayBounds(dateKey: string): { start: Date; end: Date } {
  const start = mountainDayStartUtc(dateKey)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

function formatTimeMountain(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: MOUNTAIN_TZ,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function isAllowedIcsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return (
      (parsed.hostname.endsWith('google.com') &&
        parsed.pathname.includes('/calendar/ical/')) ||
      parsed.pathname.endsWith('.ics')
    )
  } catch {
    return false
  }
}

function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key)
}

function allDayEventOnDate(event: ParsedEvent, dateKey: string): boolean {
  if (!event.start) return false
  const startKey =
    event.datetype === 'date' ? utcDateKey(event.start) : mountainDateKey(event.start)
  const endDate = event.end ?? new Date(event.start.getTime() + 86_400_000)
  const endKey =
    event.datetype === 'date' ? utcDateKey(endDate) : mountainDateKey(endDate)

  if (event.datetype === 'date') {
    return dateKey >= startKey && dateKey < endKey
  }
  return dateKey === startKey
}

function timedEventOnDate(event: ParsedEvent, dateKey: string): boolean {
  if (!event.start) return false
  const { start: dayStart, end: dayEnd } = mountainDayBounds(dateKey)
  const start = new Date(event.start)
  const end = event.end ? new Date(event.end) : start
  return start < dayEnd && end > dayStart
}

function buildEventItem(
  event: ParsedEvent,
  dateKey: string,
  occurrenceStart?: Date,
): CalendarEventItem | null {
  const title = typeof event.summary === 'string' ? event.summary.trim() : ''
  if (!title) return null

  const uid = typeof event.uid === 'string' ? event.uid : 'event'
  const start = occurrenceStart ?? event.start
  if (!start) return null

  const allDay = event.datetype === 'date'
  const id = occurrenceStart
    ? `${uid}-${occurrenceStart.getTime()}`
    : `${uid}-${start.getTime()}`

  return {
    id,
    title,
    dateKey,
    allDay,
    timeLabel: allDay ? undefined : formatTimeMountain(start),
  }
}

function eventsForDate(events: ParsedEvent[], dateKey: string): CalendarEventItem[] {
  const { start: dayStart, end: dayEnd } = mountainDayBounds(dateKey)
  const items: CalendarEventItem[] = []

  for (const event of events) {
    if (event.type !== 'VEVENT') continue

    if (event.rrule) {
      const windowStart = new Date(dayStart.getTime() - 86_400_000)
      const windowEnd = new Date(dayEnd.getTime() + 86_400_000)
      const occurrences = event.rrule.between(windowStart, windowEnd, true)
      for (const occurrence of occurrences) {
        const occurrenceKey =
          event.datetype === 'date' ? utcDateKey(occurrence) : mountainDateKey(occurrence)
        if (occurrenceKey !== dateKey) continue
        const item = buildEventItem(event, dateKey, occurrence)
        if (item) items.push(item)
      }
      continue
    }

    if (event.datetype === 'date') {
      if (!allDayEventOnDate(event, dateKey)) continue
    } else if (!timedEventOnDate(event, dateKey)) {
      continue
    }

    const item = buildEventItem(event, dateKey)
    if (item) items.push(item)
  }

  items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    return (a.timeLabel ?? '').localeCompare(b.timeLabel ?? '')
  })

  return items
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as { icsUrl?: string; date?: string }
    const icsUrl = typeof body?.icsUrl === 'string' ? body.icsUrl.trim() : ''
    const dateKey = typeof body?.date === 'string' ? body.date.trim() : ''

    if (!icsUrl || !isAllowedIcsUrl(icsUrl)) {
      return res.status(400).json({ error: 'Paste your Google Calendar secret iCal link.' })
    }
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: 'Invalid date.' })
    }

    const parsed = await ical.async.fromURL(icsUrl)
    const vevents = Object.values(parsed).filter(
      (item): item is ParsedEvent =>
        !!item && typeof item === 'object' && (item as ParsedEvent).type === 'VEVENT',
    )

    const events = eventsForDate(vevents, dateKey)
    return res.status(200).json({ events })
  } catch (error) {
    console.error('calendar-events error', error)
    return res.status(500).json({ error: 'Could not load calendar events.' })
  }
}

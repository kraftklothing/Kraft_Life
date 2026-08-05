import ical from 'node-ical'
import type { VercelRequest, VercelResponse } from '@vercel/node'

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

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
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
    event.datetype === 'date' ? utcDateKey(event.start) : toDateKey(event.start)
  const endDate = event.end ?? addDays(event.start, 1)
  const endKey =
    event.datetype === 'date' ? utcDateKey(endDate) : toDateKey(endDate)

  if (event.datetype === 'date') {
    return dateKey >= startKey && dateKey < endKey
  }
  return dateKey === startKey
}

function timedEventOnDate(event: ParsedEvent, dayStart: Date, dayEnd: Date): boolean {
  if (!event.start) return false
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
    timeLabel: allDay ? undefined : formatTime(start),
  }
}

function eventsForDate(events: ParsedEvent[], dateKey: string): CalendarEventItem[] {
  const dayStart = parseDateKey(dateKey)
  const dayEnd = addDays(dayStart, 1)
  const items: CalendarEventItem[] = []

  for (const event of events) {
    if (event.type !== 'VEVENT') continue

    if (event.rrule) {
      const windowStart = addDays(dayStart, -1)
      const windowEnd = addDays(dayEnd, 1)
      const occurrences = event.rrule.between(windowStart, windowEnd, true)
      for (const occurrence of occurrences) {
        const occurrenceKey =
          event.datetype === 'date' ? utcDateKey(occurrence) : toDateKey(occurrence)
        if (occurrenceKey !== dateKey) continue
        const item = buildEventItem(event, dateKey, occurrence)
        if (item) items.push(item)
      }
      continue
    }

    if (event.datetype === 'date') {
      if (!allDayEventOnDate(event, dateKey)) continue
    } else if (!timedEventOnDate(event, dayStart, dayEnd)) {
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

export interface CalendarEventItem {
  id: string
  title: string
  dateKey: string
  timeLabel?: string
  allDay: boolean
}

export async function fetchCalendarEvents(
  icsUrl: string,
  dateKey: string,
): Promise<CalendarEventItem[]> {
  const response = await fetch('/api/calendar-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icsUrl, date: dateKey }),
  })

  const raw = await response.text()
  let data: { events?: CalendarEventItem[]; error?: string } | null = null
  if (raw) {
    try {
      data = JSON.parse(raw) as { events?: CalendarEventItem[]; error?: string }
    } catch {
      throw new Error('Calendar returned an unexpected response.')
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Calendar request failed (${response.status})`,
    )
  }

  return Array.isArray(data?.events) ? data.events : []
}

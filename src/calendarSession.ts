const ICS_URL_KEY = 'kraft-life-calendar-ics-url'

export function getCalendarIcsUrl(): string | null {
  try {
    const url = localStorage.getItem(ICS_URL_KEY)?.trim()
    return url ? url : null
  } catch {
    return null
  }
}

export function saveCalendarIcsUrl(url: string): void {
  localStorage.setItem(ICS_URL_KEY, url.trim())
}

export function clearCalendarIcsUrl(): void {
  localStorage.removeItem(ICS_URL_KEY)
}

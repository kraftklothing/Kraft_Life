/** Format a Date as local YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatDayHeading(date: Date, todayKey: string): string {
  const key = toDateKey(date)
  if (key === todayKey) return 'Today'
  const yesterday = toDateKey(addDays(parseDateKey(todayKey), -1))
  const tomorrow = toDateKey(addDays(parseDateKey(todayKey), 1))
  if (key === yesterday) return 'Yesterday'
  if (key === tomorrow) return 'Tomorrow'
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

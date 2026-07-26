import { addDays, daysBetween, parseDateKey, startOfDay, toDateKey } from './dates'
import type { Task } from './types'

export function taskAppliesOnDate(task: Task, dateKey: string): boolean {
  const day = startOfDay(parseDateKey(dateKey))
  const start = startOfDay(parseDateKey(task.startDate))
  if (day < start) return false

  switch (task.repetition) {
    case 'none':
      return dateKey === task.startDate
    case 'daily':
      return true
    case 'weekly':
      return day.getDay() === start.getDay()
    case 'monthly':
      return day.getDate() === start.getDate()
    case 'yearly':
      return (
        day.getMonth() === start.getMonth() && day.getDate() === start.getDate()
      )
    case 'custom': {
      const every = Math.max(1, task.customRepeat?.everyDays ?? 1)
      const diff = daysBetween(start, day)
      return diff % every === 0
    }
    default:
      return false
  }
}

/** Next calendar day after dateKey that the task is scheduled for, or null. */
export function nextOccurrence(task: Task, dateKey: string): string | null {
  if (task.repetition === 'none') return null
  let cursor = addDays(parseDateKey(dateKey), 1)
  // Safety bound: search up to ~4 years.
  for (let i = 0; i < 366 * 4; i += 1) {
    const key = toDateKey(cursor)
    if (taskAppliesOnDate(task, key)) return key
    cursor = addDays(cursor, 1)
  }
  return null
}

/** Most recent scheduled occurrence on or before dateKey, or null. */
export function latestOccurrenceOnOrBefore(
  task: Task,
  dateKey: string,
): string | null {
  const day = startOfDay(parseDateKey(dateKey))
  const start = startOfDay(parseDateKey(task.startDate))
  if (day < start) return null
  if (taskAppliesOnDate(task, dateKey)) return dateKey

  let cursor = addDays(day, -1)
  for (let i = 0; i < 366 * 4; i += 1) {
    if (cursor < start) return null
    const key = toDateKey(cursor)
    if (taskAppliesOnDate(task, key)) return key
    cursor = addDays(cursor, -1)
  }
  return null
}

/**
 * An occurrence O is satisfied if the user completed the task on any day
 * from O up to (but not including) the next occurrence. That way a missed
 * weekly/custom task can be finished on a later day without stacking debt,
 * and a daily never requires two completions on the same day.
 */
export function isOccurrenceSatisfied(task: Task, occurrenceKey: string): boolean {
  const next = nextOccurrence(task, occurrenceKey)
  for (const [key, done] of Object.entries(task.completions)) {
    if (!done) continue
    if (key < occurrenceKey) continue
    if (next && key >= next) continue
    return true
  }
  return false
}

/**
 * Which occurrence a date view represents (scheduled day or rolled-over
 * incomplete prior occurrence). Null if the task should not appear.
 */
export function occurrenceForDate(task: Task, dateKey: string): string | null {
  const day = startOfDay(parseDateKey(dateKey))
  const start = startOfDay(parseDateKey(task.startDate))
  if (day < start) return null

  if (taskAppliesOnDate(task, dateKey)) {
    return dateKey
  }

  // Rollover: show incomplete prior occurrence until the next scheduled day.
  // Daily always applies, so it never stacks via rollover.
  if (task.repetition === 'none') {
    if (!isOccurrenceSatisfied(task, task.startDate)) return task.startDate
    // After it's done, still show on the day(s) it was completed.
    if (task.completions[dateKey]) return task.startDate
    return null
  }

  const prior = latestOccurrenceOnOrBefore(task, dateKey)
  if (!prior) return null
  if (isOccurrenceSatisfied(task, prior)) return null
  const next = nextOccurrence(task, prior)
  if (next && dateKey >= next) return null
  return prior
}

export function taskVisibleOnDate(task: Task, dateKey: string): boolean {
  return occurrenceForDate(task, dateKey) !== null
}

export function isCompletedForDateView(task: Task, dateKey: string): boolean {
  const occurrence = occurrenceForDate(task, dateKey)
  if (!occurrence) return false
  return isOccurrenceSatisfied(task, occurrence)
}

export function isCompletedOn(task: Task, dateKey: string): boolean {
  return Boolean(task.completions[dateKey])
}

export function sortTasksForDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.createdAt - b.createdAt
  })
}

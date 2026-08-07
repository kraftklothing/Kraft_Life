import { addDays, daysBetween, parseDateKey, startOfDay, toDateKey } from './dates'
import type { Task } from './types'

function everyDays(task: Task): number {
  return Math.max(1, task.customRepeat?.everyDays ?? 1)
}

/** Completion dates strictly before `beforeExclusive` (if set), ascending. */
function sortedCompletions(
  task: Task,
  beforeExclusive?: string,
): string[] {
  return Object.entries(task.completions)
    .filter(
      ([key, done]) =>
        Boolean(done) &&
        (beforeExclusive === undefined || key < beforeExclusive),
    )
    .map(([key]) => key)
    .sort()
}

/**
 * Next show date for after_completion: startDate until first done, then
 * (most recent completion + N days). Completions on/after `beforeExclusive`
 * are ignored so the completion day can still render the cycle it closed.
 */
export function afterCompletionDue(
  task: Task,
  beforeExclusive?: string,
): string {
  const completions = sortedCompletions(task, beforeExclusive)
  if (completions.length === 0) return task.startDate
  const last = completions[completions.length - 1]!
  return toDateKey(addDays(parseDateKey(last), everyDays(task)))
}

/** Earliest completion on or after dueKey, if any. */
function closingCompletionForDue(
  task: Task,
  dueKey: string,
): string | null {
  let closing: string | null = null
  for (const [key, done] of Object.entries(task.completions)) {
    if (!done || key < dueKey) continue
    // Only count it if this completion closed *this* due (not a later cycle).
    if (afterCompletionDue(task, key) !== dueKey) continue
    if (!closing || key < closing) closing = key
  }
  return closing
}

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
    case 'weekdays': {
      const days = task.customRepeat?.weekdays ?? []
      return days.includes(day.getDay())
    }
    case 'monthly':
      return day.getDate() === start.getDate()
    case 'yearly':
      return (
        day.getMonth() === start.getMonth() && day.getDate() === start.getDate()
      )
    case 'custom': {
      const every = everyDays(task)
      const diff = daysBetween(start, day)
      return diff % every === 0
    }
    case 'after_completion':
      return dateKey === afterCompletionDue(task)
    default:
      return false
  }
}

/** Next scheduled occurrence after dateKey, or null. */
export function nextOccurrence(task: Task, dateKey: string): string | null {
  if (task.repetition === 'none') return null

  if (task.repetition === 'after_completion') {
    // dateKey is an occurrence due date.
    const closing = closingCompletionForDue(task, dateKey)
    if (!closing) return null
    return toDateKey(addDays(parseDateKey(closing), everyDays(task)))
  }

  let cursor = addDays(parseDateKey(dateKey), 1)
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
  if (task.repetition === 'after_completion') {
    if (dateKey < task.startDate) return null
    // Due pending at the start of dateKey (completions that day not applied yet
    // for "open due", but for latest on or before end of day use next morning).
    const dueOpen = afterCompletionDue(task, dateKey)
    if (dueOpen <= dateKey) return dueOpen
    return null
  }

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

/** Scheduled occurrence immediately before occurrenceKey, or null. */
export function previousOccurrence(
  task: Task,
  occurrenceKey: string,
): string | null {
  if (task.repetition === 'none') return null

  if (task.repetition === 'after_completion') {
    if (occurrenceKey <= task.startDate) return null
    const n = everyDays(task)
    const completions = sortedCompletions(task)
    let due = task.startDate
    let previous: string | null = null
    for (const c of completions) {
      if (afterCompletionDue(task, c) !== due) continue
      const nextDue = toDateKey(addDays(parseDateKey(c), n))
      previous = due
      due = nextDue
      if (due === occurrenceKey) return previous
      if (due > occurrenceKey) return previous
    }
    return null
  }

  const start = startOfDay(parseDateKey(task.startDate))
  let cursor = addDays(parseDateKey(occurrenceKey), -1)
  for (let i = 0; i < 366 * 4; i += 1) {
    if (cursor < start) return null
    const key = toDateKey(cursor)
    if (taskAppliesOnDate(task, key)) return key
    cursor = addDays(cursor, -1)
  }
  return null
}

/** Number of days the task has been marked complete (all-time). */
export function allTimeCompletionCount(task: Task): number {
  let count = 0
  for (const done of Object.values(task.completions)) {
    if (done) count += 1
  }
  return count
}

/**
 * An occurrence O is satisfied if the user completed the task on any day
 * from O up to (but not including) the next occurrence. That way a missed
 * weekly/custom task can be finished on a later day without stacking debt,
 * and a daily never requires two completions on the same day.
 */
export function isOccurrenceSatisfied(
  task: Task,
  occurrenceKey: string,
): boolean {
  if (task.repetition === 'after_completion') {
    return closingCompletionForDue(task, occurrenceKey) !== null
  }

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

  if (task.repetition === 'after_completion') {
    // On the day you complete it, show the cycle that was due that morning.
    if (task.completions[dateKey]) {
      return afterCompletionDue(task, dateKey)
    }
    const due = afterCompletionDue(task)
    if (dateKey < due) return null
    return due
  }

  if (taskAppliesOnDate(task, dateKey)) {
    return dateKey
  }

  // Selected weekdays only — no rollover onto other days of the week.
  if (task.repetition === 'weekdays') {
    return null
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

/** Categories that still show during vacation mode (High / Events). */
export function isVacationKeepCategoryName(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (n === 'high' || n === 'events') return true
  if (n === 'high priority' || n.startsWith('high ')) return true
  return false
}

export function taskVisibleInDayMode(
  task: Task,
  categories: { id: string; name: string }[],
): boolean {
  if (task.categoryIds.length === 0) return false
  const byId = new Map(categories.map((c) => [c.id, c]))
  return task.categoryIds.some((id) => {
    const cat = byId.get(id)
    return cat ? isVacationKeepCategoryName(cat.name) : false
  })
}

/** @deprecated Use taskVisibleInDayMode */
export function taskVisibleInVacationMode(
  task: Task,
  categories: { id: string; name: string }[],
): boolean {
  return taskVisibleInDayMode(task, categories)
}

export function taskVisibleInMode(task: Task, modeId: string): boolean {
  return task.visibleInModes?.[modeId] !== false
}

/** @deprecated Use taskVisibleInMode(task, 'work') */
export function taskVisibleInWorkMode(task: Task): boolean {
  return taskVisibleInMode(task, 'work')
}

/** @deprecated Use taskVisibleInMode(task, 'home') */
export function taskVisibleInHomeMode(task: Task): boolean {
  return taskVisibleInMode(task, 'home')
}

/** @deprecated Use taskVisibleInMode(task, 'out') */
export function taskVisibleInOutMode(task: Task): boolean {
  return taskVisibleInMode(task, 'out')
}

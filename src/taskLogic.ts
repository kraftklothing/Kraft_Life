import { daysBetween, parseDateKey, startOfDay } from './dates'
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

export function isCompletedOn(task: Task, dateKey: string): boolean {
  return Boolean(task.completions[dateKey])
}

export function sortTasksForDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.createdAt - b.createdAt
  })
}

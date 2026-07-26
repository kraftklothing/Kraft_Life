export type Repetition =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'
  | 'none'

export type CategoryId = string

export interface CustomRepeat {
  /** Repeat every N days (minimum 1). */
  everyDays: number
}

export interface Task {
  id: string
  title: string
  categoryId: CategoryId
  repetition: Repetition
  customRepeat?: CustomRepeat
  /** Local date YYYY-MM-DD when the task starts / was created for. */
  startDate: string
  /** Per-day completion map keyed by YYYY-MM-DD. */
  completions: Record<string, boolean>
  /** Sort order within a day view (lower = higher). */
  order: number
  createdAt: number
}

export interface Category {
  id: CategoryId
  name: string
}

export interface Reward {
  id: string
  name: string
  cost: number
}

export interface AppState {
  tasks: Task[]
  categories: Category[]
  dollars: number
  rewards: Reward[]
  /** Date keys (YYYY-MM-DD) with vacation mode on for that day only. */
  vacationDays: Record<string, boolean>
  /** When true, header shows percent complete instead of counts. */
  showPercent: boolean
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'general', name: 'General' },
  { id: 'personal', name: 'Personal' },
  { id: 'work', name: 'Work' },
]

export const DEFAULT_REWARDS: Reward[] = [
  { id: 'coffee', name: 'Coffee treat', cost: 3 },
  { id: 'movie', name: 'Movie night', cost: 8 },
  { id: 'dinner', name: 'Nice dinner', cost: 15 },
]

export const REPETITION_LABELS: Record<Repetition, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
  none: 'Does not repeat',
}

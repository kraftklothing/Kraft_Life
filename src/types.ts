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
  /** Built-in categories cannot be deleted. */
  builtin: boolean
}

export interface Profile {
  displayName: string
  email: string
}

export interface AppState {
  tasks: Task[]
  categories: Category[]
  dollars: number
  profile: Profile
  /** When true, header shows percent complete instead of counts. */
  showPercent: boolean
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'general', name: 'General', builtin: true },
  { id: 'personal', name: 'Personal', builtin: true },
  { id: 'work', name: 'Work', builtin: true },
]

export const REPETITION_LABELS: Record<Repetition, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
  none: 'Does not repeat',
}

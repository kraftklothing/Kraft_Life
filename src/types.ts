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
  /** One or more categories this task appears under. */
  categoryIds: CategoryId[]
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

export interface ProjectStep {
  id: string
  title: string
  /** Dollars awarded when this step is completed. */
  dollars: number
  completed: boolean
  /** Local date YYYY-MM-DD when the step was completed, if any. */
  completedOn?: string | null
  order: number
}

export interface Project {
  id: string
  name: string
  order: number
  steps: ProjectStep[]
  createdAt: number
}

export interface Goal {
  id: string
  name: string
  order: number
  taskIds: string[]
  projectIds: string[]
  createdAt: number
}

export type DollarLedgerKind = 'earned' | 'spent' | 'adjusted'

/** One balance change — amount is signed (+ earned / − spent or clawback). */
export interface DollarLedgerEntry {
  id: string
  at: number
  /** Local date YYYY-MM-DD the change belongs to. */
  dateKey: string
  amount: number
  kind: DollarLedgerKind
  label: string
}

export interface FocusTimer {
  id: string
  title: string
  /** Minutes of running time needed to earn $1. */
  minutesForDollar: number
  order: number
}

export interface AppState {
  tasks: Task[]
  categories: Category[]
  dollars: number
  rewards: Reward[]
  projects: Project[]
  goals: Goal[]
  timers: FocusTimer[]
  /** Date keys (YYYY-MM-DD) with vacation mode on for that day only. */
  vacationDays: Record<string, boolean>
  /** When true, header shows percent complete instead of counts. */
  showPercent: boolean
  /** Recent $ earned / spent / balance edits (newest last). */
  dollarLedger: DollarLedgerEntry[]
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

export const DEFAULT_TIMERS: FocusTimer[] = [
  {
    id: 'room-cleaning',
    title: 'Room cleaning',
    minutesForDollar: 20,
    order: 0,
  },
  {
    id: 'kitchen-cleaning',
    title: 'Kitchen cleaning',
    minutesForDollar: 10,
    order: 1,
  },
]

export const REPETITION_LABELS: Record<Repetition, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
  none: 'Does not repeat',
}

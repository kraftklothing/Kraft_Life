export type Repetition =
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'monthly'
  | 'yearly'
  | 'custom'
  | 'after_completion'
  | 'none'

export type CategoryId = string

export interface CustomRepeat {
  /** Repeat every N days (minimum 1). Used by custom / after_completion. */
  everyDays?: number
  /**
   * Days of the week for weekdays repetition.
   * 0 = Sunday … 6 = Saturday (Date#getDay).
   */
  weekdays?: number[]
}

export interface Task {
  id: string
  title: string
  /** Optional notes; lines starting with "- " render as bullets. */
  description: string
  /** One or more categories this task appears under. */
  categoryIds: CategoryId[]
  repetition: Repetition
  customRepeat?: CustomRepeat
  /** Local date YYYY-MM-DD when the task starts / was created for. */
  startDate: string
  /** Per-day completion map keyed by YYYY-MM-DD. */
  completions: Record<string, boolean>
  /** When false, hidden while work mode is on. Defaults to true. */
  visibleInWorkMode: boolean
  /** When false, hidden while home mode is on. Defaults to true. */
  visibleInHomeMode: boolean
  /** When false, hidden while out mode is on. Defaults to true. */
  visibleInOutMode: boolean
  /** Sort order within a day view (lower = higher). */
  order: number
  createdAt: number
}

export interface Category {
  id: CategoryId
  name: string
  /** When true, the day-view heading is larger, bolder, and more colorful. */
  attention?: boolean
}

export interface Reward {
  id: string
  name: string
  cost: number
}

/** A spent reward waiting to arrive (or be returned). */
export interface PendingDelivery {
  id: string
  rewardId: string
  rewardName: string
  cost: number
  createdAt: number
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
  /** Optional notes shown under the goal title. */
  description: string
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

export interface ConnectedCalendar {
  id: string
  name: string
  icsUrl: string
}

export interface AppState {
  tasks: Task[]
  taskCategories: Category[]
  dollars: number
  rewards: Reward[]
  projects: Project[]
  goals: Goal[]
  timers: FocusTimer[]
  /** Google Calendar iCal links synced with cloud save. */
  connectedCalendars: ConnectedCalendar[]
  /** Spent rewards that are not delivered yet. */
  pendingDeliveries: PendingDelivery[]
  /** Date keys (YYYY-MM-DD) with vacation mode on for that day only. */
  vacationDays: Record<string, boolean>
  /** When true, tasks marked not visible in work mode are hidden. */
  workMode: boolean
  /** When true, tasks marked not visible in home mode are hidden. */
  homeMode: boolean
  /** When true, tasks marked not visible in out mode are hidden. */
  outMode: boolean
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

export const DEFAULT_TASK_CATEGORIES = DEFAULT_CATEGORIES

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
  weekdays: 'Days of the week',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Every N days',
  after_completion: 'Days in between',
  none: 'Does not repeat',
}

/** Short labels for weekday toggles, Sunday-first to match Date#getDay. */
export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

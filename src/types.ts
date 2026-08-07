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

export type ModeIconId =
  | 'plane'
  | 'briefcase'
  | 'home'
  | 'car'
  | 'star'
  | 'heart'
  | 'book'
  | 'sun'
  | 'moon'
  | 'leaf'
  | 'music'
  | 'coffee'
  | 'dumbbell'
  | 'backpack'

export interface Mode {
  id: string
  name: string
  icon: ModeIconId
  order: number
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
  /**
   * Per filter-mode visibility keyed by mode id.
   * Missing key defaults to visible (true).
   */
  visibleInModes: Record<string, boolean>
  /** Sort order within a day view (lower = higher). */
  order: number
  createdAt: number
}

export interface Category {
  id: CategoryId
  name: string
  /** When true, the day-view heading is larger, bolder, and more colorful. */
  attention?: boolean
  /**
   * When true, the day-view heading uses the yellow calendar style,
   * and completing tasks in this category does not earn money.
   */
  reminders?: boolean
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
  /**
   * Seconds accrued toward the next $1.
   * Survives pause, reload, and days until a full cycle is earned
   * (then leftover seconds carry forward).
   */
  elapsedSeconds: number
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
  /**
   * Calendar events cleared from the day view (no money earned).
   * Keys are `${dateKey}:${eventId}`.
   */
  clearedCalendarEvents: Record<string, boolean>
  /** Spent rewards that are not delivered yet. */
  pendingDeliveries: PendingDelivery[]
  /**
   * Built-in vacation mode: date keys (YYYY-MM-DD) when it is on for that day.
   * Not user-configurable — always available as the plane button.
   */
  vacationDays: Record<string, boolean>
  /** User-configurable filter modes (defaults: Work, Home, Out). */
  modes: Mode[]
  /** Mode ids that are currently active (global filter toggles). */
  activeModeIds: string[]
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

/** Built-in vacation mode id — never stored in the customizable modes list. */
export const VACATION_MODE_ID = 'vacation'

/** Recommended starter filter modes — users can rename, delete, or add more. */
export const DEFAULT_MODES: Mode[] = [
  { id: 'work', name: 'Work', icon: 'briefcase', order: 0 },
  { id: 'home', name: 'Home', icon: 'home', order: 1 },
  { id: 'out', name: 'Out', icon: 'car', order: 2 },
]

export const MODE_ICON_IDS: ModeIconId[] = [
  'plane',
  'briefcase',
  'home',
  'car',
  'star',
  'heart',
  'book',
  'sun',
  'moon',
  'leaf',
  'music',
  'coffee',
  'dumbbell',
  'backpack',
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
    elapsedSeconds: 0,
  },
  {
    id: 'kitchen-cleaning',
    title: 'Kitchen cleaning',
    minutesForDollar: 10,
    order: 1,
    elapsedSeconds: 0,
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

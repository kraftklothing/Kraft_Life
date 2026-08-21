import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { addDays, formatDayHeading, parseDateKey, toDateKey } from './dates'
import { appendLedgerEntry, loadState, normalizeState, pickNewerState, saveState } from './storage'
import { useCloudSync } from './CloudSyncProvider'
import CloudSyncSettings from './CloudSyncSettings'
import CalendarSettings from './CalendarSettings'
import SettingsSection from './SettingsSection'
import { fetchCalendarEvents, type CalendarEventItem } from './calendarApi'
import {
  allTimeCompletionCount,
  isCompletedForDateView,
  isOccurrenceSatisfied,
  nextOccurrence,
  occurrenceForDate,
  sortTasksForDay,
  taskRepeats,
  taskVisibleOnDate,
  taskVisibleInDayMode,
  taskVisibleInMode,
  withDeferredDate,
} from './taskLogic'
import {
  goalProgressedOnDate,
  UNASSIGNED_GOAL_ID,
  unassignedProgressedOnDate,
  unassignedRecurringTasks,
} from './goalLogic'
import { nextIncompleteStep } from './projectLogic'
import CategorySettingsPanel from './CategorySettingsPanel'
import BudgetingStreamsSettingsPanel from './BudgetingStreamsSettingsPanel'
import ModeSettingsPanel from './ModeSettingsPanel'
import NavigationSettingsPanel from './NavigationSettingsPanel'
import { ModeIcon } from './modeIcons'
import RoutinesView, { type ActiveRoutineRun } from './RoutinesView'
import {
  durationToFields,
  parseDurationFields,
  remainingSecondsFromDeadline,
  sortedRoutineSteps,
  stepDeadlineFromNow,
} from './routineLogic'
import TaskNotesPanel, {
  TaskDescriptionPreview,
} from './TaskNotesPanel'
import { playTimerDing } from './timerDing'
import {
  OPTIONAL_NAV_VIEWS,
  REPETITION_LABELS,
  WEEKDAY_OPTIONS,
  type AppState,
  type Category,
  type ConnectedCalendar,
  type FocusTimer,
  type Goal,
  type Mode,
  type ModeIconId,
  type OptionalNavView,
  type PendingDelivery,
  type Project,
  type ProjectStep,
  type Repetition,
  type Reward,
  type Routine,
  type RoutineStep,
  type SpendingEntry,
  type BudgetingStream,
  type Task,
} from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function BarsIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
      <rect x="0" y="0" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="5.75" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="11.5" width="18" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M14 6v16M6 14h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 10h18V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 7c-1.8-2.8-4.8-2.8-5.5-1.2C5.7 7.2 7.4 9 12 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 7c1.8-2.8 4.8-2.8 5.5-1.2C18.3 7.2 16.6 9 12 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M15.5 7.5c0-1.4-1.6-2.5-3.5-2.5s-3.5 1.1-3.5 2.5 1.1 2.2 3.5 2.7c2.4.5 3.5 1.3 3.5 2.8S13.9 16 12 16s-3.5-1.1-3.5-2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13a7.7 7.7 0 0 0 .05-1l2.05-1.55-2-3.45-2.4.8a7.4 7.4 0 0 0-1.75-1L15 4h-4l-.35 2.8a7.4 7.4 0 0 0-1.75 1l-2.4-.8-2 3.45L6.55 12a7.7 7.7 0 0 0 0 2l-2.05 1.55 2 3.45 2.4-.8a7.4 7.4 0 0 0 1.75 1L11 22h4l.35-2.8a7.4 7.4 0 0 0 1.75-1l2.4.8 2-3.45L19.4 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProjectIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 11h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m8 12 2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function ChecklistIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6h11M9 12h11M9 18h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m4 5.8 1.4 1.4L7.6 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m4 11.8 1.4 1.4L7.6 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m4 17.8 1.4 1.4L7.6 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type MainView =
  | 'tasks'
  | 'projects'
  | 'goals'
  | 'routines'
  | 'timer'
  | 'budgeting'
  | 'rewards'
  | 'settings'

function isOptionalNavView(view: MainView): view is OptionalNavView {
  return (OPTIONAL_NAV_VIEWS as string[]).includes(view)
}

function isNavViewVisible(
  visibility: AppState['navVisibility'],
  view: MainView,
): boolean {
  if (view === 'settings') return true
  if (!isOptionalNavView(view)) return true
  return visibility[view] !== false
}

function firstVisibleMainView(
  visibility: AppState['navVisibility'],
): MainView {
  for (const view of OPTIONAL_NAV_VIEWS) {
    if (visibility[view] !== false) return view
  }
  return 'settings'
}

const COMPLETED_GROUP_ID = '__completed__'
const CALENDAR_GROUP_ID = '__calendar__'

function isCalendarTask(taskId: string): boolean {
  return taskId.startsWith('calendar:')
}

function calendarEventIdFromTaskId(taskId: string): string {
  return taskId.slice('calendar:'.length)
}

function calendarClearKey(dateKey: string, eventId: string): string {
  return `${dateKey}:${eventId}`
}

function isCalendarEventCleared(
  cleared: Record<string, boolean>,
  dateKey: string,
  eventId: string,
): boolean {
  return cleared[calendarClearKey(dateKey, eventId)] === true
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M2.5 7.2 5.6 10.2 11.5 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L16.62 5.5a1.5 1.5 0 0 0-2.12 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 5.75v12.5L18.5 12 8 5.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5.5h3.25v13H7v-13Zm6.75 0H17v13h-3.25v-13Z" fill="currentColor" />
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 9.5v5h3.2L12 18.5V5.5L7.7 9.5H4.5Z"
        fill="currentColor"
      />
      <path
        d="M15.2 9.2a3.6 3.6 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17.4 6.6a6.5 6.5 0 0 1 0 10.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 9.5v5h3.2L12 18.5V5.5L7.7 9.5H4.5Z"
        fill="currentColor"
      />
      <path
        d="M16 9.5 20.5 14.5M20.5 9.5 16 14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.25V12l3.25 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavDollarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.25v17.5M16.2 8c0-1.95-1.9-3.25-4.2-3.25S7.8 6.05 7.8 8s1.1 2.85 4.2 3.45c3.1.6 4.2 1.6 4.2 3.55S14.3 18.25 12 18.25 7.8 16.95 7.8 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={open ? 'chevron open' : 'chevron'}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatTimerSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yearRaw, monthRaw] = monthKey.split('-').map(Number)
  const d = new Date(yearRaw, (monthRaw || 1) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split('-').map(Number)
  return new Date(yearRaw, (monthRaw || 1) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function formatSpendDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Newest-first month keys ending at `endMonth`, length `count`. */
function recentMonthKeys(endMonth: string, count: number): string[] {
  const keys: string[] = []
  for (let i = 0; i < count; i += 1) {
    keys.push(shiftMonth(endMonth, -i))
  }
  return keys
}

function totalForStreamInMonth(
  entries: SpendingEntry[],
  streamId: string,
  monthKey: string,
): number {
  let total = 0
  for (const entry of entries) {
    if (entry.streamId !== streamId) continue
    if (!entry.dateKey.startsWith(`${monthKey}-`)) continue
    total += entry.amount
  }
  return Math.round(total * 100) / 100
}

export default function App() {
  const { scheduleSave, takeLoadedState, cloudLoadCount, unlocked } = useCloudSync()
  const [state, setState] = useState<AppState>(() => loadState())
  const [viewDate, setViewDate] = useState(() => startToday())
  const [title, setTitle] = useState('')
  const [repetition, setRepetition] = useState<Repetition | ''>('')
  const [customEveryDays, setCustomEveryDays] = useState('2')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [visibleInModes, setVisibleInModes] = useState<Record<string, boolean>>(
    {},
  )
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  /** YYYY-MM-DD the task is scheduled / starts on (editable to move days). */
  const [taskDay, setTaskDay] = useState(() => toDateKey(startToday()))
  const [addError, setAddError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [notesTaskId, setNotesTaskId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [mainView, setMainView] = useState<MainView>('tasks')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)
  const [editingRoutineStepId, setEditingRoutineStepId] = useState<
    string | null
  >(null)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [newRoutineReward, setNewRoutineReward] = useState('5')
  const [routineStepKind, setRoutineStepKind] = useState<'task' | 'custom'>(
    'task',
  )
  const [routineStepTaskId, setRoutineStepTaskId] = useState('')
  const [routineTaskSearch, setRoutineTaskSearch] = useState('')
  const [routineStepTitle, setRoutineStepTitle] = useState('')
  const [routineStepMinutes, setRoutineStepMinutes] = useState('5')
  const [routineStepSeconds, setRoutineStepSeconds] = useState('0')
  const [activeRoutineRun, setActiveRoutineRun] =
    useState<ActiveRoutineRun | null>(null)
  const [routineNowMs, setRoutineNowMs] = useState(() => Date.now())
  const [newCategory, setNewCategory] = useState('')
  const [newModeName, setNewModeName] = useState('')
  const [newModeIcon, setNewModeIcon] = useState<ModeIconId>('star')
  const [editingModeId, setEditingModeId] = useState<string | null>(null)
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardCost, setNewRewardCost] = useState('5')
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [newSpendingAmount, setNewSpendingAmount] = useState('')
  const [newSpendingStreamId, setNewSpendingStreamId] = useState('')
  const [newSpendingNote, setNewSpendingNote] = useState('')
  const [newSpendingAffectsVirtual, setNewSpendingAffectsVirtual] = useState(false)
  const [editingSpendingId, setEditingSpendingId] = useState<string | null>(null)
  const [activeSpendingStreamId, setActiveSpendingStreamId] = useState<
    string | null
  >(null)
  const [spendingMonth, setSpendingMonth] = useState(() => {
    const today = startToday()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyIncomeDraft, setMonthlyIncomeDraft] = useState('0')
  const [spendConfirmReward, setSpendConfirmReward] = useState<Reward | null>(
    null,
  )
  const [newProjectName, setNewProjectName] = useState('')
  const [newStepTitle, setNewStepTitle] = useState('')
  const [newStepDollars, setNewStepDollars] = useState('5')
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [toast, setToast] = useState('')
  const [balanceEditOpen, setBalanceEditOpen] = useState(false)
  const [balanceDraft, setBalanceDraft] = useState('')
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [newStreamName, setNewStreamName] = useState('')
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null)
  const [draggingStreamId, setDraggingStreamId] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])
  const [collapsedTaskCategoryIds, setCollapsedTaskCategoryIds] = useState<
    string[]
  >([COMPLETED_GROUP_ID])
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null)
  const [runningTimerId, setRunningTimerId] = useState<string | null>(null)
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null)
  const [newTimerTitle, setNewTimerTitle] = useState('')
  const [newTimerMinutes, setNewTimerMinutes] = useState('20')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingRewardId, setDraggingRewardId] = useState<string | null>(null)
  const [draggingTimerId, setDraggingTimerId] = useState<string | null>(null)
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null)
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(
    null,
  )
  const [draggingModeId, setDraggingModeId] = useState<string | null>(null)
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null)
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null)
  const [draggingRoutineId, setDraggingRoutineId] = useState<string | null>(null)
  const [draggingRoutineStepId, setDraggingRoutineStepId] = useState<
    string | null
  >(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [dayAnim, setDayAnim] = useState<'none' | 'from-left' | 'from-right'>(
    'none',
  )
  const [taskSwipe, setTaskSwipe] = useState<{
    id: string
    offset: number
  } | null>(null)

  const formId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const swipeRef = useRef<{
    x: number
    y: number
    active: boolean
    locked: 'x' | 'y' | null
    pointerId: number | null
  } | null>(null)
  const taskSwipeRef = useRef<{
    id: string
    x: number
    y: number
    locked: 'x' | 'y' | null
    pointerId: number
  } | null>(null)
  const suppressTaskClickRef = useRef(false)
  const dayPaneRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const rewardDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const timerDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const stepDragRef = useRef<{
    projectId: string
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const categoryDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const streamDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const modeDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const projectDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const goalDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const routineDragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)
  const routineStepDragRef = useRef<{
    routineId: string
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)

  const todayKey = toDateKey(startToday())
  const viewKey = toDateKey(viewDate)
  const sortedModes = useMemo(
    () => [...state.modes].sort((a, b) => a.order - b.order),
    [state.modes],
  )
  const vacationOn = Boolean(state.vacationDays[viewKey])
  const activeFilterModes = useMemo(
    () => sortedModes.filter((mode) => state.activeModeIds.includes(mode.id)),
    [sortedModes, state.activeModeIds],
  )
  const notesTask = notesTaskId
    ? state.tasks.find((task) => task.id === notesTaskId) ?? null
    : null

  useEffect(() => {
    saveState(state)
    scheduleSave(state)
  }, [state, scheduleSave])

  useEffect(() => {
    const loaded = takeLoadedState()
    if (loaded) {
      setState((prev) => {
        const remote = normalizeState(loaded)
        const next = pickNewerState(prev, remote)
        if (
          next.connectedCalendars.length === 0 &&
          prev.connectedCalendars.length > 0
        ) {
          return { ...next, connectedCalendars: prev.connectedCalendars }
        }
        // If local edits are newer, React may bail out on the same reference —
        // still push them so cloud catches up.
        if (next === prev && (prev.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
          queueMicrotask(() => scheduleSave(prev))
        }
        return next
      })
    }
  }, [cloudLoadCount, takeLoadedState, scheduleSave])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    setMonthlyIncomeDraft(String(state.monthlyIncome))
  }, [state.monthlyIncome])

  useEffect(() => {
    if (isNavViewVisible(state.navVisibility, mainView)) return
    goToView(firstVisibleMainView(state.navVisibility))
  }, [state.navVisibility, mainView])

  useEffect(() => {
    if (!runningTimerId) return
    const id = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        timers: prev.timers.map((timer) =>
          timer.id === runningTimerId
            ? {
                ...timer,
                elapsedSeconds: Math.max(0, timer.elapsedSeconds ?? 0) + 1,
              }
            : timer,
        ),
      }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [runningTimerId])

  useEffect(() => {
    if (!activeRoutineRun) return
    const routine = state.routines.find(
      (r) => r.id === activeRoutineRun.routineId,
    )
    const steps = routine ? sortedRoutineSteps(routine) : []
    if (activeRoutineRun.stepIndex >= steps.length) return
    if (activeRoutineRun.stepEndsAtMs == null) return

    const syncFromWallClock = () => {
      const now = Date.now()
      setRoutineNowMs(now)
      setActiveRoutineRun((prev) => {
        if (!prev || prev.stepEndsAtMs == null) return prev
        const remaining = remainingSecondsFromDeadline(prev.stepEndsAtMs, now)
        if (remaining === prev.remainingSeconds) return prev
        return { ...prev, remainingSeconds: remaining }
      })
    }

    // Catch up immediately (e.g. after returning from background), then
    // keep the display fresh. Wall-clock math means missed ticks while the
    // phone sleeps or the app is backgrounded do not stall the countdown.
    syncFromWallClock()
    const id = window.setInterval(syncFromWallClock, 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromWallClock()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', syncFromWallClock)
    window.addEventListener('pageshow', syncFromWallClock)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', syncFromWallClock)
      window.removeEventListener('pageshow', syncFromWallClock)
    }
  }, [
    activeRoutineRun?.routineId,
    activeRoutineRun?.stepIndex,
    activeRoutineRun?.stepEndsAtMs,
    state.routines,
  ])

  const dayTasks = useMemo(() => {
    const applicable = state.tasks.filter((task) => {
      if (!taskVisibleOnDate(task, viewKey)) return false
      if (
        vacationOn &&
        !taskVisibleInDayMode(task, state.taskCategories)
      ) {
        return false
      }
      for (const mode of activeFilterModes) {
        if (!taskVisibleInMode(task, mode.id)) return false
      }
      return true
    })
    return sortTasksForDay(applicable)
  }, [
    state.tasks,
    state.taskCategories,
    viewKey,
    vacationOn,
    activeFilterModes,
  ])

  const sortedProjects = useMemo(
    () => [...state.projects].sort((a, b) => a.order - b.order),
    [state.projects],
  )

  const activeProject = useMemo(
    () => sortedProjects.find((p) => p.id === activeProjectId) ?? null,
    [sortedProjects, activeProjectId],
  )

  const sortedGoals = useMemo(
    () => [...state.goals].sort((a, b) => a.order - b.order),
    [state.goals],
  )

  const sortedRoutines = useMemo(
    () => [...state.routines].sort((a, b) => a.order - b.order),
    [state.routines],
  )

  const activeRoutine = useMemo(
    () => sortedRoutines.find((r) => r.id === activeRoutineId) ?? null,
    [sortedRoutines, activeRoutineId],
  )

  const repeatingTasksForRoutine = useMemo(() => {
    const query = routineTaskSearch.trim().toLowerCase()
    return state.tasks
      .filter((task) => taskRepeats(task))
      .filter((task) =>
        query ? task.title.toLowerCase().includes(query) : true,
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [state.tasks, routineTaskSearch])

  const unassignedRecurring = useMemo(
    () => unassignedRecurringTasks(state),
    [state.tasks, state.goals],
  )

  const showingUnassigned = activeGoalId === UNASSIGNED_GOAL_ID

  const sortedTimers = useMemo(
    () => [...state.timers].sort((a, b) => a.order - b.order),
    [state.timers],
  )

  const activeTimer = useMemo(
    () => sortedTimers.find((t) => t.id === activeTimerId) ?? null,
    [sortedTimers, activeTimerId],
  )

  const activeGoal = useMemo(
    () =>
      showingUnassigned
        ? null
        : (sortedGoals.find((g) => g.id === activeGoalId) ?? null),
    [sortedGoals, activeGoalId, showingUnassigned],
  )

  const groupedDayTasks = useMemo(() => {
    const incomplete: Task[] = []
    const completed: Task[] = []
    for (const task of dayTasks) {
      if (isCompletedForDateView(task, viewKey)) completed.push(task)
      else incomplete.push(task)
    }

    const byCat = new Map<string, Task[]>()
    for (const task of incomplete) {
      const ids =
        task.categoryIds.length > 0 ? [...new Set(task.categoryIds)] : []
      if (ids.length === 0) {
        const list = byCat.get('uncategorized') ?? []
        list.push(task)
        byCat.set('uncategorized', list)
        continue
      }
      let placed = false
      for (const id of ids) {
        if (!state.taskCategories.some((c) => c.id === id)) continue
        const list = byCat.get(id) ?? []
        list.push(task)
        byCat.set(id, list)
        placed = true
      }
      if (!placed) {
        const list = byCat.get('uncategorized') ?? []
        list.push(task)
        byCat.set('uncategorized', list)
      }
    }

    const groups: {
      id: string
      name: string
      attention?: boolean
      reminders?: boolean
      tasks: Task[]
    }[] = []
    for (const cat of state.taskCategories) {
      const tasks = byCat.get(cat.id)
      if (!tasks?.length) continue
      groups.push({
        id: cat.id,
        name: cat.name,
        attention: cat.attention === true,
        reminders: cat.reminders === true,
        tasks: sortTasksForDay(tasks),
      })
    }
    const uncategorized = byCat.get('uncategorized')
    if (uncategorized?.length) {
      groups.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        tasks: sortTasksForDay(uncategorized),
      })
    }
    if (completed.length > 0) {
      groups.push({
        id: COMPLETED_GROUP_ID,
        name: 'Completed',
        tasks: sortTasksForDay(completed),
      })
    }
    return groups
  }, [dayTasks, state.taskCategories, viewKey])

  useEffect(() => {
    if (state.connectedCalendars.length === 0) {
      setCalendarEvents([])
      return
    }

    let cancelled = false
    void fetchCalendarEvents(
      state.connectedCalendars.map((calendar) => calendar.icsUrl),
      viewKey,
    )
      .then((events) => {
        if (!cancelled) setCalendarEvents(events)
      })
      .catch(() => {
        if (!cancelled) setCalendarEvents([])
      })

    return () => {
      cancelled = true
    }
  }, [viewKey, state.connectedCalendars])

  const groupedDayView = useMemo(() => {
    const withoutCompleted = groupedDayTasks.filter(
      (group) => group.id !== COMPLETED_GROUP_ID,
    )
    const completedGroup = groupedDayTasks.find(
      (group) => group.id === COMPLETED_GROUP_ID,
    )
    const attentionGroups = withoutCompleted.filter((group) => group.attention === true)
    const reminderGroups = withoutCompleted.filter(
      (group) => group.attention !== true && group.reminders === true,
    )
    const otherGroups = withoutCompleted.filter(
      (group) => group.attention !== true && group.reminders !== true,
    )

    const toCalendarTask = (
      event: (typeof calendarEvents)[number],
      index: number,
      cleared: boolean,
    ): Task => ({
      id: `calendar:${event.id}`,
      title: `${event.timeLabel} · ${event.title}`,
      description: '',
      categoryIds: [CALENDAR_GROUP_ID],
      repetition: 'none',
      startDate: viewKey,
      completions: cleared ? { [viewKey]: true } : {},
      visibleInModes: {},
      order: index,
      createdAt: 0,
    })

    const activeCalendarTasks: Task[] = []
    const clearedCalendarTasks: Task[] = []
    calendarEvents.forEach((event, index) => {
      const cleared = isCalendarEventCleared(
        state.clearedCalendarEvents,
        viewKey,
        event.id,
      )
      const task = toCalendarTask(event, index, cleared)
      if (cleared) clearedCalendarTasks.push(task)
      else activeCalendarTasks.push(task)
    })

    const mergedCompletedTasks = [
      ...(completedGroup?.tasks ?? []),
      ...clearedCalendarTasks,
    ]

    return [
      ...attentionGroups,
      ...(activeCalendarTasks.length > 0
        ? [
            {
              id: CALENDAR_GROUP_ID,
              name: 'Calendar',
              tasks: activeCalendarTasks,
            },
          ]
        : []),
      ...reminderGroups,
      ...otherGroups,
      ...(mergedCompletedTasks.length > 0
        ? [
            {
              id: COMPLETED_GROUP_ID,
              name: 'Completed',
              tasks: mergedCompletedTasks,
            },
          ]
        : []),
    ]
  }, [
    calendarEvents,
    groupedDayTasks,
    state.clearedCalendarEvents,
    viewKey,
  ])

  const hasDayContent = dayTasks.length > 0 || calendarEvents.length > 0

  // Reminders (and deferred/moved-off tasks, already omitted from dayTasks)
  // do not affect done/left or % complete.
  const progressTasks = useMemo(() => {
    return dayTasks.filter(
      (task) =>
        !task.categoryIds.some((categoryId) =>
          state.taskCategories.some(
            (category) =>
              category.id === categoryId && category.reminders === true,
          ),
        ),
    )
  }, [dayTasks, state.taskCategories])

  const completedCount = progressTasks.filter((t) =>
    isCompletedForDateView(t, viewKey),
  ).length
  const remainingCount = progressTasks.length - completedCount
  const percent =
    progressTasks.length === 0
      ? 0
      : Math.round((completedCount / progressTasks.length) * 100)

  const todayLedger = useMemo(() => {
    return state.dollarLedger
      .filter((entry) => entry.dateKey === todayKey)
      .slice()
      .reverse()
  }, [state.dollarLedger, todayKey])

  const todayLedgerTotals = useMemo(() => {
    let received = 0
    let used = 0
    for (const entry of todayLedger) {
      if (entry.amount > 0) received += entry.amount
      else if (entry.amount < 0) used += -entry.amount
    }
    return { received, used }
  }, [todayLedger])

  const spendingEntriesForMonth = useMemo(() => {
    return state.realSpending
      .filter((entry) => entry.dateKey.startsWith(`${spendingMonth}-`))
      .slice()
      .sort((a, b) => b.at - a.at)
  }, [state.realSpending, spendingMonth])

  const spendingTotals = useMemo(() => {
    let totalSpent = 0
    const byType: Record<string, number> = {}
    for (const entry of spendingEntriesForMonth) {
      totalSpent += entry.amount
      byType[entry.streamId] = (byType[entry.streamId] ?? 0) + entry.amount
    }
    const categoryBreakdown = Object.entries(byType)
      .map(([streamId, amount]) => ({
        streamId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
    return {
      totalSpent,
      net: state.monthlyIncome - totalSpent,
      categoryBreakdown,
    }
  }, [spendingEntriesForMonth, state.monthlyIncome])

  const activeSpendingStream = useMemo(
    () =>
      activeSpendingStreamId
        ? (state.budgetingStreams.find((s) => s.id === activeSpendingStreamId) ??
          null)
        : null,
    [activeSpendingStreamId, state.budgetingStreams],
  )

  const streamMonthComparison = useMemo(() => {
    if (!activeSpendingStreamId) return null
    const months = recentMonthKeys(spendingMonth, 6).map((monthKey) => ({
      monthKey,
      amount: totalForStreamInMonth(
        state.realSpending,
        activeSpendingStreamId,
        monthKey,
      ),
    }))
    const average =
      Math.round(
        (months.reduce((sum, row) => sum + row.amount, 0) / months.length) * 100,
      ) / 100
    const currentMonthEntries = spendingEntriesForMonth.filter(
      (entry) => entry.streamId === activeSpendingStreamId,
    )
    return { months, average, currentMonthEntries }
  }, [
    activeSpendingStreamId,
    spendingMonth,
    state.realSpending,
    spendingEntriesForMonth,
  ])

  function updateState(updater: (prev: AppState) => AppState) {
    setState((prev) => {
      const next = updater(prev)
      if (next === prev) return prev
      return { ...next, updatedAt: Date.now() }
    })
  }

  function applyCloudState(loaded: AppState) {
    setState((prev) => {
      const remote = normalizeState(loaded)
      const next = pickNewerState(prev, remote)
      if (
        next.connectedCalendars.length === 0 &&
        prev.connectedCalendars.length > 0
      ) {
        return { ...next, connectedCalendars: prev.connectedCalendars }
      }
      if (next === prev && (prev.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
        queueMicrotask(() => scheduleSave(prev))
      }
      return next
    })
  }

  useEffect(() => {
    if (!runningTimerId) return
    const timer = state.timers.find((t) => t.id === runningTimerId)
    if (!timer) return
    const goalSeconds = Math.max(1, timer.minutesForDollar) * 60
    const elapsed = Math.max(0, timer.elapsedSeconds ?? 0)
    if (elapsed < goalSeconds) return
    const cycles = Math.floor(elapsed / goalSeconds)
    if (cycles < 1) return
    const today = toDateKey(startToday())
    updateState((prev) => {
      const current = prev.timers.find((t) => t.id === runningTimerId)
      if (!current) return prev
      const currentElapsed = Math.max(0, current.elapsedSeconds ?? 0)
      const currentGoal = Math.max(1, current.minutesForDollar) * 60
      if (currentElapsed < currentGoal) return prev
      const earnedCycles = Math.floor(currentElapsed / currentGoal)
      if (earnedCycles < 1) return prev
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      for (let i = 0; i < earnedCycles; i += 1) {
        dollars += 1
        dollarLedger = appendLedgerEntry(dollarLedger, {
          dateKey: today,
          amount: 1,
          kind: 'earned',
          label: current.title,
        })
      }
      return {
        ...prev,
        dollars,
        dollarLedger,
        timers: prev.timers.map((t) =>
          t.id === runningTimerId
            ? { ...t, elapsedSeconds: currentElapsed % currentGoal }
            : t,
        ),
      }
    })
    setToast(
      cycles === 1
        ? `+$1 · ${timer.title}`
        : `+$${cycles} · ${timer.title}`,
    )
    if (state.timerSoundEnabled) playTimerDing()
  }, [runningTimerId, state.timers, state.timerSoundEnabled])

  function startCategoryEdit(id: string) {
    setEditingCategoryId(id)
  }

  function finishCategoryEdit(id: string, name: string) {
    renameCategory(id, name)
    setEditingCategoryId((current) => (current === id ? null : current))
  }

  function cancelCategoryEdit() {
    setEditingCategoryId(null)
  }

  function liveRenameCategory(id: string, name: string) {
    updateState((prev) => ({
      ...prev,
      taskCategories: prev.taskCategories.map((c) =>
        c.id === id ? { ...c, name } : c,
      ),
    }))
  }

  function toggleTaskCategoryCollapsed(id: string) {
    setCollapsedTaskCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function resetComposerFields() {
    setTitle('')
    setRepetition('')
    setCategoryIds([])
    setCustomEveryDays('2')
    setSelectedWeekdays([])
    setVisibleInModes({})
    setTaskDay(toDateKey(viewDate))
    setAddError('')
    setEditingTaskId(null)
    setEditingTimerId(null)
    setEditingRewardId(null)
    setEditingSpendingId(null)
    setEditingProjectId(null)
    setEditingStepId(null)
    setEditingGoalId(null)
    setNewProjectName('')
    setNewStepTitle('')
    setNewStepDollars('5')
    setNewGoalName('')
    setNewGoalDescription('')
    setNewTimerTitle('')
    setNewTimerMinutes('20')
    setNewRewardName('')
    setNewRewardCost('5')
    setNewSpendingAmount('')
    setNewSpendingStreamId('')
    setNewSpendingNote('')
    setNewSpendingAffectsVirtual(false)
  }

  function toggleComposerCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
    if (addError) setAddError('')
  }

  function toggleComposerWeekday(day: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((item) => item !== day)
        : [...prev, day].sort((a, b) => a - b),
    )
    if (addError) setAddError('')
  }

  function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()

    const trimmed = title.trim()
    if (!trimmed) {
      setAddError('Enter a task name.')
      titleInputRef.current?.focus()
      return
    }
    if (!repetition) {
      setAddError('Choose how often this repeats.')
      return
    }
    const dayKey = taskDay.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      setAddError('Pick a valid day.')
      return
    }
    const parsedDay = parseDateKey(dayKey)
    if (
      Number.isNaN(parsedDay.getTime()) ||
      toDateKey(parsedDay) !== dayKey
    ) {
      setAddError('Pick a valid day.')
      return
    }
    const selectedCategories = categoryIds.filter((id) =>
      state.taskCategories.some((c) => c.id === id),
    )
    if (selectedCategories.length === 0) {
      setAddError('Choose at least one category.')
      return
    }

    let customRepeat: Task['customRepeat']
    if (repetition === 'custom' || repetition === 'after_completion') {
      const every = Number.parseInt(customEveryDays, 10)
      if (!Number.isFinite(every) || every < 1) {
        setAddError(
          repetition === 'after_completion'
            ? 'Days in between needs a number of days (1 or more).'
            : 'Custom repeat needs a number of days (1 or more).',
        )
        return
      }
      customRepeat = { everyDays: every }
    }
    if (repetition === 'weekdays') {
      if (selectedWeekdays.length === 0) {
        setAddError('Pick at least one day of the week.')
        return
      }
      customRepeat = { weekdays: [...selectedWeekdays] }
    }

    const keepsCustomRepeat =
      repetition === 'custom' ||
      repetition === 'after_completion' ||
      repetition === 'weekdays'

    if (editingTaskId) {
      let dayChanged = false
      updateState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => {
          if (task.id !== editingTaskId) return task
          dayChanged = dayKey !== task.startDate
          const updated: Task = {
            ...task,
            title: trimmed,
            categoryIds: selectedCategories,
            repetition,
            customRepeat: keepsCustomRepeat ? customRepeat : undefined,
            startDate: dayKey,
            visibleInModes: { ...visibleInModes },
          }
          // Only mark the viewed day deferred when the edit actually makes the
          // task leave that day. Rolled-over one-offs keep their original
          // startDate in the Day field, so dayKey !== viewKey alone used to
          // hide them from today on a no-op save.
          const movedOffView =
            taskVisibleOnDate(task, viewKey) &&
            !taskVisibleOnDate(updated, viewKey)
          return {
            ...updated,
            deferredDates: movedOffView
              ? { ...task.deferredDates, [viewKey]: true }
              : task.deferredDates,
          }
        }),
      }))
      if (dayChanged) {
        setViewDate(parsedDay)
      }
      resetComposerFields()
      setAddOpen(false)
      setToast(dayChanged ? 'Task moved' : 'Task updated')
      return
    }

    const tasksOnTargetDay = state.tasks.filter((t) =>
      taskVisibleOnDate(t, dayKey),
    )
    const maxOrder = tasksOnTargetDay.reduce(
      (max, t) => Math.max(max, t.order),
      -1,
    )
    const task: Task = {
      id: uid('task'),
      title: trimmed,
      description: '',
      categoryIds: selectedCategories,
      repetition,
      customRepeat,
      startDate: dayKey,
      completions: {},
      visibleInModes: { ...visibleInModes },
      order: maxOrder + 1,
      createdAt: Date.now(),
    }

    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    if (dayKey !== viewKey) {
      setViewDate(parsedDay)
    }
    resetComposerFields()
    setAddOpen(false)
    setToast('Task added')
  }

  function goToView(view: MainView) {
    setAddOpen(false)
    setMainView(view)
    if (view !== 'projects') setActiveProjectId(null)
    if (view !== 'goals') setActiveGoalId(null)
    if (view !== 'routines') {
      setActiveRoutineId(null)
      setActiveRoutineRun(null)
    }
    if (view !== 'timer') setActiveTimerId(null)
    if (view !== 'budgeting') setActiveSpendingStreamId(null)
  }

  function toggleNavVisibility(view: OptionalNavView) {
    updateState((prev) => {
      const currentlyVisible = prev.navVisibility[view] !== false
      return {
        ...prev,
        navVisibility: {
          ...prev.navVisibility,
          [view]: !currentlyVisible,
        },
      }
    })
  }

  function openAddComposer() {
    if (mainView === 'settings') return
    if (activeRoutineRun) return
    if (
      mainView === 'projects' ||
      mainView === 'rewards' ||
      mainView === 'budgeting' ||
      mainView === 'goals' ||
      mainView === 'routines' ||
      mainView === 'timer'
    ) {
      if (mainView === 'projects') {
        setEditingProjectId(null)
        setEditingStepId(null)
        setNewProjectName('')
        setNewStepTitle('')
        setNewStepDollars('5')
      }
      if (mainView === 'goals') {
        setEditingGoalId(null)
        setNewGoalName('')
        setNewGoalDescription('')
      }
      if (mainView === 'routines') {
        if (activeRoutine) {
          const firstRepeating =
            state.tasks.find((task) => taskRepeats(task))?.id ?? ''
          setEditingRoutineId(null)
          setEditingRoutineStepId(null)
          setRoutineStepKind('task')
          setRoutineStepTaskId(firstRepeating)
          setRoutineTaskSearch('')
          setRoutineStepTitle('')
          setRoutineStepMinutes('5')
          setRoutineStepSeconds('0')
        } else {
          setEditingRoutineId(null)
          setEditingRoutineStepId(null)
          setNewRoutineName('')
          setNewRoutineReward('5')
        }
      }
      if (mainView === 'timer') {
        setEditingTimerId(null)
        setNewTimerTitle('')
        setNewTimerMinutes('20')
      }
      if (mainView === 'rewards') {
        setEditingRewardId(null)
        setNewRewardName('')
        setNewRewardCost('5')
      }
      if (mainView === 'budgeting') {
        setEditingSpendingId(null)
        setNewSpendingAmount('')
        setNewSpendingStreamId('')
        setNewSpendingNote('')
        setNewSpendingAffectsVirtual(false)
      }
      setAddOpen(true)
      setAddError('')
      return
    }
    resetComposerFields()
    setAddOpen(true)
    window.setTimeout(() => titleInputRef.current?.focus(), 80)
  }

  function openEditComposer(task: Task) {
    if (isCalendarTask(task.id)) return
    closeTaskNotes()
    setMainView('tasks')
    setEditingTaskId(task.id)
    setTitle(task.title)
    setRepetition(task.repetition)
    setCategoryIds([...task.categoryIds])
    setCustomEveryDays(String(task.customRepeat?.everyDays ?? 2))
    setSelectedWeekdays([...(task.customRepeat?.weekdays ?? [])])
    setTaskDay(task.startDate)
    setVisibleInModes({ ...(task.visibleInModes ?? {}) })
    setAddError('')
    setAddOpen(true)
    window.setTimeout(() => titleInputRef.current?.focus(), 80)
  }

  function openTaskNotes(task: Task) {
    setNotesTaskId(task.id)
    setNotesDraft(task.description ?? '')
  }

  function closeTaskNotes() {
    setNotesTaskId(null)
    setNotesDraft('')
  }

  function saveTaskNotes() {
    if (!notesTaskId) return
    const description = notesDraft.replace(/\s+$/g, '')
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === notesTaskId ? { ...task, description } : task,
      ),
    }))
    closeTaskNotes()
  }

  function closeAddComposer() {
    setAddOpen(false)
    resetComposerFields()
  }

  function deleteTask(taskId: string) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
      goals: prev.goals.map((goal) => ({
        ...goal,
        taskIds: goal.taskIds.filter((id) => id !== taskId),
      })),
      routines: prev.routines.map((routine) => ({
        ...routine,
        steps: [...routine.steps]
          .filter((step) => step.kind !== 'task' || step.taskId !== taskId)
          .sort((a, b) => a.order - b.order)
          .map((step, index) => ({ ...step, order: index })),
      })),
    }))
    resetComposerFields()
    setAddOpen(false)
    setToast('Task deleted')
  }

  function toggleComplete(taskId: string) {
    if (isCalendarTask(taskId)) {
      const eventId = calendarEventIdFromTaskId(taskId)
      const key = calendarClearKey(viewKey, eventId)
      updateState((prev) => {
        const clearedCalendarEvents = { ...prev.clearedCalendarEvents }
        if (clearedCalendarEvents[key]) {
          delete clearedCalendarEvents[key]
        } else {
          clearedCalendarEvents[key] = true
        }
        return { ...prev, clearedCalendarEvents }
      })
      return
    }
    updateState((prev) => {
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      const tasks = prev.tasks.map((task) => {
        if (task.id !== taskId) return task
        const occurrence = occurrenceForDate(task, viewKey)
        if (!occurrence) return task
        const satisfied = isOccurrenceSatisfied(task, occurrence)
        const nextCompletions = { ...task.completions }
        if (satisfied) {
          const next = nextOccurrence(task, occurrence)
          for (const key of Object.keys(nextCompletions)) {
            if (key < occurrence) continue
            if (next && key >= next) continue
            delete nextCompletions[key]
          }
        } else {
          nextCompletions[viewKey] = true
          const isReminderTask = task.categoryIds.some((categoryId) =>
            prev.taskCategories.some(
              (category) =>
                category.id === categoryId && category.reminders === true,
            ),
          )
          if (!isReminderTask) {
            dollars += 1
            dollarLedger = appendLedgerEntry(dollarLedger, {
              dateKey: viewKey,
              amount: 1,
              kind: 'earned',
              label: task.title,
            })
          }
        }
        return { ...task, completions: nextCompletions }
      })
      return { ...prev, tasks, dollars, dollarLedger }
    })
  }

  function addProject(): boolean {
    const name = newProjectName.trim()
    if (!name) {
      setToast('Name your project')
      return false
    }
    if (editingProjectId) {
      updateState((prev) => ({
        ...prev,
        projects: prev.projects.map((project) =>
          project.id === editingProjectId ? { ...project, name } : project,
        ),
      }))
      setEditingProjectId(null)
      setNewProjectName('')
      setToast('Project updated')
      return true
    }
    const maxOrder = state.projects.reduce((max, p) => Math.max(max, p.order), -1)
    const project: Project = {
      id: uid('project'),
      name,
      order: maxOrder + 1,
      steps: [],
      createdAt: Date.now(),
    }
    updateState((prev) => ({ ...prev, projects: [...prev.projects, project] }))
    setNewProjectName('')
    setActiveProjectId(project.id)
    setToast('Project added')
    return true
  }

  function openEditProject(project: Project) {
    setEditingProjectId(project.id)
    setEditingStepId(null)
    setNewProjectName(project.name)
    setAddOpen(true)
    setAddError('')
  }

  function deleteProject(id: string) {
    updateState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      goals: prev.goals.map((goal) => ({
        ...goal,
        projectIds: goal.projectIds.filter((pid) => pid !== id),
      })),
    }))
    if (activeProjectId === id) setActiveProjectId(null)
    if (editingProjectId === id) {
      setEditingProjectId(null)
      setAddOpen(false)
      resetComposerFields()
    }
    setToast('Project deleted')
  }

  function addProjectStep(projectId: string): boolean {
    const title = newStepTitle.trim()
    const dollars = Number.parseInt(newStepDollars, 10)
    if (!title) {
      setToast('Name the step')
      return false
    }
    if (!Number.isFinite(dollars) || dollars < 0) {
      setToast('Step $ must be 0 or more')
      return false
    }
    if (editingStepId) {
      updateState((prev) => ({
        ...prev,
        projects: prev.projects.map((project) => {
          if (project.id !== projectId) return project
          return {
            ...project,
            steps: project.steps.map((step) =>
              step.id === editingStepId
                ? { ...step, title, dollars }
                : step,
            ),
          }
        }),
      }))
      setEditingStepId(null)
      setNewStepTitle('')
      setNewStepDollars('5')
      setToast('Step updated')
      return true
    }
    updateState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => {
        if (project.id !== projectId) return project
        const maxOrder = project.steps.reduce((max, s) => Math.max(max, s.order), -1)
        const step: ProjectStep = {
          id: uid('step'),
          title,
          dollars,
          completed: false,
          completedOn: null,
          order: maxOrder + 1,
        }
        return { ...project, steps: [...project.steps, step] }
      }),
    }))
    setNewStepTitle('')
    setNewStepDollars('5')
    setToast('Step added')
    return true
  }

  function openEditStep(step: ProjectStep) {
    setEditingStepId(step.id)
    setEditingProjectId(null)
    setNewStepTitle(step.title)
    setNewStepDollars(String(step.dollars))
    setAddOpen(true)
    setAddError('')
  }

  function toggleProjectStep(projectId: string, stepId: string) {
    const today = toDateKey(startToday())
    updateState((prev) => {
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      const projects = prev.projects.map((project) => {
        if (project.id !== projectId) return project
        const steps = project.steps.map((step) => {
          if (step.id !== stepId) return step
          const label = `${project.name}: ${step.title}`
          if (step.completed) {
            if (step.dollars > 0) {
              const clawback = Math.min(dollars, step.dollars)
              dollars = Math.max(0, dollars - step.dollars)
              if (clawback > 0) {
                dollarLedger = appendLedgerEntry(dollarLedger, {
                  dateKey: today,
                  amount: -clawback,
                  kind: 'earned',
                  label: `Undo · ${label}`,
                })
              }
            }
            return { ...step, completed: false, completedOn: null }
          }
          dollars += step.dollars
          if (step.dollars > 0) {
            dollarLedger = appendLedgerEntry(dollarLedger, {
              dateKey: today,
              amount: step.dollars,
              kind: 'earned',
              label,
            })
          }
          return { ...step, completed: true, completedOn: today }
        })
        return { ...project, steps }
      })
      return { ...prev, projects, dollars, dollarLedger }
    })
  }

  function addGoal(): boolean {
    const name = newGoalName.trim()
    if (!name) {
      setToast('Name your goal')
      return false
    }
    const description = newGoalDescription.trim()
    if (editingGoalId) {
      updateState((prev) => ({
        ...prev,
        goals: prev.goals.map((goal) =>
          goal.id === editingGoalId
            ? { ...goal, name, description }
            : goal,
        ),
      }))
      setEditingGoalId(null)
      setNewGoalName('')
      setNewGoalDescription('')
      setToast('Goal updated')
      return true
    }
    const maxOrder = state.goals.reduce((max, g) => Math.max(max, g.order), -1)
    const goal: Goal = {
      id: uid('goal'),
      name,
      description,
      order: maxOrder + 1,
      taskIds: [],
      projectIds: [],
      createdAt: Date.now(),
    }
    updateState((prev) => ({ ...prev, goals: [...prev.goals, goal] }))
    setNewGoalName('')
    setNewGoalDescription('')
    setActiveGoalId(goal.id)
    setToast('Goal added')
    return true
  }

  function openEditGoal(goal: Goal) {
    setEditingGoalId(goal.id)
    setNewGoalName(goal.name)
    setNewGoalDescription(goal.description ?? '')
    setAddOpen(true)
    setAddError('')
  }

  function deleteGoal(id: string) {
    updateState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }))
    if (activeGoalId === id) setActiveGoalId(null)
    if (editingGoalId === id) {
      setEditingGoalId(null)
      setAddOpen(false)
      resetComposerFields()
    }
    setToast('Goal deleted')
  }

  function addRoutine(): boolean {
    const name = newRoutineName.trim()
    if (!name) {
      setToast('Name your routine')
      return false
    }
    const reward = Number(newRoutineReward)
    if (!Number.isFinite(reward) || reward < 0) {
      setToast('Enter a valid $ reward (0 or more)')
      return false
    }
    const completionReward = Math.floor(reward)
    if (editingRoutineId) {
      updateState((prev) => ({
        ...prev,
        routines: prev.routines.map((routine) =>
          routine.id === editingRoutineId
            ? { ...routine, name, completionReward }
            : routine,
        ),
      }))
      setEditingRoutineId(null)
      setNewRoutineName('')
      setNewRoutineReward('5')
      setToast('Routine updated')
      return true
    }
    const maxOrder = state.routines.reduce((max, r) => Math.max(max, r.order), -1)
    const routine: Routine = {
      id: uid('routine'),
      name,
      completionReward,
      steps: [],
      order: maxOrder + 1,
      createdAt: Date.now(),
    }
    updateState((prev) => ({
      ...prev,
      routines: [...prev.routines, routine],
    }))
    setNewRoutineName('')
    setNewRoutineReward('5')
    setActiveRoutineId(routine.id)
    setToast('Routine added')
    return true
  }

  function openEditRoutine(routine: Routine) {
    setEditingRoutineId(routine.id)
    setEditingRoutineStepId(null)
    setNewRoutineName(routine.name)
    setNewRoutineReward(String(routine.completionReward))
    setAddOpen(true)
    setAddError('')
  }

  function deleteRoutine(id: string) {
    updateState((prev) => ({
      ...prev,
      routines: prev.routines.filter((r) => r.id !== id),
    }))
    if (activeRoutineId === id) setActiveRoutineId(null)
    if (activeRoutineRun?.routineId === id) setActiveRoutineRun(null)
    if (editingRoutineId === id) {
      setEditingRoutineId(null)
      setAddOpen(false)
    }
    setToast('Routine deleted')
  }

  function addRoutineStep(routineId: string): boolean {
    const durationSeconds = parseDurationFields(
      routineStepMinutes,
      routineStepSeconds,
    )
    if (durationSeconds == null) {
      setToast('Set a duration of at least 00:01')
      return false
    }

    let nextStep: RoutineStep | null = null
    if (routineStepKind === 'task') {
      if (!routineStepTaskId) {
        setToast('Pick a task to link')
        return false
      }
      const linkedTask = state.tasks.find((task) => task.id === routineStepTaskId)
      if (!linkedTask) {
        setToast('That task no longer exists')
        return false
      }
      if (!taskRepeats(linkedTask)) {
        setToast('Pick a repeating task')
        return false
      }
      nextStep = {
        id: editingRoutineStepId ?? uid('rstep'),
        kind: 'task',
        taskId: routineStepTaskId,
        durationSeconds,
        order: 0,
      }
    } else {
      const title = routineStepTitle.trim()
      if (!title) {
        setToast('Name this custom step')
        return false
      }
      nextStep = {
        id: editingRoutineStepId ?? uid('rstep'),
        kind: 'custom',
        title,
        durationSeconds,
        order: 0,
      }
    }

    const step = nextStep
    updateState((prev) => ({
      ...prev,
      routines: prev.routines.map((routine) => {
        if (routine.id !== routineId) return routine
        if (editingRoutineStepId) {
          return {
            ...routine,
            steps: routine.steps.map((existing) =>
              existing.id === editingRoutineStepId
                ? { ...step, order: existing.order }
                : existing,
            ),
          }
        }
        const maxOrder = routine.steps.reduce(
          (max, s) => Math.max(max, s.order),
          -1,
        )
        return {
          ...routine,
          steps: [...routine.steps, { ...step, order: maxOrder + 1 }],
        }
      }),
    }))
    setEditingRoutineStepId(null)
    setRoutineStepTitle('')
    setRoutineTaskSearch('')
    setRoutineStepMinutes('5')
    setRoutineStepSeconds('0')
    setToast(editingRoutineStepId ? 'Step updated' : 'Step added')
    return true
  }

  function openEditRoutineStep(step: RoutineStep) {
    setEditingRoutineId(null)
    setEditingRoutineStepId(step.id)
    setRoutineStepKind(step.kind)
    setRoutineTaskSearch('')
    if (step.kind === 'task') {
      setRoutineStepTaskId(step.taskId)
      setRoutineStepTitle('')
    } else {
      setRoutineStepTitle(step.title)
      setRoutineStepTaskId(
        state.tasks.find((task) => taskRepeats(task))?.id ?? '',
      )
    }
    const fields = durationToFields(step.durationSeconds)
    setRoutineStepMinutes(fields.minutes)
    setRoutineStepSeconds(fields.seconds)
    setAddOpen(true)
    setAddError('')
  }

  function deleteRoutineStep(routineId: string, stepId: string) {
    updateState((prev) => ({
      ...prev,
      routines: prev.routines.map((routine) => {
        if (routine.id !== routineId) return routine
        return {
          ...routine,
          steps: [...routine.steps]
            .filter((step) => step.id !== stepId)
            .sort((a, b) => a.order - b.order)
            .map((step, index) => ({ ...step, order: index })),
        }
      }),
    }))
    if (editingRoutineStepId === stepId) {
      setEditingRoutineStepId(null)
      setAddOpen(false)
    }
    setToast('Step deleted')
  }

  function startRoutine(routineId: string) {
    const routine = state.routines.find((r) => r.id === routineId)
    if (!routine) return
    const steps = sortedRoutineSteps(routine)
    if (steps.length === 0) {
      setToast('Add steps before starting')
      return
    }
    setAddOpen(false)
    setActiveRoutineId(routineId)
    const now = Date.now()
    const durationSeconds = steps[0]!.durationSeconds
    setRoutineNowMs(now)
    setActiveRoutineRun({
      routineId,
      stepIndex: 0,
      remainingSeconds: durationSeconds,
      stepEndsAtMs: stepDeadlineFromNow(durationSeconds, now),
      completedStepIds: [],
      skippedStepIds: [],
    })
  }

  function completeTaskFromRoutine(taskId: string, dateKey: string) {
    updateState((prev) => {
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      let changed = false
      const tasks = prev.tasks.map((task) => {
        if (task.id !== taskId) return task
        const occurrence = occurrenceForDate(task, dateKey)
        if (!occurrence) return task
        if (isOccurrenceSatisfied(task, occurrence)) return task
        changed = true
        const nextCompletions = { ...task.completions, [dateKey]: true }
        const isReminderTask = task.categoryIds.some((categoryId) =>
          prev.taskCategories.some(
            (category) =>
              category.id === categoryId && category.reminders === true,
          ),
        )
        if (!isReminderTask) {
          dollars += 1
          dollarLedger = appendLedgerEntry(dollarLedger, {
            dateKey,
            amount: 1,
            kind: 'earned',
            label: task.title,
          })
        }
        return { ...task, completions: nextCompletions }
      })
      if (!changed) return prev
      return { ...prev, tasks, dollars, dollarLedger }
    })
  }

  function finishRoutineIfComplete(
    run: ActiveRoutineRun,
    routine: Routine,
    completedStepIds: string[],
    skippedStepIds: string[],
  ) {
    const steps = sortedRoutineSteps(routine)
    const allHandled =
      completedStepIds.length + skippedStepIds.length >= steps.length
    if (!allHandled) return
    const allCompleted =
      skippedStepIds.length === 0 && completedStepIds.length === steps.length
    if (allCompleted && routine.completionReward > 0) {
      const today = toDateKey(startToday())
      updateState((prev) => ({
        ...prev,
        dollars: prev.dollars + routine.completionReward,
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: routine.completionReward,
          kind: 'earned',
          label: `${routine.name} · full routine`,
        }),
      }))
      setToast(`Routine complete · +$${routine.completionReward}`)
    } else if (allCompleted) {
      setToast('Routine complete')
    } else {
      setToast('Routine finished — skipped steps, no bonus')
    }
    setActiveRoutineRun({
      ...run,
      stepIndex: steps.length,
      remainingSeconds: 0,
      stepEndsAtMs: null,
      completedStepIds,
      skippedStepIds,
    })
  }

  function advanceRoutineStep(completed: boolean) {
    const run = activeRoutineRun
    if (!run) return
    const routine = state.routines.find((r) => r.id === run.routineId)
    if (!routine) {
      setActiveRoutineRun(null)
      return
    }
    const steps = sortedRoutineSteps(routine)
    const current = steps[run.stepIndex]
    if (!current) {
      setActiveRoutineRun(null)
      return
    }

    const completedStepIds = completed
      ? [...run.completedStepIds, current.id]
      : run.completedStepIds
    const skippedStepIds = completed
      ? run.skippedStepIds
      : [...run.skippedStepIds, current.id]

    if (completed && current.kind === 'task') {
      completeTaskFromRoutine(current.taskId, toDateKey(startToday()))
    }

    const nextIndex = run.stepIndex + 1
    if (nextIndex >= steps.length) {
      finishRoutineIfComplete(run, routine, completedStepIds, skippedStepIds)
      return
    }

    const now = Date.now()
    const nextDuration = steps[nextIndex]!.durationSeconds
    setRoutineNowMs(now)
    setActiveRoutineRun({
      routineId: run.routineId,
      stepIndex: nextIndex,
      remainingSeconds: nextDuration,
      stepEndsAtMs: stepDeadlineFromNow(nextDuration, now),
      completedStepIds,
      skippedStepIds,
    })
  }

  function exitRoutineRun() {
    setActiveRoutineRun(null)
  }

  function toggleGoalTask(goalId: string, taskId: string) {
    updateState((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => {
        if (goal.id !== goalId) return goal
        const has = goal.taskIds.includes(taskId)
        return {
          ...goal,
          taskIds: has
            ? goal.taskIds.filter((id) => id !== taskId)
            : [...goal.taskIds, taskId],
        }
      }),
    }))
  }

  function toggleGoalProject(goalId: string, projectId: string) {
    updateState((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => {
        if (goal.id !== goalId) return goal
        const has = goal.projectIds.includes(projectId)
        return {
          ...goal,
          projectIds: has
            ? goal.projectIds.filter((id) => id !== projectId)
            : [...goal.projectIds, projectId],
        }
      }),
    }))
  }

  function deleteProjectStep(projectId: string, stepId: string) {
    const today = toDateKey(startToday())
    updateState((prev) => {
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      const projects = prev.projects.map((project) => {
        if (project.id !== projectId) return project
        const removed = project.steps.find((s) => s.id === stepId)
        if (removed?.completed && removed.dollars > 0) {
          const clawback = Math.min(dollars, removed.dollars)
          dollars = Math.max(0, dollars - removed.dollars)
          if (clawback > 0) {
            dollarLedger = appendLedgerEntry(dollarLedger, {
              dateKey: today,
              amount: -clawback,
              kind: 'earned',
              label: `Removed · ${project.name}: ${removed.title}`,
            })
          }
        }
        return {
          ...project,
          steps: project.steps.filter((s) => s.id !== stepId),
        }
      })
      return { ...prev, projects, dollars, dollarLedger }
    })
    if (editingStepId === stepId) {
      setEditingStepId(null)
      setAddOpen(false)
      resetComposerFields()
    }
    setToast('Step deleted')
  }

  function toggleVacationMode() {
    updateState((prev) => {
      const next = { ...prev.vacationDays }
      if (next[viewKey]) delete next[viewKey]
      else next[viewKey] = true
      return { ...prev, vacationDays: next }
    })
  }

  function toggleMode(mode: Mode) {
    updateState((prev) => {
      const on = prev.activeModeIds.includes(mode.id)
      return {
        ...prev,
        activeModeIds: on
          ? prev.activeModeIds.filter((id) => id !== mode.id)
          : [...prev.activeModeIds, mode.id],
      }
    })
  }

  function isModeActive(mode: Mode): boolean {
    return state.activeModeIds.includes(mode.id)
  }

  function startModeEdit(id: string) {
    setEditingModeId(id)
  }

  function finishModeEdit(id: string, name: string) {
    renameMode(id, name)
    setEditingModeId((current) => (current === id ? null : current))
  }

  function cancelModeEdit() {
    setEditingModeId(null)
  }

  function liveRenameMode(id: string, name: string) {
    updateState((prev) => ({
      ...prev,
      modes: prev.modes.map((mode) =>
        mode.id === id ? { ...mode, name } : mode,
      ),
    }))
  }

  function addMode() {
    const name = newModeName.trim()
    if (!name) return
    if (
      state.modes.some((mode) => mode.name.toLowerCase() === name.toLowerCase())
    ) {
      setToast('Mode already exists')
      return
    }
    const maxOrder = state.modes.reduce((max, mode) => Math.max(max, mode.order), -1)
    const mode: Mode = {
      id: uid('mode'),
      name,
      icon: newModeIcon,
      order: maxOrder + 1,
    }
    updateState((prev) => ({
      ...prev,
      modes: [...prev.modes, mode],
    }))
    setNewModeName('')
    setNewModeIcon('star')
    setToast('Mode added')
  }

  function deleteMode(id: string) {
    updateState((prev) => ({
      ...prev,
      modes: prev.modes.filter((mode) => mode.id !== id),
      activeModeIds: prev.activeModeIds.filter((modeId) => modeId !== id),
      tasks: prev.tasks.map((task) => {
        if (!(id in (task.visibleInModes ?? {}))) return task
        const nextVisibility = { ...task.visibleInModes }
        delete nextVisibility[id]
        return { ...task, visibleInModes: nextVisibility }
      }),
    }))
    setEditingModeId((current) => (current === id ? null : current))
    setVisibleInModes((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setToast('Mode removed')
  }

  function renameMode(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const clash = state.modes.some(
      (mode) =>
        mode.id !== id && mode.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (clash) {
      setToast('Mode already exists')
      return
    }
    updateState((prev) => ({
      ...prev,
      modes: prev.modes.map((mode) =>
        mode.id === id ? { ...mode, name: trimmed } : mode,
      ),
    }))
  }

  function changeModeIcon(id: string, icon: ModeIconId) {
    updateState((prev) => ({
      ...prev,
      modes: prev.modes.map((mode) =>
        mode.id === id ? { ...mode, icon } : mode,
      ),
    }))
  }

  function beginModeDrag(modeId: string, clientY: number) {
    modeDragRef.current = {
      id: modeId,
      startY: clientY,
      orderSnapshot: sortedModes.map((mode) => mode.id),
    }
    setDraggingModeId(modeId)
  }

  function toggleComposerModeVisibility(modeId: string) {
    setVisibleInModes((prev) => ({
      ...prev,
      [modeId]: prev[modeId] === false,
    }))
  }

  function spendReward(reward: Reward) {
    if (state.dollars < reward.cost) {
      setToast(`Need $${reward.cost}`)
      return
    }
    setSpendConfirmReward(reward)
  }

  function confirmSpend(delivered: boolean) {
    const reward = spendConfirmReward
    if (!reward) return
    if (state.dollars < reward.cost) {
      setToast(`Need $${reward.cost}`)
      setSpendConfirmReward(null)
      return
    }
    const today = toDateKey(startToday())
    updateState((prev) => {
      const next: AppState = {
        ...prev,
        dollars: prev.dollars - reward.cost,
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: -reward.cost,
          kind: 'spent',
          label: reward.name,
        }),
      }
      if (!delivered) {
        const pending: PendingDelivery = {
          id: uid('delivery'),
          rewardId: reward.id,
          rewardName: reward.name,
          cost: reward.cost,
          createdAt: Date.now(),
        }
        next.pendingDeliveries = [...prev.pendingDeliveries, pending]
      }
      return next
    })
    setSpendConfirmReward(null)
    setToast(
      delivered
        ? `Spent $${reward.cost} on ${reward.name}`
        : `${reward.name} is in delivery`,
    )
  }

  function markDeliveryArrived(deliveryId: string) {
    updateState((prev) => ({
      ...prev,
      pendingDeliveries: prev.pendingDeliveries.filter((d) => d.id !== deliveryId),
    }))
    setToast('Marked delivered')
  }

  function markDeliveryReturned(deliveryId: string) {
    const today = toDateKey(startToday())
    updateState((prev) => {
      const delivery = prev.pendingDeliveries.find((d) => d.id === deliveryId)
      if (!delivery) return prev
      return {
        ...prev,
        dollars: prev.dollars + delivery.cost,
        pendingDeliveries: prev.pendingDeliveries.filter(
          (d) => d.id !== deliveryId,
        ),
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: delivery.cost,
          kind: 'adjusted',
          label: `Returned · ${delivery.rewardName}`,
        }),
      }
    })
    setToast('Returned — $ back')
  }

  function openBalanceEdit() {
    setBalanceDraft(String(state.dollars))
    setBalanceEditOpen(true)
    setLedgerOpen(false)
  }

  function saveBalanceEdit() {
    const next = Number.parseInt(balanceDraft, 10)
    if (!Number.isFinite(next) || next < 0) {
      setToast('Balance must be 0 or more')
      return
    }
    const today = toDateKey(startToday())
    updateState((prev) => {
      const delta = next - prev.dollars
      if (delta === 0) return prev
      return {
        ...prev,
        dollars: next,
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: delta,
          kind: 'adjusted',
          label: 'Balance edit',
        }),
      }
    })
    setBalanceEditOpen(false)
    setToast(`Balance set to $${next}`)
  }

  function saveMonthlyIncome() {
    const parsed = Number(monthlyIncomeDraft)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setToast('Income must be 0 or more')
      return
    }
    const rounded = Math.round(parsed * 100) / 100
    updateState((prev) => ({ ...prev, monthlyIncome: rounded }))
    setToast('Monthly income updated')
  }

  function addSpendingEntry() {
    const amount = Number(newSpendingAmount)
    const streamId = newSpendingStreamId.trim()
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast('Enter a valid spending amount')
      return
    }
    if (!streamId) {
      setToast('Choose a budgeting stream')
      return
    }
    if (!state.budgetingStreams.some((stream) => stream.id === streamId)) {
      setToast('Choose a budgeting stream')
      return
    }
    const today = toDateKey(startToday())
    const roundedAmount = Math.round(amount * 100) / 100
    updateState((prev) => {
      const nextEntry: SpendingEntry = {
        id: editingSpendingId ?? uid('spending'),
        at: Date.now(),
        dateKey: today,
        amount: roundedAmount,
        streamId,
        note: newSpendingNote.trim(),
        impactsVirtualDollars: newSpendingAffectsVirtual,
      }
      let realSpending: SpendingEntry[]
      if (editingSpendingId) {
        realSpending = prev.realSpending.map((entry) =>
          entry.id === editingSpendingId ? nextEntry : entry,
        )
      } else {
        realSpending = [nextEntry, ...prev.realSpending]
      }
      const old = editingSpendingId
        ? prev.realSpending.find((entry) => entry.id === editingSpendingId)
        : null
      const oldImpact = old?.impactsVirtualDollars ? old.amount : 0
      const newImpact = nextEntry.impactsVirtualDollars ? roundedAmount : 0
      const virtualDelta = newImpact - oldImpact
      if (virtualDelta === 0) return { ...prev, realSpending }
      return {
        ...prev,
        realSpending,
        dollars:
          virtualDelta > 0
            ? Math.max(0, prev.dollars - virtualDelta)
            : prev.dollars + Math.abs(virtualDelta),
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: -virtualDelta,
          kind: virtualDelta > 0 ? 'spent' : 'adjusted',
          label:
            virtualDelta > 0
              ? `Real spend${newSpendingNote.trim() ? ` · ${newSpendingNote.trim()}` : ''}`
              : 'Real spend adjustment',
        }),
      }
    })
    setEditingSpendingId(null)
    setNewSpendingAmount('')
    setNewSpendingStreamId('')
    setNewSpendingNote('')
    setNewSpendingAffectsVirtual(false)
    setAddOpen(false)
    setToast(editingSpendingId ? 'Spending updated' : 'Spending added')
  }

  function openEditSpendingEntry(entry: SpendingEntry) {
    setEditingSpendingId(entry.id)
    setNewSpendingAmount(String(entry.amount))
    setNewSpendingStreamId(entry.streamId)
    setNewSpendingNote(entry.note)
    setNewSpendingAffectsVirtual(entry.impactsVirtualDollars)
    setMainView('budgeting')
    setAddOpen(true)
  }

  function deleteSpendingEntry(id: string) {
    updateState((prev) => {
      const existing = prev.realSpending.find((entry) => entry.id === id)
      if (!existing) return prev
      const realSpending = prev.realSpending.filter((entry) => entry.id !== id)
      if (!existing.impactsVirtualDollars) return { ...prev, realSpending }
      const today = toDateKey(startToday())
      return {
        ...prev,
        realSpending,
        dollars: prev.dollars + existing.amount,
        dollarLedger: appendLedgerEntry(prev.dollarLedger, {
          dateKey: today,
          amount: existing.amount,
          kind: 'adjusted',
          label: 'Removed real spend',
        }),
      }
    })
    if (editingSpendingId === id) {
      setEditingSpendingId(null)
      setAddOpen(false)
      setNewSpendingAmount('')
      setNewSpendingStreamId('')
      setNewSpendingNote('')
      setNewSpendingAffectsVirtual(false)
    }
    setToast('Spending deleted')
  }

  function addReward() {
    const name = newRewardName.trim()
    const cost = Number.parseInt(newRewardCost, 10)
    if (!name) {
      setToast('Name your reward')
      return
    }
    if (!Number.isFinite(cost) || cost < 1) {
      setToast('Cost must be at least $1')
      return
    }
    if (editingRewardId) {
      updateState((prev) => ({
        ...prev,
        rewards: prev.rewards.map((reward) =>
          reward.id === editingRewardId ? { ...reward, name, cost } : reward,
        ),
      }))
      setToast('Reward updated')
    } else {
      const reward: Reward = { id: uid('reward'), name, cost }
      updateState((prev) => ({ ...prev, rewards: [...prev.rewards, reward] }))
      setToast('Reward added')
    }
    setEditingRewardId(null)
    setNewRewardName('')
    setNewRewardCost('5')
  }

  function openEditReward(reward: Reward) {
    setEditingRewardId(reward.id)
    setNewRewardName(reward.name)
    setNewRewardCost(String(reward.cost))
    setAddOpen(true)
    setAddError('')
  }

  function deleteReward(id: string) {
    updateState((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((r) => r.id !== id),
    }))
    if (editingRewardId === id) {
      setEditingRewardId(null)
      setAddOpen(false)
      resetComposerFields()
    }
    if (spendConfirmReward?.id === id) setSpendConfirmReward(null)
    setToast('Reward deleted')
  }

  function addTimer() {
    const title = newTimerTitle.trim()
    const minutes = Number.parseInt(newTimerMinutes, 10)
    if (!title) {
      setToast('Name your timer')
      return
    }
    if (!Number.isFinite(minutes) || minutes < 1) {
      setToast('Minutes must be at least 1')
      return
    }
    if (editingTimerId) {
      updateState((prev) => ({
        ...prev,
        timers: prev.timers.map((timer) =>
          timer.id === editingTimerId
            ? { ...timer, title, minutesForDollar: minutes }
            : timer,
        ),
      }))
      setToast('Timer updated')
    } else {
      const maxOrder = state.timers.reduce((max, t) => Math.max(max, t.order), -1)
      const timer: FocusTimer = {
        id: uid('timer'),
        title,
        minutesForDollar: minutes,
        order: maxOrder + 1,
        elapsedSeconds: 0,
      }
      updateState((prev) => ({ ...prev, timers: [...prev.timers, timer] }))
      setToast('Timer added')
    }
    setEditingTimerId(null)
    setNewTimerTitle('')
    setNewTimerMinutes('20')
  }

  function openEditTimer(timer: FocusTimer) {
    setEditingTimerId(timer.id)
    setNewTimerTitle(timer.title)
    setNewTimerMinutes(String(timer.minutesForDollar))
    setAddOpen(true)
    setAddError('')
  }

  function deleteTimer(id: string) {
    updateState((prev) => ({
      ...prev,
      timers: prev.timers.filter((t) => t.id !== id),
    }))
    if (runningTimerId === id) setRunningTimerId(null)
    if (activeTimerId === id) setActiveTimerId(null)
    if (editingTimerId === id) {
      setEditingTimerId(null)
      setAddOpen(false)
      resetComposerFields()
    }
    setToast('Timer deleted')
  }

  function toggleTimerRunning(timerId: string) {
    setRunningTimerId((current) => (current === timerId ? null : timerId))
  }

  function resetActiveTimer(timerId: string) {
    setRunningTimerId((current) => (current === timerId ? null : current))
    updateState((prev) => ({
      ...prev,
      timers: prev.timers.map((timer) =>
        timer.id === timerId ? { ...timer, elapsedSeconds: 0 } : timer,
      ),
    }))
  }

  function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    if (
      state.taskCategories.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setToast('Category already exists')
      return
    }
    const cat: Category = { id: uid('cat'), name }
    updateState((prev) => ({
      ...prev,
      taskCategories: [...prev.taskCategories, cat],
    }))
    setNewCategory('')
    setToast('Category added')
  }

  function deleteCategory(id: string) {
    if (state.taskCategories.length <= 1) {
      setToast('Keep at least one category')
      return
    }
    const fallback = state.taskCategories.find((c) => c.id !== id)?.id
    if (!fallback) return
    updateState((prev) => ({
      ...prev,
      taskCategories: prev.taskCategories.filter((c) => c.id !== id),
      tasks: prev.tasks.map((t) => {
        if (!t.categoryIds.includes(id)) return t
        const nextIds = t.categoryIds.filter((cid) => cid !== id)
        return {
          ...t,
          categoryIds: nextIds.length > 0 ? nextIds : [fallback],
        }
      }),
    }))
    setCategoryIds((prev) => {
      const next = prev.filter((cid) => cid !== id)
      return next.length > 0 ? next : prev.includes(id) ? [fallback] : next
    })
    setToast('Category removed')
  }

  function renameCategory(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const clash = state.taskCategories.some(
      (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (clash) {
      setToast('Category already exists')
      return
    }
    updateState((prev) => ({
      ...prev,
      taskCategories: prev.taskCategories.map((c) =>
        c.id === id ? { ...c, name: trimmed } : c,
      ),
    }))
  }

  function toggleCategoryAttention(id: string) {
    updateState((prev) => ({
      ...prev,
      taskCategories: prev.taskCategories.map((c) => {
        if (c.id !== id) return c
        if (c.attention) {
          const { attention: _removed, ...rest } = c
          return rest
        }
        const { reminders: _reminders, ...rest } = c
        return { ...rest, attention: true }
      }),
    }))
  }

  function toggleCategoryReminders(id: string) {
    updateState((prev) => ({
      ...prev,
      taskCategories: prev.taskCategories.map((c) => {
        if (c.id !== id) return c
        if (c.reminders) {
          const { reminders: _removed, ...rest } = c
          return rest
        }
        const { attention: _attention, ...rest } = c
        return { ...rest, reminders: true }
      }),
    }))
  }

  function beginRewardDrag(rewardId: string, clientY: number) {
    rewardDragRef.current = {
      id: rewardId,
      startY: clientY,
      orderSnapshot: state.rewards.map((r) => r.id),
    }
    setDraggingRewardId(rewardId)
  }

  function beginTimerDrag(timerId: string, clientY: number) {
    timerDragRef.current = {
      id: timerId,
      startY: clientY,
      orderSnapshot: sortedTimers.map((t) => t.id),
    }
    setDraggingTimerId(timerId)
  }

  function beginStepDrag(
    projectId: string,
    stepId: string,
    clientY: number,
  ) {
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) return
    stepDragRef.current = {
      projectId,
      id: stepId,
      startY: clientY,
      orderSnapshot: [...project.steps]
        .sort((a, b) => a.order - b.order)
        .map((s) => s.id),
    }
    setDraggingStepId(stepId)
  }

  function beginProjectDrag(projectId: string, clientY: number) {
    projectDragRef.current = {
      id: projectId,
      startY: clientY,
      orderSnapshot: sortedProjects.map((p) => p.id),
    }
    setDraggingProjectId(projectId)
  }

  function beginGoalDrag(goalId: string, clientY: number) {
    goalDragRef.current = {
      id: goalId,
      startY: clientY,
      orderSnapshot: sortedGoals.map((g) => g.id),
    }
    setDraggingGoalId(goalId)
  }

  function beginRoutineDrag(routineId: string, clientY: number) {
    routineDragRef.current = {
      id: routineId,
      startY: clientY,
      orderSnapshot: sortedRoutines.map((r) => r.id),
    }
    setDraggingRoutineId(routineId)
  }

  function beginRoutineStepDrag(
    routineId: string,
    stepId: string,
    clientY: number,
  ) {
    const routine = state.routines.find((r) => r.id === routineId)
    if (!routine) return
    routineStepDragRef.current = {
      routineId,
      id: stepId,
      startY: clientY,
      orderSnapshot: sortedRoutineSteps(routine).map((s) => s.id),
    }
    setDraggingRoutineStepId(stepId)
  }

  function beginCategoryDrag(categoryIdToDrag: string, clientY: number) {
    categoryDragRef.current = {
      id: categoryIdToDrag,
      startY: clientY,
      orderSnapshot: state.taskCategories.map((c) => c.id),
    }
    setDraggingCategoryId(categoryIdToDrag)
  }

  function startStreamEdit(id: string) {
    setEditingStreamId(id)
  }

  function finishStreamEdit(id: string, name: string) {
    renameBudgetingStream(id, name)
    setEditingStreamId((current) => (current === id ? null : current))
  }

  function cancelStreamEdit() {
    setEditingStreamId(null)
  }

  function liveRenameBudgetingStream(id: string, name: string) {
    updateState((prev) => ({
      ...prev,
      budgetingStreams: prev.budgetingStreams.map((stream) =>
        stream.id === id ? { ...stream, name } : stream,
      ),
    }))
  }

  function addBudgetingStream() {
    const name = newStreamName.trim()
    if (!name) return
    if (
      state.budgetingStreams.some(
        (stream) => stream.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setToast('Stream already exists')
      return
    }
    const stream: BudgetingStream = { id: uid('stream'), name }
    updateState((prev) => ({
      ...prev,
      budgetingStreams: [...prev.budgetingStreams, stream],
    }))
    setNewStreamName('')
    setToast('Budgeting stream added')
  }

  function deleteBudgetingStream(id: string) {
    if (state.budgetingStreams.length <= 1) {
      setToast('Keep at least one budgeting stream')
      return
    }
    const fallback = state.budgetingStreams.find((stream) => stream.id !== id)?.id
    if (!fallback) return
    updateState((prev) => ({
      ...prev,
      budgetingStreams: prev.budgetingStreams.filter((stream) => stream.id !== id),
      realSpending: prev.realSpending.map((entry) =>
        entry.streamId === id ? { ...entry, streamId: fallback } : entry,
      ),
    }))
    setNewSpendingStreamId((current) => (current === id ? '' : current))
    if (editingStreamId === id) setEditingStreamId(null)
    if (activeSpendingStreamId === id) setActiveSpendingStreamId(null)
    setToast('Budgeting stream removed')
  }

  function renameBudgetingStream(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const clash = state.budgetingStreams.some(
      (stream) =>
        stream.id !== id && stream.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (clash) {
      setToast('Stream already exists')
      return
    }
    updateState((prev) => ({
      ...prev,
      budgetingStreams: prev.budgetingStreams.map((stream) =>
        stream.id === id ? { ...stream, name: trimmed } : stream,
      ),
    }))
  }

  function beginStreamDrag(streamIdToDrag: string, clientY: number) {
    streamDragRef.current = {
      id: streamIdToDrag,
      startY: clientY,
      orderSnapshot: state.budgetingStreams.map((stream) => stream.id),
    }
    setDraggingStreamId(streamIdToDrag)
  }

  function deferTaskToNextDay(taskId: string) {
    if (isCalendarTask(taskId)) return
    const nextKey = toDateKey(addDays(parseDateKey(viewKey), 1))
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task
        if (isCompletedForDateView(task, viewKey)) return task
        let next = withDeferredDate(task, viewKey)
        // One-shot tasks: advance the scheduled day to match the move.
        if (next.repetition === 'none' && next.startDate <= viewKey) {
          next = { ...next, startDate: nextKey }
        }
        return next
      }),
    }))
    setTaskSwipe(null)
    setToast('Moved to next day')
  }

  function onTaskSwipePointerDown(
    taskId: string,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (mainView !== 'tasks' || addOpen || dragRef.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (
      event.target instanceof Element &&
      event.target.closest('.check, .edit-btn, .drag-handle, .task-actions')
    ) {
      return
    }
    taskSwipeRef.current = {
      id: taskId,
      x: event.clientX,
      y: event.clientY,
      locked: null,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onTaskSwipePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = taskSwipeRef.current
    if (!start || start.pointerId !== event.pointerId || dragRef.current) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y'
      if (start.locked === 'x') {
        // Cancel day-level swipe while deferring a task.
        swipeRef.current = null
        setSwipeOffset(0)
      }
    }

    if (start.locked !== 'x') return
    event.preventDefault()
    event.stopPropagation()
    // Swipe right only — move to next day.
    const offset = Math.max(0, Math.min(120, dx))
    setTaskSwipe({ id: start.id, offset })
  }

  function onTaskSwipePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = taskSwipeRef.current
    taskSwipeRef.current = null
    if (!start || start.pointerId !== event.pointerId) {
      setTaskSwipe(null)
      return
    }
    if (start.locked !== 'x') {
      setTaskSwipe(null)
      return
    }

    const dx = event.clientX - start.x
    const threshold = 64
    if (dx >= threshold) {
      suppressTaskClickRef.current = true
      deferTaskToNextDay(start.id)
    } else {
      setTaskSwipe(null)
    }
  }

  function goToDay(delta: number) {
    if (delta === 0) return
    setDayAnim(delta > 0 ? 'from-right' : 'from-left')
    setViewDate((d) => addDays(d, delta))
    setSwipeOffset(0)
  }

  function jumpToDay(dateKey: string) {
    const trimmed = dateKey.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || trimmed === viewKey) return
    setDayAnim(trimmed > viewKey ? 'from-right' : 'from-left')
    setViewDate(parseDateKey(trimmed))
    setSwipeOffset(0)
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest(
        'button, a, input, select, textarea, label, .drag-handle, .add-panel, .composer',
      ),
    )
  }

  function onDayPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (mainView !== 'tasks' || addOpen || dragRef.current) {
      return
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (isInteractiveTarget(event.target)) return
    swipeRef.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      locked: null,
      pointerId: event.pointerId,
    }
    setDayAnim('none')
  }

  function onDayPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeRef.current
    if (!start?.active || start.pointerId !== event.pointerId || dragRef.current) {
      return
    }

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y'
      if (start.locked === 'x') {
        dayPaneRef.current?.setPointerCapture?.(event.pointerId)
      }
    }

    if (start.locked !== 'x') return
    event.preventDefault()
    const dampened = Math.max(-140, Math.min(140, dx * 0.85))
    setSwipeOffset(dampened)
  }

  function finishDaySwipe(clientX: number, pointerId: number) {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start?.active || start.pointerId !== pointerId || dragRef.current) {
      setSwipeOffset(0)
      return
    }
    if (start.locked !== 'x') {
      setSwipeOffset(0)
      return
    }

    const dx = clientX - start.x
    const threshold = 56
    if (dx <= -threshold) goToDay(1)
    else if (dx >= threshold) goToDay(-1)
    else setSwipeOffset(0)
  }

  function beginDrag(taskId: string, clientY: number, groupCategoryId: string) {
    const task = dayTasks.find((t) => t.id === taskId)
    if (!task) return
    const known = new Set(state.taskCategories.map((c) => c.id))
    dragRef.current = {
      id: taskId,
      startY: clientY,
      orderSnapshot: dayTasks
        .filter((t) => {
          const done = isCompletedForDateView(t, viewKey)
          if (groupCategoryId === COMPLETED_GROUP_ID) return done
          if (done) return false
          if (groupCategoryId === 'uncategorized') {
            return (
              t.categoryIds.length === 0 ||
              t.categoryIds.every((id) => !known.has(id))
            )
          }
          return t.categoryIds.includes(groupCategoryId)
        })
        .map((t) => t.id),
    }
    setDraggingId(taskId)
  }

  useEffect(() => {
    function commit(updater: (prev: AppState) => AppState) {
      setState((prev) => {
        const next = updater(prev)
        if (next === prev) return prev
        return { ...next, updatedAt: Date.now() }
      })
    }

    function reorderSnapshot(
      drag: { id: string; startY: number; orderSnapshot: string[] },
      clientY: number,
      rowHeight: number,
    ): string[] | null {
      const delta = clientY - drag.startY
      const from = drag.orderSnapshot.indexOf(drag.id)
      if (from < 0) return null
      let to = from + Math.round(delta / rowHeight)
      to = Math.max(0, Math.min(drag.orderSnapshot.length - 1, to))
      if (to === from) return null
      const nextOrder = [...drag.orderSnapshot]
      const [moved] = nextOrder.splice(from, 1)
      nextOrder.splice(to, 0, moved)
      drag.orderSnapshot = nextOrder
      drag.startY = clientY
      return nextOrder
    }

    function onMove(event: PointerEvent) {
      const taskDrag = dragRef.current
      if (taskDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(taskDrag, event.clientY, 52)
        if (!nextOrder) return
        commit((prev) => {
          const orderMap = new Map(nextOrder.map((id, index) => [id, index]))
          return {
            ...prev,
            tasks: prev.tasks.map((task) =>
              orderMap.has(task.id)
                ? { ...task, order: orderMap.get(task.id)! }
                : task,
            ),
          }
        })
        return
      }

      const rewardDrag = rewardDragRef.current
      if (rewardDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(rewardDrag, event.clientY, 88)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.rewards.map((r) => [r.id, r]))
          const rewards = nextOrder
            .map((id) => byId.get(id))
            .filter((r): r is Reward => Boolean(r))
          return { ...prev, rewards }
        })
        return
      }

      const timerDrag = timerDragRef.current
      if (timerDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(timerDrag, event.clientY, 88)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.timers.map((t) => [t.id, t]))
          const timers = nextOrder
            .map((id, index) => {
              const timer = byId.get(id)
              return timer ? { ...timer, order: index } : null
            })
            .filter((t): t is FocusTimer => Boolean(t))
          return { ...prev, timers }
        })
        return
      }

      const stepDrag = stepDragRef.current
      if (stepDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(stepDrag, event.clientY, 64)
        if (!nextOrder) return
        commit((prev) => ({
          ...prev,
          projects: prev.projects.map((project) => {
            if (project.id !== stepDrag.projectId) return project
            const byId = new Map(project.steps.map((s) => [s.id, s]))
            const steps = nextOrder
              .map((id, index) => {
                const step = byId.get(id)
                return step ? { ...step, order: index } : null
              })
              .filter((s): s is ProjectStep => Boolean(s))
            return { ...project, steps }
          }),
        }))
        return
      }

      const projectDrag = projectDragRef.current
      if (projectDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(projectDrag, event.clientY, 72)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.projects.map((p) => [p.id, p]))
          const projects = nextOrder
            .map((id, index) => {
              const project = byId.get(id)
              return project ? { ...project, order: index } : null
            })
            .filter((p): p is Project => Boolean(p))
          return { ...prev, projects }
        })
        return
      }

      const goalDrag = goalDragRef.current
      if (goalDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(goalDrag, event.clientY, 88)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.goals.map((g) => [g.id, g]))
          const goals = nextOrder
            .map((id, index) => {
              const goal = byId.get(id)
              return goal ? { ...goal, order: index } : null
            })
            .filter((g): g is Goal => Boolean(g))
          return { ...prev, goals }
        })
        return
      }

      const routineDrag = routineDragRef.current
      if (routineDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(routineDrag, event.clientY, 72)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.routines.map((r) => [r.id, r]))
          const routines = nextOrder
            .map((id, index) => {
              const routine = byId.get(id)
              return routine ? { ...routine, order: index } : null
            })
            .filter((r): r is Routine => Boolean(r))
          return { ...prev, routines }
        })
        return
      }

      const routineStepDrag = routineStepDragRef.current
      if (routineStepDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(routineStepDrag, event.clientY, 64)
        if (!nextOrder) return
        commit((prev) => ({
          ...prev,
          routines: prev.routines.map((routine) => {
            if (routine.id !== routineStepDrag.routineId) return routine
            const byId = new Map(routine.steps.map((s) => [s.id, s]))
            const steps = nextOrder
              .map((id, index) => {
                const step = byId.get(id)
                return step ? { ...step, order: index } : null
              })
              .filter((s): s is RoutineStep => Boolean(s))
            return { ...routine, steps }
          }),
        }))
        return
      }

      const categoryDrag = categoryDragRef.current
      if (categoryDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(categoryDrag, event.clientY, 64)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.taskCategories.map((c) => [c.id, c]))
          const taskCategories = nextOrder
            .map((id) => byId.get(id))
            .filter((c): c is Category => Boolean(c))
          return { ...prev, taskCategories }
        })
        return
      }

      const streamDrag = streamDragRef.current
      if (streamDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(streamDrag, event.clientY, 64)
        if (!nextOrder) return
        commit((prev) => {
          const byId = new Map(prev.budgetingStreams.map((s) => [s.id, s]))
          const budgetingStreams = nextOrder
            .map((id) => byId.get(id))
            .filter((s): s is BudgetingStream => Boolean(s))
          return { ...prev, budgetingStreams }
        })
        return
      }

      const modeDrag = modeDragRef.current
      if (!modeDrag) return
      event.preventDefault()
      const nextOrder = reorderSnapshot(modeDrag, event.clientY, 72)
      if (!nextOrder) return
      commit((prev) => {
        const byId = new Map(prev.modes.map((m) => [m.id, m]))
        const modes = nextOrder
          .map((id, index) => {
            const mode = byId.get(id)
            return mode ? { ...mode, order: index } : null
          })
          .filter((m): m is Mode => Boolean(m))
        return { ...prev, modes }
      })
    }
    function onUp() {
      if (dragRef.current) {
        dragRef.current = null
        setDraggingId(null)
      }
      if (rewardDragRef.current) {
        rewardDragRef.current = null
        setDraggingRewardId(null)
      }
      if (timerDragRef.current) {
        timerDragRef.current = null
        setDraggingTimerId(null)
      }
      if (stepDragRef.current) {
        stepDragRef.current = null
        setDraggingStepId(null)
      }
      if (projectDragRef.current) {
        projectDragRef.current = null
        setDraggingProjectId(null)
      }
      if (goalDragRef.current) {
        goalDragRef.current = null
        setDraggingGoalId(null)
      }
      if (routineDragRef.current) {
        routineDragRef.current = null
        setDraggingRoutineId(null)
      }
      if (routineStepDragRef.current) {
        routineStepDragRef.current = null
        setDraggingRoutineStepId(null)
      }
      if (categoryDragRef.current) {
        categoryDragRef.current = null
        setDraggingCategoryId(null)
      }
      if (streamDragRef.current) {
        streamDragRef.current = null
        setDraggingStreamId(null)
      }
      if (modeDragRef.current) {
        modeDragRef.current = null
        setDraggingModeId(null)
      }
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div className={`app${vacationOn ? ' vacation-day' : ''}`}>
      <header className="top-bar">
        {mainView === 'tasks' ? (
          <button
            type="button"
            className="stat-chip"
            onClick={() =>
              updateState((prev) => ({
                ...prev,
                showPercent: !prev.showPercent,
              }))
            }
            aria-label={
              state.showPercent
                ? 'Show completed and remaining counts'
                : 'Show percent complete'
            }
          >
            {state.showPercent
              ? `${percent}% complete`
              : `${completedCount} done · ${remainingCount} left`}
          </button>
        ) : mainView === 'projects' ? (
          <span className="stat-chip stat-chip-static">
            {sortedProjects.length === 1
              ? '1 project on the go'
              : `${sortedProjects.length} projects on the go`}
          </span>
        ) : mainView === 'goals' ? (
          <span className="stat-chip stat-chip-static">
            {sortedGoals.length === 1
              ? '1 goal on the go'
              : `${sortedGoals.length} goals on the go`}
          </span>
        ) : mainView === 'routines' ? (
          <span className="stat-chip stat-chip-static">
            {activeRoutineRun
              ? 'Routine running'
              : sortedRoutines.length === 1
                ? '1 routine ready'
                : `${sortedRoutines.length} routines ready`}
          </span>
        ) : (
          <span className="stat-chip-spacer" aria-hidden="true" />
        )}
        <h1 className="brand">Kraft Life</h1>
        {state.navVisibility.rewards !== false ? (
          <button
            type="button"
            className="dollar-chip"
            aria-label={`${state.dollars} dollars — open rewards`}
            onClick={() => goToView('rewards')}
          >
            ${state.dollars}
          </button>
        ) : (
          <span className="dollar-chip dollar-chip-static" aria-label={`${state.dollars} dollars`}>
            ${state.dollars}
          </span>
        )}
      </header>

      {mainView === 'tasks' && (
        <section
          key={viewKey}
          ref={dayPaneRef}
          className={`day-pane${dayAnim !== 'none' ? ` day-pane-${dayAnim}` : ''}${
            swipeOffset !== 0 ? ' day-pane-dragging' : ''
          }`}
          aria-label="Tasks for selected day"
          onPointerDown={onDayPointerDown}
          onPointerMove={onDayPointerMove}
          onPointerUp={(e) => finishDaySwipe(e.clientX, e.pointerId)}
          onPointerCancel={(e) => {
            if (swipeRef.current?.pointerId === e.pointerId) {
              swipeRef.current = null
              setSwipeOffset(0)
            }
          }}
          style={
            swipeOffset !== 0
              ? { transform: `translateX(${swipeOffset}px)` }
              : undefined
          }
        >
          <div className="day-header">
            <div className="day-nav">
              <button
                type="button"
                className="day-nav-btn"
                aria-label="Previous day"
                onClick={() => goToDay(-1)}
              >
                ‹
              </button>
              <div className="day-picker">
                <span className="day-label day-label-display" aria-hidden="true">
                  {formatDayHeading(viewDate, todayKey)}
                </span>
                <input
                  type="date"
                  className="day-picker-input"
                  value={viewKey}
                  onChange={(e) => jumpToDay(e.target.value)}
                  aria-label={`Pick a day, currently ${formatDayHeading(viewDate, todayKey)}`}
                />
              </div>
              <button
                type="button"
                className="day-nav-btn"
                aria-label="Next day"
                onClick={() => goToDay(1)}
              >
                ›
              </button>
            </div>
            <div className="mode-btns mode-btns-row">
              <button
                type="button"
                className={`plane-btn${vacationOn ? ' active' : ''}`}
                aria-label={
                  vacationOn
                    ? 'Turn off vacation mode'
                    : 'Turn on vacation mode'
                }
                aria-pressed={vacationOn}
                onClick={toggleVacationMode}
              >
                <ModeIcon icon="plane" />
              </button>
              {sortedModes.map((mode) => {
                const active = isModeActive(mode)
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`plane-btn${active ? ' active' : ''}`}
                    aria-label={
                      active
                        ? `Turn off ${mode.name} mode`
                        : `Turn on ${mode.name} mode`
                    }
                    aria-pressed={active}
                    onClick={() => toggleMode(mode)}
                  >
                    <ModeIcon icon={mode.icon} />
                  </button>
                )
              })}
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {vacationOn ? <p className="vacation-banner">Vacation mode</p> : null}
          {activeFilterModes.map((mode) => (
            <p key={mode.id} className="work-banner">
              {mode.name} mode
            </p>
          ))}

          {hasDayContent ? (
            <div className="task-groups">
              {groupedDayView.map((group, groupIndex) => {
                const collapsed = collapsedTaskCategoryIds.includes(group.id)
                const attention = group.attention === true
                const reminders = group.reminders === true
                const isCalendar = group.id === CALENDAR_GROUP_ID
                const yellowHeading = isCalendar || reminders
                return (
                  <section
                    className={`task-group${collapsed ? ' collapsed' : ''}${
                      attention ? ' attention' : ''
                    }${yellowHeading ? ' calendar' : ''}`}
                    key={group.id}
                    aria-label={group.name}
                  >
                    {groupIndex > 0 ? (
                      <div className="category-divider" aria-hidden="true" />
                    ) : null}
                    <button
                      type="button"
                      className="category-heading-toggle"
                      aria-expanded={!collapsed}
                      onClick={() => toggleTaskCategoryCollapsed(group.id)}
                    >
                      <h2
                        className={`category-heading${
                          attention ? ' attention' : ''
                        }${yellowHeading ? ' calendar' : ''}`}
                      >
                        {group.name}
                      </h2>
                      <span className="category-heading-meta">
                        {collapsed
                          ? group.id === COMPLETED_GROUP_ID
                            ? `${group.tasks.length} done`
                            : `${group.tasks.length} task${
                                group.tasks.length === 1 ? '' : 's'
                              }`
                          : null}
                        <ChevronIcon open={!collapsed} />
                      </span>
                    </button>
                    {collapsed ? null : (
                      <ul className="task-list">
                        {group.tasks.map((task) => {
                          const calendarTask = isCalendarTask(task.id)
                          const done = calendarTask
                            ? isCalendarEventCleared(
                                state.clearedCalendarEvents,
                                viewKey,
                                calendarEventIdFromTaskId(task.id),
                              )
                            : isCompletedForDateView(task, viewKey)
                          const showAllTimeCount =
                            !calendarTask && task.repetition !== 'none'
                          const allTimeCount = showAllTimeCount
                            ? allTimeCompletionCount(task)
                            : 0
                          const canDefer = !calendarTask && !done
                          const swipePx =
                            taskSwipe?.id === task.id ? taskSwipe.offset : 0
                          return (
                            <li
                              key={task.id}
                              className={`task-swipe-wrap${
                                canDefer ? ' deferrable' : ''
                              }`}
                            >
                              {canDefer ? (
                                <div
                                  className="task-defer-underlay"
                                  aria-hidden="true"
                                >
                                  Next day
                                </div>
                              ) : null}
                              <div
                                className={`task-item compact${
                                  done ? ' completed' : ''
                                }${calendarTask ? ' calendar-task' : ''}${
                                  draggingId === task.id ? ' dragging' : ''
                                }${vacationOn ? ' vacation' : ''}${
                                  swipePx > 0 ? ' swiping' : ''
                                }`}
                                style={
                                  swipePx > 0
                                    ? { transform: `translateX(${swipePx}px)` }
                                    : undefined
                                }
                                onPointerDown={
                                  canDefer
                                    ? (event) =>
                                        onTaskSwipePointerDown(task.id, event)
                                    : undefined
                                }
                                onPointerMove={
                                  canDefer ? onTaskSwipePointerMove : undefined
                                }
                                onPointerUp={
                                  canDefer ? onTaskSwipePointerUp : undefined
                                }
                                onPointerCancel={
                                  canDefer ? onTaskSwipePointerUp : undefined
                                }
                              >
                                <button
                                  type="button"
                                  className="check"
                                  aria-label={
                                    done ? 'Mark incomplete' : 'Mark complete'
                                  }
                                  onClick={() => toggleComplete(task.id)}
                                >
                                  <CheckIcon />
                                </button>
                                {calendarTask ? (
                                  <div className="task-main-btn calendar-task-main">
                                    <p className="task-title">{task.title}</p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="task-main-btn"
                                    aria-label={`Notes for ${task.title}`}
                                    onClick={() => {
                                      if (suppressTaskClickRef.current) {
                                        suppressTaskClickRef.current = false
                                        return
                                      }
                                      openTaskNotes(task)
                                    }}
                                  >
                                    <p className="task-title">{task.title}</p>
                                    <TaskDescriptionPreview
                                      text={task.description ?? ''}
                                    />
                                    {showAllTimeCount ? (
                                      <div className="badges">
                                        <span
                                          className="badge"
                                          aria-label={`Alltime count: ${allTimeCount}`}
                                        >
                                          Alltime count: {allTimeCount}
                                        </span>
                                      </div>
                                    ) : null}
                                  </button>
                                )}
                                {calendarTask ? null : (
                                  <div className="task-actions">
                                    <button
                                      type="button"
                                      className="edit-btn"
                                      aria-label="Edit task"
                                      onClick={() => openEditComposer(task)}
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      type="button"
                                      className="drag-handle"
                                      aria-label="Reorder task"
                                      onPointerDown={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        swipeRef.current = null
                                        taskSwipeRef.current = null
                                        setSwipeOffset(0)
                                        setTaskSwipe(null)
                                        event.currentTarget.setPointerCapture?.(
                                          event.pointerId,
                                        )
                                        beginDrag(
                                          task.id,
                                          event.clientY,
                                          group.id,
                                        )
                                      }}
                                    >
                                      <BarsIcon />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="panel empty">
              <h2>Nothing listed yet</h2>
              <p>
                Tap the plus at the bottom to add what you want to finish{' '}
                {viewKey === todayKey ? 'today' : 'this day'}.
              </p>
            </div>
          )}
        </section>
      )}

      {mainView === 'routines' && (
        <RoutinesView
          routines={sortedRoutines}
          tasks={state.tasks}
          activeRoutineId={activeRoutineId}
          onSelectRoutine={setActiveRoutineId}
          onEditRoutine={openEditRoutine}
          onEditStep={openEditRoutineStep}
          onStartRoutine={startRoutine}
          onBeginRoutineDrag={beginRoutineDrag}
          onBeginStepDrag={beginRoutineStepDrag}
          draggingRoutineId={draggingRoutineId}
          draggingStepId={draggingRoutineStepId}
          activeRun={activeRoutineRun}
          onCompleteStep={() => advanceRoutineStep(true)}
          onSkipStep={() => advanceRoutineStep(false)}
          onExitRun={exitRoutineRun}
          nowMs={routineNowMs}
        />
      )}

      {mainView === 'projects' && (
        <section className="day-pane projects-pane" aria-label="Projects">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              {activeProject ? (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Back to all projects"
                  onClick={() => setActiveProjectId(null)}
                >
                  ‹
                </button>
              ) : (
                <span className="day-nav-spacer" aria-hidden="true" />
              )}
              <p className="day-label">
                {activeProject ? activeProject.name : 'Projects'}
              </p>
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {!activeProject ? (
            sortedProjects.length === 0 ? (
              <div className="panel empty">
                <h2>No projects yet</h2>
                <p>Tap the plus to create a project.</p>
              </div>
            ) : (
              <div className="task-groups">
                <section className="task-group" aria-label="Your projects">
                  <h2 className="category-heading">Your projects</h2>
                  <p className="muted reorder-hint view-hint">
                    Drag the bars to reorder
                  </p>
                  <ul className="task-list">
                    {sortedProjects.map((project) => {
                      const done = project.steps.filter(
                        (s) => s.completed,
                      ).length
                      const total = project.steps.length
                      const nextStep = nextIncompleteStep(project)
                      return (
                        <li
                          className={`task-item project-item${
                            draggingProjectId === project.id ? ' dragging' : ''
                          }`}
                          key={project.id}
                        >
                          <button
                            type="button"
                            className="drag-handle"
                            aria-label="Reorder project"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              event.currentTarget.setPointerCapture?.(
                                event.pointerId,
                              )
                              beginProjectDrag(project.id, event.clientY)
                            }}
                          >
                            <BarsIcon />
                          </button>
                          <button
                            type="button"
                            className="project-main-btn"
                            onClick={() => setActiveProjectId(project.id)}
                          >
                            <p className="task-title">{project.name}</p>
                            {nextStep ? (
                              <p className="project-next-step">
                                Next: {nextStep.title}
                              </p>
                            ) : total > 0 ? (
                              <p className="project-next-step project-next-step-done">
                                All steps done
                              </p>
                            ) : null}
                            <div className="badges">
                              <span className="badge rep">
                                {total === 0
                                  ? 'No steps yet'
                                  : `${done}/${total} steps`}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit project"
                            onClick={() => openEditProject(project)}
                          >
                            <PencilIcon />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            )
          ) : activeProject.steps.length === 0 ? (
            <div className="panel empty">
              <h2>No steps yet</h2>
              <p>Tap the plus to add a step with a $ reward.</p>
            </div>
          ) : (
            <div className="task-groups">
              <section className="task-group" aria-label="Project steps">
                <h2 className="category-heading">Steps</h2>
                <p className="muted reorder-hint view-hint">
                  Drag the bars to reorder
                </p>
                <ul className="task-list">
                  {[...activeProject.steps]
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <li
                        key={step.id}
                        className={`task-item${
                          step.completed ? ' completed' : ''
                        }${draggingStepId === step.id ? ' dragging' : ''}`}
                      >
                        <button
                          type="button"
                          className="check"
                          aria-label={
                            step.completed
                              ? 'Mark step incomplete'
                              : 'Mark step complete'
                          }
                          onClick={() =>
                            toggleProjectStep(activeProject.id, step.id)
                          }
                        >
                          <CheckIcon />
                        </button>
                        <div className="task-body">
                          <p className="task-title">{step.title}</p>
                          <div className="badges">
                            <span className="badge">+${step.dollars}</span>
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit step"
                            onClick={() => openEditStep(step)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className="drag-handle"
                            aria-label="Reorder step"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              event.currentTarget.setPointerCapture?.(
                                event.pointerId,
                              )
                              beginStepDrag(
                                activeProject.id,
                                step.id,
                                event.clientY,
                              )
                            }}
                          >
                            <BarsIcon />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            </div>
          )}
        </section>
      )}

      {mainView === 'goals' && (
        <section className="day-pane" aria-label="Goals">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              {activeGoal || showingUnassigned ? (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Back to all goals"
                  onClick={() => setActiveGoalId(null)}
                >
                  ‹
                </button>
              ) : (
                <span className="day-nav-spacer" aria-hidden="true" />
              )}
              <p className="day-label">
                {showingUnassigned
                  ? 'Unassigned'
                  : activeGoal
                    ? activeGoal.name
                    : 'Goals'}
              </p>
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {!activeGoal && !showingUnassigned ? (
            sortedGoals.length === 0 && unassignedRecurring.length === 0 ? (
              <div className="panel empty">
                <h2>No goals yet</h2>
                <p>Tap the plus to add a goal, then link tasks and projects.</p>
              </div>
            ) : (
              <div className="task-groups">
                <section className="task-group" aria-label="Your goals">
                  <h2 className="category-heading">Your goals</h2>
                  <p className="muted reorder-hint view-hint">
                    {sortedGoals.length > 0
                      ? 'Drag the bars to reorder. Highlights today when you complete a linked task or project step.'
                      : 'Recurring tasks without a goal show up in Unassigned. Tap plus to add a goal.'}
                  </p>
                  <ul className="task-list">
                    {unassignedRecurring.length > 0 ? (
                      <li
                        className={`task-item goal-item goal-unassigned${
                          unassignedProgressedOnDate(
                            unassignedRecurring,
                            todayKey,
                          )
                            ? ' goal-progressed'
                            : ''
                        }`}
                      >
                        <span className="drag-handle-spacer" aria-hidden="true" />
                        <button
                          type="button"
                          className="project-main-btn"
                          onClick={() => setActiveGoalId(UNASSIGNED_GOAL_ID)}
                        >
                          <p className="task-title">Unassigned</p>
                          <p className="goal-description">
                            Recurring tasks not linked to a goal
                          </p>
                          <ul className="goal-bullets">
                            {unassignedRecurring.map((task) => (
                              <li key={task.id}>Task: {task.title}</li>
                            ))}
                          </ul>
                        </button>
                        <span className="edit-btn-spacer" aria-hidden="true" />
                      </li>
                    ) : null}
                    {sortedGoals.map((goal) => {
                      const progressed = goalProgressedOnDate(
                        goal,
                        state,
                        todayKey,
                      )
                      const bullets = [
                        ...goal.taskIds.map((id) => {
                          const task = state.tasks.find((t) => t.id === id)
                          return task ? `Task: ${task.title}` : null
                        }),
                        ...goal.projectIds.map((id) => {
                          const project = state.projects.find(
                            (p) => p.id === id,
                          )
                          return project ? `Project: ${project.name}` : null
                        }),
                      ].filter((item): item is string => Boolean(item))

                      return (
                        <li
                          key={goal.id}
                          className={`task-item goal-item${
                            progressed ? ' goal-progressed' : ''
                          }${draggingGoalId === goal.id ? ' dragging' : ''}`}
                        >
                          <button
                            type="button"
                            className="drag-handle"
                            aria-label="Reorder goal"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              event.currentTarget.setPointerCapture?.(
                                event.pointerId,
                              )
                              beginGoalDrag(goal.id, event.clientY)
                            }}
                          >
                            <BarsIcon />
                          </button>
                          <button
                            type="button"
                            className="project-main-btn"
                            onClick={() => setActiveGoalId(goal.id)}
                          >
                            <p className="task-title">{goal.name}</p>
                            {goal.description.trim() ? (
                              <p className="goal-description">
                                {goal.description.trim()}
                              </p>
                            ) : null}
                            {bullets.length === 0 ? (
                              <div className="badges">
                                <span className="badge rep">
                                  Nothing linked yet
                                </span>
                              </div>
                            ) : (
                              <ul className="goal-bullets">
                                {bullets.map((line, index) => (
                                  <li key={`${goal.id}-${index}`}>{line}</li>
                                ))}
                              </ul>
                            )}
                          </button>
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit goal"
                            onClick={() => openEditGoal(goal)}
                          >
                            <PencilIcon />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            )
          ) : showingUnassigned ? (
            <div className="task-groups">
              <section className="task-group" aria-label="Unassigned recurring tasks">
                <h2 className="category-heading">Unassigned</h2>
                <p className="muted reorder-hint view-hint">
                  Recurring tasks not linked to any goal yet. Open a goal to
                  assign them.
                </p>
                {unassignedProgressedOnDate(unassignedRecurring, todayKey) ? (
                  <p className="goal-today-note">Progressed today ✓</p>
                ) : (
                  <p className="muted view-hint">
                    No progress on these tasks today yet.
                  </p>
                )}

                {unassignedRecurring.length === 0 ? (
                  <p className="muted view-hint">
                    All recurring tasks are linked to a goal.
                  </p>
                ) : (
                  <ul className="task-list">
                    {unassignedRecurring.map((task) => (
                      <li key={task.id} className="task-item assign-item">
                        <div className="assign-btn linked static">
                          <span className="assign-mark">○</span>
                          <span className="task-title">{task.title}</span>
                          <span className="badge rep">
                            {REPETITION_LABELS[task.repetition]}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : activeGoal ? (
            <div className="task-groups">
              <section className="task-group" aria-label="Linked work">
                {activeGoal.description.trim() ? (
                  <p className="goal-description goal-description-detail">
                    {activeGoal.description.trim()}
                  </p>
                ) : null}
                <h2 className="category-heading">Linked work</h2>
                <p className="muted reorder-hint view-hint">
                  Tap to assign or unassign tasks and projects for this goal.
                </p>
                {goalProgressedOnDate(activeGoal, state, todayKey) ? (
                  <p className="goal-today-note">Progressed today ✓</p>
                ) : (
                  <p className="muted view-hint">No progress on this goal today yet.</p>
                )}

                <h3 className="subheading">Tasks</h3>
                {state.tasks.length === 0 ? (
                  <p className="muted view-hint">No tasks to link yet.</p>
                ) : (
                  <ul className="task-list">
                    {state.tasks.map((task) => {
                      const linked = activeGoal.taskIds.includes(task.id)
                      return (
                        <li key={task.id} className="task-item assign-item">
                          <button
                            type="button"
                            className={`assign-btn${linked ? ' linked' : ''}`}
                            onClick={() => toggleGoalTask(activeGoal.id, task.id)}
                          >
                            <span className="assign-mark">{linked ? '●' : '○'}</span>
                            <span className="task-title">{task.title}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="category-divider" aria-hidden="true" />
                <h3 className="subheading">Projects</h3>
                {sortedProjects.length === 0 ? (
                  <p className="muted view-hint">No projects to link yet.</p>
                ) : (
                  <ul className="task-list">
                    {sortedProjects.map((project) => {
                      const linked = activeGoal.projectIds.includes(project.id)
                      return (
                        <li key={project.id} className="task-item assign-item">
                          <button
                            type="button"
                            className={`assign-btn${linked ? ' linked' : ''}`}
                            onClick={() =>
                              toggleGoalProject(activeGoal.id, project.id)
                            }
                          >
                            <span className="assign-mark">{linked ? '●' : '○'}</span>
                            <span className="task-title">{project.name}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </section>
      )}

      {mainView === 'rewards' && (
        <section className="day-pane" aria-label="Rewards">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              <span className="day-nav-spacer" aria-hidden="true" />
              <p className="day-label">Rewards</p>
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          <div className="rewards-balance-row">
            <p className="rewards-balance-inline">
              Balance: <strong>${state.dollars}</strong>
            </p>
            <div className="rewards-balance-actions">
              <button
                type="button"
                className="edit-btn"
                aria-label="Edit balance"
                aria-expanded={balanceEditOpen}
                onClick={() => {
                  if (balanceEditOpen) setBalanceEditOpen(false)
                  else openBalanceEdit()
                }}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="edit-btn"
                aria-label="Today's points history"
                aria-expanded={ledgerOpen}
                onClick={() => {
                  setLedgerOpen((open) => !open)
                  setBalanceEditOpen(false)
                }}
              >
                <ClockIcon />
              </button>
              <button
                type="button"
                className="edit-btn"
                aria-label="Open budgeting tracker"
                onClick={() => goToView('budgeting')}
              >
                <DollarIcon />
              </button>
            </div>
          </div>

          {balanceEditOpen && (
            <div className="panel balance-edit-panel">
              <label>
                Set balance
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={balanceDraft}
                  onChange={(e) => setBalanceDraft(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="add-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveBalanceEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setBalanceEditOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ledgerOpen && (
            <div className="panel ledger-panel" aria-label="Today's points">
              <div className="ledger-summary">
                <span className="ledger-received">
                  +${todayLedgerTotals.received} received
                </span>
                <span className="ledger-used">
                  −${todayLedgerTotals.used} used
                </span>
              </div>
              {todayLedger.length === 0 ? (
                <p className="muted ledger-empty">No points activity today yet.</p>
              ) : (
                <ul className="ledger-list">
                  {todayLedger.map((entry) => (
                    <li key={entry.id} className="ledger-item">
                      <span className="ledger-label">{entry.label}</span>
                      <span
                        className={
                          entry.amount >= 0
                            ? 'ledger-amount positive'
                            : 'ledger-amount negative'
                        }
                      >
                        {entry.amount >= 0
                          ? `+$${entry.amount}`
                          : `−$${Math.abs(entry.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {state.pendingDeliveries.length > 0 ? (
            <div className="task-groups">
              <section className="task-group" aria-label="In delivery">
                <h2 className="category-heading">In delivery</h2>
                <ul className="task-list">
                  {state.pendingDeliveries.map((delivery) => (
                    <li key={delivery.id} className="task-item delivery-item">
                      <div className="task-body">
                        <p className="task-title">{delivery.rewardName}</p>
                        <div className="badges">
                          <span className="badge">
                            In delivery · ${delivery.cost}
                          </span>
                        </div>
                      </div>
                      <div className="task-actions delivery-actions">
                        <button
                          type="button"
                          className="btn btn-primary spend-btn-inline"
                          onClick={() => markDeliveryArrived(delivery.id)}
                        >
                          Delivered
                        </button>
                        <button
                          type="button"
                          className="btn spend-btn-inline"
                          onClick={() => markDeliveryReturned(delivery.id)}
                        >
                          Returned
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {state.rewards.length === 0 ? (
            <div className="panel empty">
              <h2>No rewards yet</h2>
              <p>Tap the plus to add a reward you can spend $ on.</p>
            </div>
          ) : (
            <div className="task-groups">
              <section className="task-group" aria-label="Spend rewards">
                <h2 className="category-heading">Spend</h2>
                <p className="muted reorder-hint view-hint">
                  Drag the bars to reorder
                </p>
                <ul className="task-list">
                  {state.rewards.map((reward) => (
                    <li
                      key={reward.id}
                      className={`task-item reward-item${
                        draggingRewardId === reward.id ? ' dragging' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="drag-handle"
                        aria-label="Reorder reward"
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          event.currentTarget.setPointerCapture?.(
                            event.pointerId,
                          )
                          beginRewardDrag(reward.id, event.clientY)
                        }}
                      >
                        <BarsIcon />
                      </button>
                      <div className="task-body">
                        <p className="task-title">{reward.name}</p>
                        <div className="reward-inline-actions">
                          <button
                            type="button"
                            className="btn btn-primary spend-btn-inline"
                            disabled={state.dollars < reward.cost}
                            onClick={() => spendReward(reward)}
                          >
                            Spend
                          </button>
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit reward"
                            onClick={() => openEditReward(reward)}
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      </div>
                      <span
                        className="reward-cost-badge"
                        aria-label={`Cost $${reward.cost}`}
                      >
                        ${reward.cost}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </section>
      )}

      {mainView === 'budgeting' && (
        <section className="day-pane" aria-label="Budgeting tracker">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              {activeSpendingStreamId ? (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Back to budgeting overview"
                  onClick={() => setActiveSpendingStreamId(null)}
                >
                  ‹
                </button>
              ) : (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Previous month"
                  onClick={() => setSpendingMonth((prev) => shiftMonth(prev, -1))}
                >
                  ←
                </button>
              )}
              <p className="day-label">
                {activeSpendingStreamId
                  ? (activeSpendingStream?.name ?? 'Other')
                  : formatMonthLabel(spendingMonth)}
              </p>
              {activeSpendingStreamId ? (
                <span className="day-nav-spacer" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Next month"
                  onClick={() => setSpendingMonth((prev) => shiftMonth(prev, 1))}
                >
                  →
                </button>
              )}
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {activeSpendingStreamId && streamMonthComparison ? (
            <div className="task-groups">
              <div className="panel spending-summary-panel">
                <p className="muted spending-summary-line">
                  {formatMonthLabel(spendingMonth)} and prior months
                </p>
                <p className="spending-net">
                  6-month average:{' '}
                  <strong>${streamMonthComparison.average.toFixed(2)}</strong>
                </p>
                <div className="day-label-row spending-month-nav">
                  <button
                    type="button"
                    className="day-nav-btn"
                    aria-label="Previous month"
                    onClick={() =>
                      setSpendingMonth((prev) => shiftMonth(prev, -1))
                    }
                  >
                    ←
                  </button>
                  <p className="day-label spending-month-nav-label">
                    {formatMonthLabel(spendingMonth)}
                  </p>
                  <button
                    type="button"
                    className="day-nav-btn"
                    aria-label="Next month"
                    onClick={() =>
                      setSpendingMonth((prev) => shiftMonth(prev, 1))
                    }
                  >
                    →
                  </button>
                </div>
              </div>

              <section className="task-group" aria-label="Monthly comparison">
                <h2 className="category-heading">Monthly comparison</h2>
                <ul className="task-list">
                  {streamMonthComparison.months.map((row) => (
                    <li
                      key={row.monthKey}
                      className={`task-item spending-item${
                        row.monthKey === spendingMonth
                          ? ' spending-month-current'
                          : ''
                      }`}
                    >
                      <div className="task-body">
                        <p className="task-title">
                          {formatMonthLabel(row.monthKey)}
                        </p>
                      </div>
                      <span className="reward-cost-badge">
                        ${row.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                className="task-group"
                aria-label={`${activeSpendingStream?.name ?? 'Other'} transactions`}
              >
                <h2 className="category-heading">
                  {formatMonthLabel(spendingMonth)} transactions
                </h2>
                {streamMonthComparison.currentMonthEntries.length === 0 ? (
                  <p className="muted">No transactions in this stream for this month.</p>
                ) : (
                  <ul className="task-list">
                    {streamMonthComparison.currentMonthEntries.map((entry) => (
                      <li key={entry.id} className="task-item spending-item">
                        <div className="task-body">
                          <p className="task-title">
                            ${entry.amount.toFixed(2)}
                          </p>
                          <p className="spending-date-label">
                            {formatSpendDate(entry.dateKey)}
                          </p>
                          {entry.note ? (
                            <p className="spending-note-label">{entry.note}</p>
                          ) : null}
                          {entry.impactsVirtualDollars ? (
                            <div className="badges">
                              <span className="badge">Affects virtual $</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="task-actions">
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit spending entry"
                            onClick={() => openEditSpendingEntry(entry)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Delete spending entry"
                            onClick={() => deleteSpendingEntry(entry.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <>
              <div className="panel spending-summary-panel">
                <p className="muted spending-summary-line">Monthly income and spend</p>
                <p className="spending-net">
                  Net: <strong>${spendingTotals.net.toFixed(2)}</strong>
                </p>
                <p className="muted spending-summary-line">
                  Income ${state.monthlyIncome.toFixed(2)} − Spent $
                  {spendingTotals.totalSpent.toFixed(2)}
                </p>
                <label>
                  Monthly income
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={monthlyIncomeDraft}
                    onChange={(event) => setMonthlyIncomeDraft(event.target.value)}
                  />
                </label>
                <div className="add-actions">
                  <button type="button" className="btn btn-primary" onClick={saveMonthlyIncome}>
                    Save income
                  </button>
                </div>
              </div>

              <div className="task-groups">
                <section className="task-group" aria-label="Spending by stream">
                  <h2 className="category-heading">Spent by stream</h2>
                  {spendingTotals.categoryBreakdown.length === 0 ? (
                    <p className="muted">No spending logged for this month yet.</p>
                  ) : (
                    <ul className="task-list">
                      {spendingTotals.categoryBreakdown.map((item) => {
                        const typeName =
                          state.budgetingStreams.find((type) => type.id === item.streamId)
                            ?.name ?? 'Other'
                        return (
                          <li key={item.streamId} className="task-item spending-item">
                            <button
                              type="button"
                              className="project-main-btn"
                              onClick={() => setActiveSpendingStreamId(item.streamId)}
                            >
                              <p className="task-title">{typeName}</p>
                              <p className="muted spending-subtotal-hint">
                                Tap for month comparison
                              </p>
                            </button>
                            <span className="reward-cost-badge">
                              ${item.amount.toFixed(2)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                <section className="task-group" aria-label="Spending entries">
                  <h2 className="category-heading">Transactions</h2>
                  {spendingEntriesForMonth.length === 0 ? (
                    <p className="muted">Tap plus to add your first real-world expense.</p>
                  ) : (
                    <ul className="task-list">
                      {spendingEntriesForMonth.map((entry) => {
                        const typeName =
                          state.budgetingStreams.find((type) => type.id === entry.streamId)
                            ?.name ?? 'Other'
                        return (
                          <li key={entry.id} className="task-item spending-item">
                            <div className="task-body">
                              <p className="task-title">
                                ${entry.amount.toFixed(2)}
                              </p>
                              <p className="spending-stream-label">{typeName}</p>
                              <p className="spending-date-label">
                                {formatSpendDate(entry.dateKey)}
                              </p>
                              {entry.note ? (
                                <p className="spending-note-label">{entry.note}</p>
                              ) : null}
                              {entry.impactsVirtualDollars ? (
                                <div className="badges">
                                  <span className="badge">Affects virtual $</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="task-actions">
                              <button
                                type="button"
                                className="edit-btn"
                                aria-label="Edit spending entry"
                                onClick={() => openEditSpendingEntry(entry)}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                className="edit-btn"
                                aria-label="Delete spending entry"
                                onClick={() => deleteSpendingEntry(entry.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </section>
      )}

      {notesTask ? (
        <TaskNotesPanel
          title={notesTask.title}
          description={notesDraft}
          onDescriptionChange={setNotesDraft}
          onClose={closeTaskNotes}
          onSave={saveTaskNotes}
        />
      ) : null}

      {spendConfirmReward ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSpendConfirmReward(null)}
        >
          <div
            className="panel modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spend-delivered-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="spend-delivered-title">Delivered?</h2>
            <p className="muted">
              Spend ${spendConfirmReward.cost} on {spendConfirmReward.name}.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => confirmSpend(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => confirmSpend(false)}
              >
                No
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setSpendConfirmReward(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mainView === 'settings' && (
        <section className="day-pane" aria-label="Settings">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              <span className="day-nav-spacer" aria-hidden="true" />
              <p className="day-label">Settings</p>
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          <div className="task-groups settings-groups">
            <SettingsSection title="Categories" ariaLabel="Categories">
              <CategorySettingsPanel
                categories={state.taskCategories}
                newName={newCategory}
                onNewNameChange={setNewCategory}
                editingId={editingCategoryId}
                draggingId={draggingCategoryId}
                onStartEdit={startCategoryEdit}
                onFinishEdit={finishCategoryEdit}
                onCancelEdit={cancelCategoryEdit}
                onLiveRename={liveRenameCategory}
                onToggleAttention={toggleCategoryAttention}
                onToggleReminders={toggleCategoryReminders}
                onDelete={deleteCategory}
                onAdd={addCategory}
                onBeginDrag={beginCategoryDrag}
              />
            </SettingsSection>

            <SettingsSection title="Budgeting Streams" ariaLabel="Budgeting Streams">
              <BudgetingStreamsSettingsPanel
                streams={state.budgetingStreams}
                newName={newStreamName}
                onNewNameChange={setNewStreamName}
                editingId={editingStreamId}
                draggingId={draggingStreamId}
                onStartEdit={startStreamEdit}
                onFinishEdit={finishStreamEdit}
                onCancelEdit={cancelStreamEdit}
                onLiveRename={liveRenameBudgetingStream}
                onDelete={deleteBudgetingStream}
                onAdd={addBudgetingStream}
                onBeginDrag={beginStreamDrag}
              />
            </SettingsSection>

            <SettingsSection title="Modes" ariaLabel="Modes">
              <ModeSettingsPanel
                modes={sortedModes}
                newName={newModeName}
                newIcon={newModeIcon}
                onNewNameChange={setNewModeName}
                onNewIconChange={setNewModeIcon}
                editingId={editingModeId}
                draggingId={draggingModeId}
                onStartEdit={startModeEdit}
                onFinishEdit={finishModeEdit}
                onCancelEdit={cancelModeEdit}
                onLiveRename={liveRenameMode}
                onChangeIcon={changeModeIcon}
                onDelete={deleteMode}
                onAdd={addMode}
                onBeginDrag={beginModeDrag}
              />
            </SettingsSection>

            <SettingsSection title="Navigation" ariaLabel="Navigation">
              <NavigationSettingsPanel
                visibility={state.navVisibility}
                onToggle={toggleNavVisibility}
              />
            </SettingsSection>

            <CloudSyncSettings state={state} onCloudStateLoaded={applyCloudState} />

            <CalendarSettings
              calendars={state.connectedCalendars}
              cloudSyncConnected={unlocked}
              onCalendarsChange={(connectedCalendars: ConnectedCalendar[]) => {
                updateState((prev) => ({ ...prev, connectedCalendars }))
              }}
            />
          </div>
        </section>
      )}

      {mainView === 'timer' && (
        <section className="day-pane" aria-label="Timer">
          <div className="day-header">
            <div className="day-label-row projects-title-row">
              {activeTimer ? (
                <button
                  type="button"
                  className="day-nav-btn"
                  aria-label="Back to timers"
                  onClick={() => setActiveTimerId(null)}
                >
                  ‹
                </button>
              ) : (
                <span className="day-nav-spacer" aria-hidden="true" />
              )}
              <p className="day-label">
                {activeTimer ? activeTimer.title : 'Timers'}
              </p>
              <button
                type="button"
                className={`day-nav-btn timer-sound-btn${
                  state.timerSoundEnabled ? '' : ' muted'
                }`}
                aria-label={
                  state.timerSoundEnabled
                    ? 'Turn timer sound off'
                    : 'Turn timer sound on'
                }
                aria-pressed={state.timerSoundEnabled}
                onClick={() => {
                  const nextEnabled = !state.timerSoundEnabled
                  updateState((prev) => ({
                    ...prev,
                    timerSoundEnabled: nextEnabled,
                  }))
                  if (nextEnabled) playTimerDing()
                }}
              >
                {state.timerSoundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
              </button>
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {activeTimer ? (
            <div className="panel timer-panel">
              <p className="timer-display" aria-live="polite">
                {formatTimerSeconds(activeTimer.elapsedSeconds ?? 0)}
              </p>
              <p className="timer-seconds-label">
                {activeTimer.elapsedSeconds ?? 0} second
                {(activeTimer.elapsedSeconds ?? 0) === 1 ? '' : 's'}
              </p>
              <p className="muted timer-hint">
                Earn $1 every {activeTimer.minutesForDollar} minute
                {activeTimer.minutesForDollar === 1 ? '' : 's'}. Progress is
                saved when you pause — even across days — until you earn $1.
                Leftover time carries to the next dollar.
              </p>
              <p className="timer-next">
                Next $ in{' '}
                {formatTimerSeconds(
                  Math.max(
                    0,
                    activeTimer.minutesForDollar * 60 -
                      (activeTimer.elapsedSeconds ?? 0),
                  ),
                )}
              </p>
              <div className="timer-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => toggleTimerRunning(activeTimer.id)}
                >
                  {runningTimerId === activeTimer.id ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => resetActiveTimer(activeTimer.id)}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : sortedTimers.length === 0 ? (
            <div className="panel empty">
              <h2>No timers yet</h2>
              <p>Tap the plus to add a timer with a title and $1 duration.</p>
            </div>
          ) : (
            <div className="task-groups">
              <section className="task-group" aria-label="Your timers">
                <h2 className="category-heading">Your timers</h2>
                <p className="muted reorder-hint view-hint">
                  Drag to reorder. Tap play to start or pause. Tap a timer for
                  the full view.
                </p>
                <ul className="task-list">
                  {sortedTimers.map((timer) => {
                    const elapsed = timer.elapsedSeconds ?? 0
                    const running = runningTimerId === timer.id
                    return (
                      <li
                        key={timer.id}
                        className={`task-item timer-item${
                          draggingTimerId === timer.id ? ' dragging' : ''
                        }${running ? ' timer-running' : ''}`}
                      >
                        <button
                          type="button"
                          className="drag-handle"
                          aria-label="Reorder timer"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            event.currentTarget.setPointerCapture?.(
                              event.pointerId,
                            )
                            beginTimerDrag(timer.id, event.clientY)
                          }}
                        >
                          <BarsIcon />
                        </button>
                        <button
                          type="button"
                          className="timer-main-btn"
                          onClick={() => setActiveTimerId(timer.id)}
                        >
                          <p className="task-title">{timer.title}</p>
                          <div className="badges">
                            <span className="badge">
                              $1 / {timer.minutesForDollar} min
                            </span>
                            {elapsed > 0 ? (
                              <span className="badge">
                                {formatTimerSeconds(elapsed)}
                                {running ? ' · running' : ' · paused'}
                              </span>
                            ) : null}
                          </div>
                        </button>
                        <div className="task-actions">
                          <button
                            type="button"
                            className={`edit-btn timer-toggle-btn${
                              running ? ' running' : ''
                            }`}
                            aria-label={running ? 'Pause timer' : 'Start timer'}
                            onClick={() => toggleTimerRunning(timer.id)}
                          >
                            {running ? <PauseIcon /> : <PlayIcon />}
                          </button>
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Edit timer"
                            onClick={() => openEditTimer(timer)}
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>
          )}
        </section>
      )}

      <div className={`composer${addOpen ? ' composer-open' : ''}`}>
        {!addOpen ? (
          <nav className="composer-collapsed bottom-nav" aria-label="Main views">
            {mainView !== 'settings' && !activeRoutineRun ? (
              <button
                type="button"
                className="circle-btn plus-btn"
                aria-label={
                  mainView === 'projects'
                    ? activeProject
                      ? 'New step'
                      : 'New project'
                    : mainView === 'goals'
                      ? 'New goal'
                      : mainView === 'routines'
                        ? activeRoutine
                          ? editingRoutineStepId
                            ? 'Edit step'
                            : 'New step'
                          : editingRoutineId
                            ? 'Edit routine'
                            : 'New routine'
                        : mainView === 'timer'
                          ? editingTimerId
                            ? 'Edit timer'
                            : 'New timer'
                          : mainView === 'budgeting'
                            ? editingSpendingId
                              ? 'Edit cost'
                              : 'New cost'
                          : mainView === 'rewards'
                            ? editingRewardId
                              ? 'Edit reward'
                              : 'New reward'
                            : 'New task'
                }
                onClick={openAddComposer}
              >
                <PlusIcon />
              </button>
            ) : (
              <span className="nav-plus-spacer" aria-hidden="true" />
            )}
            {state.navVisibility.tasks !== false ? (
              <button
                type="button"
                className={`circle-btn tasks-btn${
                  mainView === 'tasks' ? ' active' : ''
                }`}
                aria-label="Tasks"
                aria-pressed={mainView === 'tasks'}
                onClick={() => goToView('tasks')}
              >
                <TasksIcon />
              </button>
            ) : null}
            {state.navVisibility.projects !== false ? (
              <button
                type="button"
                className={`circle-btn project-btn${
                  mainView === 'projects' ? ' active' : ''
                }`}
                aria-label="Projects"
                aria-pressed={mainView === 'projects'}
                onClick={() => goToView('projects')}
              >
                <ProjectIcon />
              </button>
            ) : null}
            {state.navVisibility.goals !== false ? (
              <button
                type="button"
                className={`circle-btn goals-btn${
                  mainView === 'goals' ? ' active' : ''
                }`}
                aria-label="Goals"
                aria-pressed={mainView === 'goals'}
                onClick={() => goToView('goals')}
              >
                <TargetIcon />
              </button>
            ) : null}
            {state.navVisibility.routines !== false ? (
              <button
                type="button"
                className={`circle-btn routines-btn${
                  mainView === 'routines' ? ' active' : ''
                }`}
                aria-label="Routines"
                aria-pressed={mainView === 'routines'}
                onClick={() => goToView('routines')}
              >
                <ChecklistIcon />
              </button>
            ) : null}
            {state.navVisibility.timer !== false ? (
              <button
                type="button"
                className={`circle-btn timer-btn${
                  mainView === 'timer' ? ' active' : ''
                }`}
                aria-label="Timer"
                aria-pressed={mainView === 'timer'}
                onClick={() => goToView('timer')}
              >
                <NavClockIcon />
              </button>
            ) : null}
            {state.navVisibility.budgeting !== false ? (
              <button
                type="button"
                className={`circle-btn spending-btn${
                  mainView === 'budgeting' ? ' active' : ''
                }`}
                aria-label="Budgeting"
                aria-pressed={mainView === 'budgeting'}
                onClick={() => goToView('budgeting')}
              >
                <NavDollarIcon />
              </button>
            ) : null}
            <span className="nav-right-spacer" aria-hidden="true" />
            {state.navVisibility.rewards !== false ? (
              <button
                type="button"
                className={`circle-btn gift-btn${
                  mainView === 'rewards' ? ' active' : ''
                }`}
                aria-label="Rewards"
                aria-pressed={mainView === 'rewards'}
                onClick={() => goToView('rewards')}
              >
                <GiftIcon />
              </button>
            ) : null}
            <button
              type="button"
              className={`circle-btn settings-btn${
                mainView === 'settings' ? ' active' : ''
              }`}
              aria-label="Settings"
              aria-pressed={mainView === 'settings'}
              onClick={() => goToView('settings')}
            >
              <SettingsIcon />
            </button>
          </nav>
        ) : mainView === 'projects' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>
                {activeProject && !editingProjectId
                  ? editingStepId
                    ? 'Edit step'
                    : 'New step'
                  : editingProjectId
                    ? 'Edit project'
                    : 'New project'}
              </h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            {activeProject && !editingProjectId ? (
              <>
                <label>
                  Step name
                  <input
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder="What needs to get done?"
                    autoComplete="off"
                  />
                </label>
                <label>
                  $ when completed
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={newStepDollars}
                    onChange={(e) => setNewStepDollars(e.target.value)}
                  />
                </label>
                <div className="add-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (addProjectStep(activeProject.id)) setAddOpen(false)
                    }}
                  >
                    {editingStepId ? 'Save step' : 'Add step'}
                  </button>
                  {editingStepId ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        deleteProjectStep(activeProject.id, editingStepId)
                      }
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <label>
                  Project name
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Name this project"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (addProject()) setAddOpen(false)
                      }
                    }}
                  />
                </label>
                <div className="add-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (addProject()) setAddOpen(false)
                    }}
                  >
                    {editingProjectId ? 'Save project' : 'Add project'}
                  </button>
                  {editingProjectId ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deleteProject(editingProjectId)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : mainView === 'goals' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>{editingGoalId ? 'Edit goal' : 'New goal'}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            <label>
              Goal name
              <input
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="What are you working toward?"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (addGoal()) setAddOpen(false)
                  }
                }}
              />
            </label>
            <label>
              Description
              <textarea
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Optional notes under the title"
                rows={3}
              />
            </label>
            <div className="add-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (addGoal()) setAddOpen(false)
                }}
              >
                {editingGoalId ? 'Save goal' : 'Add goal'}
              </button>
              {editingGoalId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteGoal(editingGoalId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : mainView === 'routines' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>
                {activeRoutine && !editingRoutineId
                  ? editingRoutineStepId
                    ? 'Edit step'
                    : 'New step'
                  : editingRoutineId
                    ? 'Edit routine'
                    : 'New routine'}
              </h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            {activeRoutine && !editingRoutineId ? (
              <>
                <fieldset className="routine-step-kind">
                  <legend>Step type</legend>
                  <label className="inline-check">
                    <input
                      type="radio"
                      name="routine-step-kind"
                      checked={routineStepKind === 'task'}
                      onChange={() => setRoutineStepKind('task')}
                    />
                    Linked task
                  </label>
                  <label className="inline-check">
                    <input
                      type="radio"
                      name="routine-step-kind"
                      checked={routineStepKind === 'custom'}
                      onChange={() => setRoutineStepKind('custom')}
                    />
                    Custom (no task $)
                  </label>
                </fieldset>
                {routineStepKind === 'task' ? (
                  <div className="routine-task-picker">
                    <label>
                      Search tasks
                      <input
                        type="search"
                        value={routineTaskSearch}
                        onChange={(e) => setRoutineTaskSearch(e.target.value)}
                        placeholder="Type to filter, or scroll the list"
                        autoComplete="off"
                        enterKeyHint="search"
                      />
                    </label>
                    {repeatingTasksForRoutine.length === 0 ? (
                      <p className="muted view-hint">
                        {routineTaskSearch.trim()
                          ? 'No repeating tasks match that search.'
                          : 'No repeating tasks to link yet.'}
                      </p>
                    ) : (
                      <>
                        <p className="muted view-hint routine-task-picker-count">
                          {repeatingTasksForRoutine.length} task
                          {repeatingTasksForRoutine.length === 1 ? '' : 's'}
                          {routineTaskSearch.trim() ? ' match' : ''} · tap one
                        </p>
                        <ul
                          className="routine-task-picker-list"
                          role="listbox"
                          aria-label="Repeating tasks"
                        >
                          {repeatingTasksForRoutine.map((task) => {
                            const selected = routineStepTaskId === task.id
                            return (
                              <li key={task.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  className={`routine-task-option${
                                    selected ? ' selected' : ''
                                  }`}
                                  onClick={() => setRoutineStepTaskId(task.id)}
                                >
                                  <span className="routine-task-option-main">
                                    <span className="routine-task-option-title">
                                      {task.title}
                                    </span>
                                    <span className="routine-task-option-meta">
                                      {REPETITION_LABELS[task.repetition]}
                                    </span>
                                  </span>
                                  <span
                                    className="routine-task-option-check"
                                    aria-hidden="true"
                                  >
                                    {selected ? '✓' : ''}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <label>
                    Step name
                    <input
                      value={routineStepTitle}
                      onChange={(e) => setRoutineStepTitle(e.target.value)}
                      placeholder="Something to do in this routine"
                      autoComplete="off"
                    />
                  </label>
                )}
                <div className="routine-duration-fields">
                  <label>
                    Minutes
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={routineStepMinutes}
                      onChange={(e) => setRoutineStepMinutes(e.target.value)}
                    />
                  </label>
                  <label>
                    Seconds
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={59}
                      step={1}
                      value={routineStepSeconds}
                      onChange={(e) => setRoutineStepSeconds(e.target.value)}
                    />
                  </label>
                </div>
                <p className="muted view-hint">
                  Countdown shows as MM:SS while the routine runs.
                </p>
                <div className="add-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (addRoutineStep(activeRoutine.id)) setAddOpen(false)
                    }}
                  >
                    {editingRoutineStepId ? 'Save step' : 'Add step'}
                  </button>
                  {editingRoutineStepId ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        deleteRoutineStep(activeRoutine.id, editingRoutineStepId)
                      }
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <label>
                  Routine name
                  <input
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                    placeholder="Morning checklist"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (addRoutine()) setAddOpen(false)
                      }
                    }}
                  />
                </label>
                <label>
                  $ for completing every step
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={newRoutineReward}
                    onChange={(e) => setNewRoutineReward(e.target.value)}
                  />
                </label>
                <p className="muted view-hint">
                  Bonus only if you complete every step — skips earn nothing.
                </p>
                <div className="add-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (addRoutine()) setAddOpen(false)
                    }}
                  >
                    {editingRoutineId ? 'Save routine' : 'Add routine'}
                  </button>
                  {editingRoutineId ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deleteRoutine(editingRoutineId)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : mainView === 'timer' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>{editingTimerId ? 'Edit timer' : 'New timer'}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            <label>
              Title
              <input
                value={newTimerTitle}
                onChange={(e) => setNewTimerTitle(e.target.value)}
                placeholder="Room cleaning"
                autoComplete="off"
              />
            </label>
            <label>
              Minutes for $1
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={newTimerMinutes}
                onChange={(e) => setNewTimerMinutes(e.target.value)}
              />
            </label>
            <div className="add-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addTimer()
                  setAddOpen(false)
                }}
              >
                {editingTimerId ? 'Save timer' : 'Add timer'}
              </button>
              {editingTimerId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteTimer(editingTimerId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : mainView === 'budgeting' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>{editingSpendingId ? 'Edit cost' : 'New cost'}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            <label>
              Amount spent
              <input
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                value={newSpendingAmount}
                onChange={(event) => setNewSpendingAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label>
              Budgeting stream
              <select
                value={newSpendingStreamId}
                onChange={(event) => setNewSpendingStreamId(event.target.value)}
                required
              >
                <option value="">Choose a stream…</option>
                {state.budgetingStreams.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Note (optional)
              <input
                value={newSpendingNote}
                onChange={(event) => setNewSpendingNote(event.target.value)}
                placeholder="Groceries, gas, etc."
                autoComplete="off"
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={newSpendingAffectsVirtual}
                onChange={(event) => setNewSpendingAffectsVirtual(event.target.checked)}
              />
              Also subtract this from virtual app money
            </label>
            <div className="add-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!newSpendingStreamId.trim()}
                onClick={addSpendingEntry}
              >
                {editingSpendingId ? 'Save cost' : 'Add cost'}
              </button>
              {editingSpendingId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteSpendingEntry(editingSpendingId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : mainView === 'rewards' ? (
          <div className="panel add-panel">
            <div className="composer-header">
              <h2>{editingRewardId ? 'Edit reward' : 'New reward'}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>
            <label>
              Reward name
              <input
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
                placeholder="What are you saving for?"
                autoComplete="off"
              />
            </label>
            <label>
              Cost in $
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(e.target.value)}
              />
            </label>
            <div className="add-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addReward()
                  setAddOpen(false)
                }}
              >
                {editingRewardId ? 'Save reward' : 'Add reward'}
              </button>
              {editingRewardId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteReward(editingRewardId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            className="panel add-panel task-composer"
            onSubmit={handleSaveTask}
            id={formId}
            noValidate
          >
            <div className="composer-header">
              <h2>{editingTaskId ? 'Edit task' : 'New task'}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label={editingTaskId ? 'Close edit task' : 'Close new task'}
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>

            <label htmlFor={`${formId}-title`}>
              Task
              <input
                ref={titleInputRef}
                id={`${formId}-title`}
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (addError) setAddError('')
                }}
                placeholder="What do you want to complete?"
                autoComplete="off"
                enterKeyHint="done"
              />
            </label>

            <div className="field-row task-composer-row">
              <label htmlFor={`${formId}-day`}>
                Day
                <input
                  id={`${formId}-day`}
                  name="taskDay"
                  type="date"
                  value={taskDay}
                  onChange={(e) => {
                    setTaskDay(e.target.value)
                    if (addError) setAddError('')
                  }}
                  required
                />
              </label>
              <label htmlFor={`${formId}-rep`}>
                Repeat
                <select
                  id={`${formId}-rep`}
                  name="repetition"
                  value={repetition}
                  onChange={(e) => {
                    setRepetition(e.target.value as Repetition | '')
                    if (addError) setAddError('')
                  }}
                  required
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {(Object.keys(REPETITION_LABELS) as Repetition[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {REPETITION_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <fieldset className="category-multi category-multi-compact">
              <legend>Categories</legend>
              <div className="category-multi-list">
                {state.taskCategories.map((cat) => {
                  const checked = categoryIds.includes(cat.id)
                  return (
                    <label
                      key={cat.id}
                      className={`category-multi-option${
                        checked ? ' selected' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleComposerCategory(cat.id)}
                      />
                      <span>{cat.name}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {repetition === 'custom' || repetition === 'after_completion' ? (
              <label htmlFor={`${formId}-custom`}>
                {repetition === 'after_completion'
                  ? 'Days in between'
                  : 'Every N days'}
                <input
                  id={`${formId}-custom`}
                  name="customEveryDays"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={customEveryDays}
                  onChange={(e) => setCustomEveryDays(e.target.value)}
                />
              </label>
            ) : null}
            {repetition === 'weekdays' ? (
              <fieldset className="category-multi weekday-multi">
                <legend>Show on</legend>
                <div className="weekday-multi-list">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const checked = selectedWeekdays.includes(day.value)
                    return (
                      <label
                        key={day.value}
                        className={`weekday-multi-option${
                          checked ? ' selected' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleComposerWeekday(day.value)}
                        />
                        <span>{day.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {sortedModes.length > 0 ? (
              <fieldset className="category-multi mode-visibility-compact">
                <legend>Show in</legend>
                <div className="mode-visibility-options">
                  {sortedModes.map((mode) => {
                    const visible = visibleInModes[mode.id] !== false
                    return (
                      <label
                        key={mode.id}
                        className={`mode-chip${visible ? ' selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => toggleComposerModeVisibility(mode.id)}
                        />
                        <ModeIcon icon={mode.icon} />
                        <span>{mode.name}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {addError ? <p className="error-text">{addError}</p> : null}

            <div className="add-actions">
              <button type="submit" className="btn btn-primary">
                {editingTaskId ? 'Save task' : 'Add task'}
              </button>
              {editingTaskId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteTask(editingTaskId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function startToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

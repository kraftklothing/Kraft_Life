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
import { appendLedgerEntry, loadState, normalizeState, saveState } from './storage'
import { useCloudSync } from './CloudSyncProvider'
import CloudSyncSettings from './CloudSyncSettings'
import CalendarSettings from './CalendarSettings'
import SettingsSection from './SettingsSection'
import { fetchCalendarEvents, type CalendarEventItem } from './calendarApi'
import { getCalendarIcsUrl } from './calendarSession'
import {
  allTimeCompletionCount,
  isCompletedForDateView,
  isOccurrenceSatisfied,
  nextOccurrence,
  occurrenceForDate,
  sortTasksForDay,
  taskVisibleOnDate,
  taskVisibleInVacationMode,
  taskVisibleInWorkMode,
  taskVisibleInHomeMode,
  taskVisibleInOutMode,
} from './taskLogic'
import { goalProgressedOnDate } from './goalLogic'
import CategorySettingsPanel from './CategorySettingsPanel'
import TaskNotesPanel, {
  TaskDescriptionPreview,
} from './TaskNotesPanel'
import {
  REPETITION_LABELS,
  WEEKDAY_OPTIONS,
  type AppState,
  type Category,
  type FocusTimer,
  type Goal,
  type PendingDelivery,
  type Project,
  type ProjectStep,
  type Repetition,
  type Reward,
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

type MainView = 'tasks' | 'projects' | 'goals' | 'timer' | 'rewards' | 'settings'

const COMPLETED_GROUP_ID = '__completed__'
const CALENDAR_GROUP_ID = '__calendar__'

function isCalendarTask(taskId: string): boolean {
  return taskId.startsWith('calendar:')
}

function PlaneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 12.5 3 10l1-2 7.5 1.5L17 3l2 1-3.5 8.5L22 15l-1 2-7.5-2.5L10 21l-2-1 2.5-7.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 11 6.5 7.5A2 2 0 0 1 8.3 6.5h7.4a2 2 0 0 1 1.8 1L19 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 11h18v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
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

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

export default function App() {
  const { scheduleSave, takeLoadedState, cloudLoadCount } = useCloudSync()
  const [state, setState] = useState<AppState>(() => loadState())
  const [viewDate, setViewDate] = useState(() => startToday())
  const [title, setTitle] = useState('')
  const [repetition, setRepetition] = useState<Repetition | ''>('')
  const [customEveryDays, setCustomEveryDays] = useState('2')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [visibleInWorkMode, setVisibleInWorkMode] = useState(true)
  const [visibleInHomeMode, setVisibleInHomeMode] = useState(true)
  const [visibleInOutMode, setVisibleInOutMode] = useState(true)
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
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardCost, setNewRewardCost] = useState('5')
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])
  const [calendarConnectionVersion, setCalendarConnectionVersion] = useState(0)
  const [collapsedTaskCategoryIds, setCollapsedTaskCategoryIds] = useState<
    string[]
  >([COMPLETED_GROUP_ID])
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null)
  const [runningTimerId, setRunningTimerId] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState<Record<string, number>>({})
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
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null)
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [dayAnim, setDayAnim] = useState<'none' | 'from-left' | 'from-right'>(
    'none',
  )

  const formId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dayPickerRef = useRef<HTMLInputElement>(null)
  const swipeRef = useRef<{
    x: number
    y: number
    active: boolean
    locked: 'x' | 'y' | null
    pointerId: number | null
  } | null>(null)
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

  const todayKey = toDateKey(startToday())
  const viewKey = toDateKey(viewDate)
  const vacationOn = Boolean(state.vacationDays[viewKey])
  const workModeOn = state.workMode
  const homeModeOn = state.homeMode
  const outModeOn = state.outMode
  const notesTask = notesTaskId
    ? state.tasks.find((task) => task.id === notesTaskId) ?? null
    : null

  useEffect(() => {
    saveState(state)
    scheduleSave(state)
  }, [state, scheduleSave])

  useEffect(() => {
    const loaded = takeLoadedState()
    if (loaded) setState(normalizeState(loaded))
  }, [cloudLoadCount, takeLoadedState])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!runningTimerId) return
    const id = window.setInterval(() => {
      setTimerElapsed((prev) => ({
        ...prev,
        [runningTimerId]: (prev[runningTimerId] ?? 0) + 1,
      }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [runningTimerId])

  const dayTasks = useMemo(() => {
    const applicable = state.tasks.filter((task) => {
      if (!taskVisibleOnDate(task, viewKey)) return false
      if (
        vacationOn &&
        !taskVisibleInVacationMode(task, state.taskCategories)
      ) {
        return false
      }
      if (workModeOn && !taskVisibleInWorkMode(task)) return false
      if (homeModeOn && !taskVisibleInHomeMode(task)) return false
      if (outModeOn && !taskVisibleInOutMode(task)) return false
      return true
    })
    return sortTasksForDay(applicable)
  }, [
    state.tasks,
    state.taskCategories,
    viewKey,
    vacationOn,
    workModeOn,
    homeModeOn,
    outModeOn,
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

  const sortedTimers = useMemo(
    () => [...state.timers].sort((a, b) => a.order - b.order),
    [state.timers],
  )

  const activeTimer = useMemo(
    () => sortedTimers.find((t) => t.id === activeTimerId) ?? null,
    [sortedTimers, activeTimerId],
  )

  const activeGoal = useMemo(
    () => sortedGoals.find((g) => g.id === activeGoalId) ?? null,
    [sortedGoals, activeGoalId],
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
      tasks: Task[]
    }[] = []
    for (const cat of state.taskCategories) {
      const tasks = byCat.get(cat.id)
      if (!tasks?.length) continue
      groups.push({
        id: cat.id,
        name: cat.name,
        attention: cat.attention === true,
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
    const icsUrl = getCalendarIcsUrl()
    if (!icsUrl) {
      setCalendarEvents([])
      return
    }

    let cancelled = false
    void fetchCalendarEvents(icsUrl, viewKey)
      .then((events) => {
        if (!cancelled) setCalendarEvents(events)
      })
      .catch(() => {
        if (!cancelled) setCalendarEvents([])
      })

    return () => {
      cancelled = true
    }
  }, [viewKey, calendarConnectionVersion])

  const groupedDayView = useMemo(() => {
    if (calendarEvents.length === 0) return groupedDayTasks

    const calendarTasks: Task[] = calendarEvents.map((event, index) => ({
      id: `calendar:${event.id}`,
      title: event.allDay
        ? event.title
        : `${event.timeLabel ?? ''} · ${event.title}`.replace(/^ · /, ''),
      description: '',
      categoryIds: [CALENDAR_GROUP_ID],
      repetition: 'none',
      startDate: viewKey,
      completions: {},
      visibleInWorkMode: true,
      visibleInHomeMode: true,
      visibleInOutMode: true,
      order: index,
      createdAt: 0,
    }))

    const withoutCompleted = groupedDayTasks.filter(
      (group) => group.id !== COMPLETED_GROUP_ID,
    )
    const completedGroup = groupedDayTasks.find(
      (group) => group.id === COMPLETED_GROUP_ID,
    )

    return [
      {
        id: CALENDAR_GROUP_ID,
        name: 'Calendar',
        tasks: calendarTasks,
      },
      ...withoutCompleted,
      ...(completedGroup ? [completedGroup] : []),
    ]
  }, [calendarEvents, groupedDayTasks, viewKey])

  const hasDayContent = dayTasks.length > 0 || calendarEvents.length > 0

  const completedCount = dayTasks.filter((t) =>
    isCompletedForDateView(t, viewKey),
  ).length
  const remainingCount = dayTasks.length - completedCount
  const percent =
    dayTasks.length === 0 ? 0 : Math.round((completedCount / dayTasks.length) * 100)

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

  function updateState(updater: (prev: AppState) => AppState) {
    setState((prev) => updater(prev))
  }

  useEffect(() => {
    if (!runningTimerId) return
    const timer = state.timers.find((t) => t.id === runningTimerId)
    if (!timer) return
    const goalSeconds = Math.max(1, timer.minutesForDollar) * 60
    const elapsed = timerElapsed[runningTimerId] ?? 0
    if (elapsed < goalSeconds) return
    const cycles = Math.floor(elapsed / goalSeconds)
    if (cycles < 1) return
    const today = toDateKey(startToday())
    updateState((prev) => {
      let dollars = prev.dollars
      let dollarLedger = prev.dollarLedger
      for (let i = 0; i < cycles; i += 1) {
        dollars += 1
        dollarLedger = appendLedgerEntry(dollarLedger, {
          dateKey: today,
          amount: 1,
          kind: 'earned',
          label: timer.title,
        })
      }
      return { ...prev, dollars, dollarLedger }
    })
    setTimerElapsed((prev) => ({
      ...prev,
      [runningTimerId]: elapsed % goalSeconds,
    }))
    setToast(cycles === 1 ? `+$1 · ${timer.title}` : `+$${cycles} · ${timer.title}`)
  }, [timerElapsed, runningTimerId, state.timers])

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
    setVisibleInWorkMode(true)
    setVisibleInHomeMode(true)
    setVisibleInOutMode(true)
    setTaskDay(toDateKey(viewDate))
    setAddError('')
    setEditingTaskId(null)
    setEditingTimerId(null)
    setEditingRewardId(null)
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
      updateState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: trimmed,
                categoryIds: selectedCategories,
                repetition,
                customRepeat: keepsCustomRepeat ? customRepeat : undefined,
                startDate: dayKey,
                visibleInWorkMode,
                visibleInHomeMode,
                visibleInOutMode,
              }
            : task,
        ),
      }))
      if (dayKey !== viewKey) {
        setViewDate(parsedDay)
      }
      resetComposerFields()
      setAddOpen(false)
      setToast(dayKey !== viewKey ? 'Task moved' : 'Task updated')
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
      visibleInWorkMode,
      visibleInHomeMode,
      visibleInOutMode,
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
    if (view !== 'timer') setActiveTimerId(null)
  }

  function openAddComposer() {
    if (mainView === 'settings') return
    if (
      mainView === 'projects' ||
      mainView === 'rewards' ||
      mainView === 'goals' ||
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
    setVisibleInWorkMode(task.visibleInWorkMode !== false)
    setVisibleInHomeMode(task.visibleInHomeMode !== false)
    setVisibleInOutMode(task.visibleInOutMode !== false)
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
    }))
    resetComposerFields()
    setAddOpen(false)
    setToast('Task deleted')
  }

  function toggleComplete(taskId: string) {
    if (isCalendarTask(taskId)) return
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
          dollars += 1
          dollarLedger = appendLedgerEntry(dollarLedger, {
            dateKey: viewKey,
            amount: 1,
            kind: 'earned',
            label: task.title,
          })
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

  function toggleWorkMode() {
    updateState((prev) => ({ ...prev, workMode: !prev.workMode }))
  }

  function toggleHomeMode() {
    updateState((prev) => ({ ...prev, homeMode: !prev.homeMode }))
  }

  function toggleOutMode() {
    updateState((prev) => ({ ...prev, outMode: !prev.outMode }))
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
    setTimerElapsed((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
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
    setTimerElapsed((prev) => ({ ...prev, [timerId]: 0 }))
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
        return { ...c, attention: true }
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

  function beginCategoryDrag(categoryIdToDrag: string, clientY: number) {
    categoryDragRef.current = {
      id: categoryIdToDrag,
      startY: clientY,
      orderSnapshot: state.taskCategories.map((c) => c.id),
    }
    setDraggingCategoryId(categoryIdToDrag)
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

  function openDayPicker() {
    const input = dayPickerRef.current
    if (!input) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // Some browsers require a direct user gesture for showPicker.
    }
    input.focus()
    input.click()
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
        setState((prev) => {
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
        setState((prev) => {
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
        setState((prev) => {
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
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((project) => {
            if (project.id !== stepDrag.projectId) return project
            const orderMap = new Map(
              nextOrder.map((id, index) => [id, index]),
            )
            return {
              ...project,
              steps: project.steps.map((step) =>
                orderMap.has(step.id)
                  ? { ...step, order: orderMap.get(step.id)! }
                  : step,
              ),
            }
          }),
        }))
        return
      }

      const projectDrag = projectDragRef.current
      if (projectDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(projectDrag, event.clientY, 72)
        if (!nextOrder) return
        setState((prev) => {
          const orderMap = new Map(nextOrder.map((id, index) => [id, index]))
          return {
            ...prev,
            projects: prev.projects.map((project) =>
              orderMap.has(project.id)
                ? { ...project, order: orderMap.get(project.id)! }
                : project,
            ),
          }
        })
        return
      }

      const goalDrag = goalDragRef.current
      if (goalDrag) {
        event.preventDefault()
        const nextOrder = reorderSnapshot(goalDrag, event.clientY, 88)
        if (!nextOrder) return
        setState((prev) => {
          const orderMap = new Map(nextOrder.map((id, index) => [id, index]))
          return {
            ...prev,
            goals: prev.goals.map((goal) =>
              orderMap.has(goal.id)
                ? { ...goal, order: orderMap.get(goal.id)! }
                : goal,
            ),
          }
        })
        return
      }

      const categoryDrag = categoryDragRef.current
      if (!categoryDrag) return
      event.preventDefault()
      const nextOrder = reorderSnapshot(categoryDrag, event.clientY, 64)
      if (!nextOrder) return
      setState((prev) => {
        const byId = new Map(prev.taskCategories.map((c) => [c.id, c]))
        const taskCategories = nextOrder
          .map((id) => byId.get(id))
          .filter((c): c is Category => Boolean(c))
        return { ...prev, taskCategories }
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
      if (categoryDragRef.current) {
        categoryDragRef.current = null
        setDraggingCategoryId(null)
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
        ) : (
          <span className="stat-chip-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="dollar-chip"
          aria-label={`${state.dollars} dollars — open rewards`}
          onClick={() => goToView('rewards')}
        >
          ${state.dollars}
        </button>
      </header>

      <div className="brand-block">
        <h1 className="brand">Kraft Life</h1>
      </div>

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
              <div className="day-label-row">
                <div className="day-picker">
                  <button
                    type="button"
                    className="day-label day-label-btn"
                    aria-label={`Pick a day, currently ${formatDayHeading(viewDate, todayKey)}`}
                    onClick={openDayPicker}
                  >
                    {formatDayHeading(viewDate, todayKey)}
                  </button>
                  <input
                    ref={dayPickerRef}
                    type="date"
                    className="day-picker-input"
                    value={viewKey}
                    onChange={(e) => jumpToDay(e.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <div className="mode-btns">
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
                    <PlaneIcon />
                  </button>
                  <button
                    type="button"
                    className={`plane-btn${workModeOn ? ' active' : ''}`}
                    aria-label={
                      workModeOn ? 'Turn off work mode' : 'Turn on work mode'
                    }
                    aria-pressed={workModeOn}
                    onClick={toggleWorkMode}
                  >
                    <BriefcaseIcon />
                  </button>
                  <button
                    type="button"
                    className={`plane-btn${homeModeOn ? ' active' : ''}`}
                    aria-label={
                      homeModeOn ? 'Turn off home mode' : 'Turn on home mode'
                    }
                    aria-pressed={homeModeOn}
                    onClick={toggleHomeMode}
                  >
                    <HomeIcon />
                  </button>
                  <button
                    type="button"
                    className={`plane-btn${outModeOn ? ' active' : ''}`}
                    aria-label={
                      outModeOn ? 'Turn off out mode' : 'Turn on out mode'
                    }
                    aria-pressed={outModeOn}
                    onClick={toggleOutMode}
                  >
                    <CarIcon />
                  </button>
                </div>
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
            <div className="day-divider" aria-hidden="true" />
          </div>

          {vacationOn ? <p className="vacation-banner">Vacation mode</p> : null}
          {workModeOn ? <p className="work-banner">Work mode</p> : null}
          {homeModeOn ? <p className="work-banner">Home mode</p> : null}
          {outModeOn ? <p className="work-banner">Out mode</p> : null}

          {hasDayContent ? (
            <div className="task-groups">
              {groupedDayView.map((group, groupIndex) => {
                const collapsed = collapsedTaskCategoryIds.includes(group.id)
                const attention = group.attention === true
                return (
                  <section
                    className={`task-group${collapsed ? ' collapsed' : ''}${
                      attention ? ' attention' : ''
                    }`}
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
                        }`}
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
                            ? false
                            : isCompletedForDateView(task, viewKey)
                          const showAllTimeCount =
                            !calendarTask && task.repetition !== 'none'
                          const allTimeCount = showAllTimeCount
                            ? allTimeCompletionCount(task)
                            : 0
                          return (
                            <li
                              key={task.id}
                              className={`task-item compact${
                                done ? ' completed' : ''
                              }${calendarTask ? ' calendar-task' : ''}${
                                draggingId === task.id ? ' dragging' : ''
                              }${vacationOn ? ' vacation' : ''}`}
                            >
                              {calendarTask ? (
                                <span className="calendar-task-marker" aria-hidden="true">
                                  <CalendarIcon />
                                </span>
                              ) : (
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
                              )}
                              {calendarTask ? (
                                <div className="task-main-btn calendar-task-main">
                                  <p className="task-title">{task.title}</p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="task-main-btn"
                                  aria-label={`Notes for ${task.title}`}
                                  onClick={() => openTaskNotes(task)}
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
                                      setSwipeOffset(0)
                                      event.currentTarget.setPointerCapture?.(
                                        event.pointerId,
                                      )
                                      beginDrag(task.id, event.clientY, group.id)
                                    }}
                                  >
                                    <BarsIcon />
                                  </button>
                                </div>
                              )}
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
              {activeGoal ? (
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
                {activeGoal ? activeGoal.name : 'Goals'}
              </p>
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {!activeGoal ? (
            sortedGoals.length === 0 ? (
              <div className="panel empty">
                <h2>No goals yet</h2>
                <p>Tap the plus to add a goal, then link tasks and projects.</p>
              </div>
            ) : (
              <div className="task-groups">
                <section className="task-group" aria-label="Your goals">
                  <h2 className="category-heading">Your goals</h2>
                  <p className="muted reorder-hint view-hint">
                    Drag the bars to reorder. Highlights today when you complete
                    a linked task or project step.
                  </p>
                  <ul className="task-list">
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
          ) : (
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
          )}
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
                onDelete={deleteCategory}
                onAdd={addCategory}
                onBeginDrag={beginCategoryDrag}
              />
            </SettingsSection>

            <CloudSyncSettings state={state} onCloudStateLoaded={setState} />

            <CalendarSettings
              onConnectionChange={() =>
                setCalendarConnectionVersion((version) => version + 1)
              }
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
              <span className="day-nav-spacer" aria-hidden="true" />
            </div>
            <div className="day-divider" aria-hidden="true" />
          </div>

          {activeTimer ? (
            <div className="panel timer-panel">
              <p className="timer-display" aria-live="polite">
                {formatTimerSeconds(timerElapsed[activeTimer.id] ?? 0)}
              </p>
              <p className="timer-seconds-label">
                {timerElapsed[activeTimer.id] ?? 0} second
                {(timerElapsed[activeTimer.id] ?? 0) === 1 ? '' : 's'}
              </p>
              <p className="muted timer-hint">
                Earn $1 every {activeTimer.minutesForDollar} minute
                {activeTimer.minutesForDollar === 1 ? '' : 's'}. Pause keeps
                your place.
              </p>
              <p className="timer-next">
                Next $ in{' '}
                {formatTimerSeconds(
                  Math.max(
                    0,
                    activeTimer.minutesForDollar * 60 -
                      (timerElapsed[activeTimer.id] ?? 0),
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
                  Drag to reorder. Tap a timer to run it. Edit title or minutes
                  anytime.
                </p>
                <ul className="task-list">
                  {sortedTimers.map((timer) => {
                    const elapsed = timerElapsed[timer.id] ?? 0
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
            {mainView !== 'settings' ? (
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
                      : mainView === 'timer'
                        ? editingTimerId
                          ? 'Edit timer'
                          : 'New timer'
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
            <span className="nav-gap" aria-hidden="true" />
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

            <fieldset className="category-multi mode-visibility-compact">
              <legend>Show in</legend>
              <div className="mode-visibility-options">
                <label
                  className={`mode-chip${visibleInWorkMode ? ' selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleInWorkMode}
                    onChange={(e) => setVisibleInWorkMode(e.target.checked)}
                  />
                  <BriefcaseIcon />
                  <span>Work</span>
                </label>
                <label
                  className={`mode-chip${visibleInHomeMode ? ' selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleInHomeMode}
                    onChange={(e) => setVisibleInHomeMode(e.target.checked)}
                  />
                  <HomeIcon />
                  <span>Home</span>
                </label>
                <label
                  className={`mode-chip${visibleInOutMode ? ' selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleInOutMode}
                    onChange={(e) => setVisibleInOutMode(e.target.checked)}
                  />
                  <CarIcon />
                  <span>Out</span>
                </label>
              </div>
            </fieldset>

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

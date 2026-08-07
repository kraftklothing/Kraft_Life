import {
  DEFAULT_REWARDS,
  DEFAULT_TASK_CATEGORIES,
  DEFAULT_TIMERS,
  type AppState,
  type Category,
  type DollarLedgerEntry,
  type FocusTimer,
  type Goal,
  type PendingDelivery,
  type Project,
  type ProjectStep,
  type Reward,
  type Task,
} from './types'
import {
  clearLegacyLocalCalendars,
  normalizeConnectedCalendars,
  readLegacyLocalCalendars,
} from './calendarSession'

const STORAGE_KEY = 'kraft-life-v1'
const MAX_LEDGER_ENTRIES = 400

function normalizeCategories(raw: unknown): Category[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const cats: Category[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const c = item as { id?: unknown; name?: unknown; attention?: unknown }
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue
    const cat: Category = { id: c.id, name: c.name }
    if (c.attention === true) cat.attention = true
    cats.push(cat)
  }
  return cats.length > 0 ? cats : null
}

function normalizeRewards(raw: unknown): Reward[] | null {
  if (!Array.isArray(raw)) return null
  const rewards: Reward[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as { id?: unknown; name?: unknown; cost?: unknown }
    if (typeof r.id !== 'string' || typeof r.name !== 'string') continue
    const cost = typeof r.cost === 'number' ? r.cost : Number(r.cost)
    if (!Number.isFinite(cost) || cost < 1) continue
    rewards.push({ id: r.id, name: r.name, cost })
  }
  return rewards
}

function normalizeSteps(raw: unknown): ProjectStep[] {
  if (!Array.isArray(raw)) return []
  const steps: ProjectStep[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const s = item as {
      id?: unknown
      title?: unknown
      dollars?: unknown
      completed?: unknown
      completedOn?: unknown
      order?: unknown
    }
    if (typeof s.id !== 'string' || typeof s.title !== 'string') return
    const dollars = typeof s.dollars === 'number' ? s.dollars : Number(s.dollars)
    if (!Number.isFinite(dollars) || dollars < 0) return
    const completed = Boolean(s.completed)
    steps.push({
      id: s.id,
      title: s.title,
      dollars: Math.floor(dollars),
      completed,
      completedOn:
        completed && typeof s.completedOn === 'string' ? s.completedOn : null,
      order: typeof s.order === 'number' ? s.order : index,
    })
  })
  return steps.sort((a, b) => a.order - b.order)
}

function normalizeEntityCategoryIds(raw: {
  categoryIds?: unknown
  categoryId?: unknown
}): string[] {
  if (Array.isArray(raw.categoryIds)) {
    const ids = raw.categoryIds.filter((id): id is string => typeof id === 'string')
    if (ids.length > 0) return [...new Set(ids)]
  }
  if (typeof raw.categoryId === 'string' && raw.categoryId) {
    return [raw.categoryId]
  }
  return []
}

function normalizeProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return []
  const projects: Project[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const p = item as {
      id?: unknown
      name?: unknown
      order?: unknown
      steps?: unknown
      createdAt?: unknown
    }
    if (typeof p.id !== 'string' || typeof p.name !== 'string') return
    projects.push({
      id: p.id,
      name: p.name,
      order: typeof p.order === 'number' ? p.order : index,
      steps: normalizeSteps(p.steps),
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    })
  })
  return projects.sort((a, b) => a.order - b.order)
}

function normalizeStringIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string')
}

function normalizeCustomRepeat(raw: unknown): Task['customRepeat'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as { everyDays?: unknown; weekdays?: unknown }
  const result: NonNullable<Task['customRepeat']> = {}
  if (typeof c.everyDays === 'number' && Number.isFinite(c.everyDays)) {
    result.everyDays = Math.max(1, Math.floor(c.everyDays))
  } else if (c.everyDays != null) {
    const n = Number(c.everyDays)
    if (Number.isFinite(n) && n >= 1) result.everyDays = Math.floor(n)
  }
  if (Array.isArray(c.weekdays)) {
    const days = [
      ...new Set(
        c.weekdays
          .map((d) => (typeof d === 'number' ? d : Number(d)))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      ),
    ].sort((a, b) => a - b)
    if (days.length > 0) result.weekdays = days
  }
  return result.everyDays !== undefined || result.weekdays !== undefined
    ? result
    : undefined
}

function normalizeTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return []
  const tasks: Task[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Partial<Task> & { categoryId?: unknown }
    if (typeof t.id !== 'string' || typeof t.title !== 'string') continue
    if (typeof t.startDate !== 'string') continue
    if (typeof t.repetition !== 'string') continue
    tasks.push({
      id: t.id,
      title: t.title,
      description: typeof t.description === 'string' ? t.description : '',
      categoryIds: normalizeEntityCategoryIds(t),
      repetition: t.repetition as Task['repetition'],
      customRepeat: normalizeCustomRepeat(t.customRepeat),
      startDate: t.startDate,
      completions:
        t.completions && typeof t.completions === 'object' ? t.completions : {},
      visibleInWorkMode: t.visibleInWorkMode !== false,
      visibleInHomeMode: t.visibleInHomeMode !== false,
      visibleInOutMode: t.visibleInOutMode !== false,
      order: typeof t.order === 'number' ? t.order : 0,
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    })
  }
  return tasks
}

function normalizeGoals(raw: unknown): Goal[] {
  if (!Array.isArray(raw)) return []
  const goals: Goal[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const g = item as {
      id?: unknown
      name?: unknown
      description?: unknown
      order?: unknown
      taskIds?: unknown
      projectIds?: unknown
      createdAt?: unknown
    }
    if (typeof g.id !== 'string' || typeof g.name !== 'string') return
    goals.push({
      id: g.id,
      name: g.name,
      description: typeof g.description === 'string' ? g.description : '',
      order: typeof g.order === 'number' ? g.order : index,
      taskIds: normalizeStringIds(g.taskIds),
      projectIds: normalizeStringIds(g.projectIds),
      createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
    })
  })
  return goals.sort((a, b) => a.order - b.order)
}

function normalizeTimers(raw: unknown): FocusTimer[] | null {
  if (!Array.isArray(raw)) return null
  const timers: FocusTimer[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const t = item as {
      id?: unknown
      title?: unknown
      minutesForDollar?: unknown
      order?: unknown
      elapsedSeconds?: unknown
    }
    if (typeof t.id !== 'string' || typeof t.title !== 'string') return
    const minutes =
      typeof t.minutesForDollar === 'number'
        ? t.minutesForDollar
        : Number(t.minutesForDollar)
    if (!Number.isFinite(minutes) || minutes < 1) return
    const elapsedRaw =
      typeof t.elapsedSeconds === 'number'
        ? t.elapsedSeconds
        : Number(t.elapsedSeconds)
    const elapsedSeconds =
      Number.isFinite(elapsedRaw) && elapsedRaw > 0
        ? Math.floor(elapsedRaw)
        : 0
    timers.push({
      id: t.id,
      title: t.title,
      minutesForDollar: Math.floor(minutes),
      order: typeof t.order === 'number' ? t.order : index,
      elapsedSeconds,
    })
  })
  return timers.sort((a, b) => a.order - b.order)
}

function normalizePendingDeliveries(raw: unknown): PendingDelivery[] {
  if (!Array.isArray(raw)) return []
  const deliveries: PendingDelivery[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const d = item as {
      id?: unknown
      rewardId?: unknown
      rewardName?: unknown
      cost?: unknown
      createdAt?: unknown
    }
    if (typeof d.id !== 'string' || typeof d.rewardName !== 'string') continue
    const cost = typeof d.cost === 'number' ? d.cost : Number(d.cost)
    if (!Number.isFinite(cost) || cost < 1) continue
    deliveries.push({
      id: d.id,
      rewardId: typeof d.rewardId === 'string' ? d.rewardId : '',
      rewardName: d.rewardName,
      cost: Math.floor(cost),
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
    })
  }
  return deliveries
}

function normalizeDollarLedger(raw: unknown): DollarLedgerEntry[] {
  if (!Array.isArray(raw)) return []
  const entries: DollarLedgerEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const e = item as {
      id?: unknown
      at?: unknown
      dateKey?: unknown
      amount?: unknown
      kind?: unknown
      label?: unknown
    }
    if (typeof e.id !== 'string' || typeof e.dateKey !== 'string') continue
    if (typeof e.label !== 'string') continue
    const at = typeof e.at === 'number' ? e.at : Number(e.at)
    const amount = typeof e.amount === 'number' ? e.amount : Number(e.amount)
    if (!Number.isFinite(at) || !Number.isFinite(amount)) continue
    if (e.kind !== 'earned' && e.kind !== 'spent' && e.kind !== 'adjusted') {
      continue
    }
    entries.push({
      id: e.id,
      at,
      dateKey: e.dateKey,
      amount: Math.trunc(amount),
      kind: e.kind,
      label: e.label,
    })
  }
  return entries.slice(-MAX_LEDGER_ENTRIES)
}

export function appendLedgerEntry(
  ledger: DollarLedgerEntry[],
  entry: Omit<DollarLedgerEntry, 'id' | 'at'> & { id?: string; at?: number },
): DollarLedgerEntry[] {
  const next: DollarLedgerEntry = {
    id: entry.id ?? `ledger_${Math.random().toString(36).slice(2, 10)}`,
    at: entry.at ?? Date.now(),
    dateKey: entry.dateKey,
    amount: entry.amount,
    kind: entry.kind,
    label: entry.label,
  }
  return [...ledger, next].slice(-MAX_LEDGER_ENTRIES)
}

export function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  const fallback: AppState = {
    tasks: [],
    taskCategories: DEFAULT_TASK_CATEGORIES,
    dollars: 0,
    rewards: DEFAULT_REWARDS,
    projects: [],
    goals: [],
    timers: DEFAULT_TIMERS,
    pendingDeliveries: [],
    vacationDays: {},
    workMode: false,
    homeMode: false,
    outMode: false,
    showPercent: false,
    dollarLedger: [],
    connectedCalendars: [],
  }
  if (!raw || typeof raw !== 'object') return fallback

  const legacyCategories = normalizeCategories(
    (raw as Partial<AppState> & { categories?: unknown }).categories,
  )
  const taskCategories =
    normalizeCategories(raw.taskCategories) ??
    legacyCategories ??
    DEFAULT_TASK_CATEGORIES
  const rewards = normalizeRewards(raw.rewards)
  const timers = normalizeTimers(raw.timers)
  let connectedCalendars = normalizeConnectedCalendars(raw.connectedCalendars)
  if (connectedCalendars.length === 0) {
    const legacyCalendars = readLegacyLocalCalendars()
    if (legacyCalendars.length > 0) {
      connectedCalendars = legacyCalendars
      clearLegacyLocalCalendars()
    }
  }
  return {
    tasks: normalizeTasks(raw.tasks),
    taskCategories,
    dollars: typeof raw.dollars === 'number' ? raw.dollars : 0,
    rewards: rewards !== null ? rewards : DEFAULT_REWARDS,
    projects: normalizeProjects(raw.projects),
    goals: normalizeGoals(raw.goals),
    timers: timers !== null ? timers : DEFAULT_TIMERS,
    pendingDeliveries: normalizePendingDeliveries(raw.pendingDeliveries),
    vacationDays:
      raw.vacationDays && typeof raw.vacationDays === 'object'
        ? raw.vacationDays
        : {},
    workMode: Boolean(raw.workMode),
    homeMode: Boolean(raw.homeMode),
    outMode: Boolean(raw.outMode),
    showPercent: Boolean(raw.showPercent),
    dollarLedger: normalizeDollarLedger(raw.dollarLedger),
    connectedCalendars,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeState(null)
    const parsed = JSON.parse(raw) as Partial<AppState>
    return normalizeState(parsed)
  } catch {
    return normalizeState(null)
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

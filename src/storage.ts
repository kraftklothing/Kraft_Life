import {
  DEFAULT_CATEGORIES,
  DEFAULT_REWARDS,
  DEFAULT_TIMERS,
  type AppState,
  type Category,
  type DollarLedgerEntry,
  type FocusTimer,
  type Goal,
  type Project,
  type ProjectStep,
  type Reward,
} from './types'

const STORAGE_KEY = 'kraft-life-v1'
const MAX_LEDGER_ENTRIES = 400

function normalizeCategories(raw: unknown): Category[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const cats: Category[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const c = item as { id?: unknown; name?: unknown }
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue
    cats.push({ id: c.id, name: c.name })
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

function normalizeGoals(raw: unknown): Goal[] {
  if (!Array.isArray(raw)) return []
  const goals: Goal[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const g = item as {
      id?: unknown
      name?: unknown
      order?: unknown
      taskIds?: unknown
      projectIds?: unknown
      createdAt?: unknown
    }
    if (typeof g.id !== 'string' || typeof g.name !== 'string') return
    goals.push({
      id: g.id,
      name: g.name,
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
    }
    if (typeof t.id !== 'string' || typeof t.title !== 'string') return
    const minutes =
      typeof t.minutesForDollar === 'number'
        ? t.minutesForDollar
        : Number(t.minutesForDollar)
    if (!Number.isFinite(minutes) || minutes < 1) return
    timers.push({
      id: t.id,
      title: t.title,
      minutesForDollar: Math.floor(minutes),
      order: typeof t.order === 'number' ? t.order : index,
    })
  })
  return timers.sort((a, b) => a.order - b.order)
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
    categories: DEFAULT_CATEGORIES,
    dollars: 0,
    rewards: DEFAULT_REWARDS,
    projects: [],
    goals: [],
    timers: DEFAULT_TIMERS,
    vacationDays: {},
    showPercent: false,
    dollarLedger: [],
  }
  if (!raw || typeof raw !== 'object') return fallback

  const categories = normalizeCategories(raw.categories) ?? DEFAULT_CATEGORIES
  const rewards = normalizeRewards(raw.rewards)
  const timers = normalizeTimers(raw.timers)
  return {
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    categories,
    dollars: typeof raw.dollars === 'number' ? raw.dollars : 0,
    rewards: rewards !== null ? rewards : DEFAULT_REWARDS,
    projects: normalizeProjects(raw.projects),
    goals: normalizeGoals(raw.goals),
    timers: timers !== null ? timers : DEFAULT_TIMERS,
    vacationDays:
      raw.vacationDays && typeof raw.vacationDays === 'object'
        ? raw.vacationDays
        : {},
    showPercent: Boolean(raw.showPercent),
    dollarLedger: normalizeDollarLedger(raw.dollarLedger),
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

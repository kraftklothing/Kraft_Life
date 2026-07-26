import {
  DEFAULT_CATEGORIES,
  DEFAULT_REWARDS,
  type AppState,
  type Category,
  type Goal,
  type Project,
  type ProjectStep,
  type Reward,
} from './types'

const STORAGE_KEY = 'kraft-life-v1'

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

export function loadState(): AppState {
  const fallback: AppState = {
    tasks: [],
    categories: DEFAULT_CATEGORIES,
    dollars: 0,
    rewards: DEFAULT_REWARDS,
    projects: [],
    goals: [],
    vacationDays: {},
    showPercent: false,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppState>
    const categories = normalizeCategories(parsed.categories) ?? DEFAULT_CATEGORIES
    const rewards = normalizeRewards(parsed.rewards)
    return {
      tasks: parsed.tasks ?? [],
      categories,
      dollars: typeof parsed.dollars === 'number' ? parsed.dollars : 0,
      rewards: rewards !== null ? rewards : DEFAULT_REWARDS,
      projects: normalizeProjects(parsed.projects),
      goals: normalizeGoals(parsed.goals),
      vacationDays:
        parsed.vacationDays && typeof parsed.vacationDays === 'object'
          ? parsed.vacationDays
          : {},
      showPercent: Boolean(parsed.showPercent),
    }
  } catch {
    return fallback
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

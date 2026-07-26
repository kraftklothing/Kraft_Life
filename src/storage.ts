import { DEFAULT_CATEGORIES, DEFAULT_REWARDS, type AppState, type Category, type Reward } from './types'

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

export function loadState(): AppState {
  const fallback: AppState = {
    tasks: [],
    categories: DEFAULT_CATEGORIES,
    dollars: 0,
    rewards: DEFAULT_REWARDS,
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
      // Preserve an empty rewards list if the user cleared them all.
      rewards: rewards !== null ? rewards : DEFAULT_REWARDS,
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

import { DEFAULT_CATEGORIES, DEFAULT_REWARDS, type AppState, type Reward } from './types'

const STORAGE_KEY = 'kraft-life-v1'

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
    const parsed = JSON.parse(raw) as Partial<AppState> & {
      profile?: unknown
    }
    const builtinIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id))
    const custom = (parsed.categories ?? []).filter((c) => !builtinIds.has(c.id))
    const rewards = Array.isArray(parsed.rewards)
      ? (parsed.rewards as Reward[]).filter(
          (r) => r && typeof r.id === 'string' && typeof r.name === 'string',
        )
      : DEFAULT_REWARDS

    return {
      tasks: parsed.tasks ?? [],
      categories: [...DEFAULT_CATEGORIES, ...custom],
      dollars: typeof parsed.dollars === 'number' ? parsed.dollars : 0,
      rewards: rewards.length > 0 ? rewards : DEFAULT_REWARDS,
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

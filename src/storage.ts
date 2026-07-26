import { DEFAULT_CATEGORIES, type AppState } from './types'

const STORAGE_KEY = 'kraft-life-v1'

export function loadState(): AppState {
  const fallback: AppState = {
    tasks: [],
    categories: DEFAULT_CATEGORIES,
    dollars: 0,
    profile: { displayName: '', email: '' },
    showPercent: false,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppState>
    const builtinIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id))
    const custom = (parsed.categories ?? []).filter((c) => !builtinIds.has(c.id))
    return {
      tasks: parsed.tasks ?? [],
      categories: [...DEFAULT_CATEGORIES, ...custom],
      dollars: typeof parsed.dollars === 'number' ? parsed.dollars : 0,
      profile: {
        displayName: parsed.profile?.displayName ?? '',
        email: parsed.profile?.email ?? '',
      },
      showPercent: Boolean(parsed.showPercent),
    }
  } catch {
    return fallback
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Server-side mirror of AppState — kept server-side so routes do not import from src/. */
export interface VaultAppState {
  tasks: unknown[]
  categories: unknown[]
  dollars: number
  rewards: unknown[]
  projects: unknown[]
  goals: unknown[]
  vacationDays: Record<string, boolean>
  showPercent: boolean
}

export interface VaultMeta {
  pinHash: string
  createdAt: number
}

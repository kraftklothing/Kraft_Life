/** Server-side mirror of AppState — kept server-side so routes do not import from src/. */
export interface VaultAppState {
  tasks: unknown[]
  categories?: unknown[]
  taskCategories?: unknown[]
  projectCategories?: unknown[]
  goalCategories?: unknown[]
  dollars: number
  rewards: unknown[]
  projects: unknown[]
  goals: unknown[]
  timers?: unknown[]
  pendingDeliveries?: unknown[]
  vacationDays: Record<string, boolean>
  showPercent: boolean
  dollarLedger?: unknown[]
}

export interface VaultMeta {
  pinHash: string
  createdAt: number
}

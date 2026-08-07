/** Server-side mirror of AppState — kept server-side so routes do not import from src/. */
export interface VaultAppState {
  tasks: unknown[]
  categories?: unknown[]
  taskCategories?: unknown[]
  dollars: number
  rewards: unknown[]
  projects: unknown[]
  goals: unknown[]
  timers?: unknown[]
  pendingDeliveries?: unknown[]
  /** Customizable filter modes (preferred). */
  modes?: unknown[]
  activeModeIds?: string[]
  /** Built-in vacation day flags. */
  vacationDays?: Record<string, boolean>
  /** Legacy fields — still accepted when loading older vaults. */
  modeDays?: Record<string, Record<string, boolean>>
  workMode?: boolean
  homeMode?: boolean
  outMode?: boolean
  showPercent: boolean
  dollarLedger?: unknown[]
}

export interface VaultMeta {
  pinHash: string
  createdAt: number
}
